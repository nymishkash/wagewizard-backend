const { User, Company, Message, Conversation } = require("../models");
const OpenAI = require("openai");
const { v4: uuidv4 } = require("uuid");
const eventService = require("../config/redis");
const adminPrompt = require("./adminPrompt");
const { functionCalls } = require("./functions");
const { Op } = require("sequelize");

const tools = [
  {
    type: "function",
    function: {
      name: "getAllEmployees",
      description:
        "Fetch all employees for a given company. Returns a list of employee records with their basic information.",
      parameters: {
        type: "object",
        properties: {
          companyId: {
            type: "string",
            description:
              "The unique identifier of the company whose employees should be retrieved. This is typically a UUID.",
          },
        },
        required: ["companyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getEmployeeDetails",
      description:
        "Fetch comprehensive details of a specific employee including personal information, job details, salary information, and employment history.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description:
              "The unique identifier of the employee whose details should be retrieved. This is typically a UUID.",
          },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateEmployee",
      description:
        "Update specific details of an employee record. This can include personal information, job details, or other employee attributes.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description:
              "The unique identifier of the employee whose information should be updated. This is typically a UUID.",
          },
          updates: {
            type: "object",
            description:
              "An object containing the fields to update and their new values. Can include name, email, phone, designation, department, etc.",
          },
        },
        required: ["employeeId", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLeaveRecords",
      description:
        "Fetch all leave records of an employee, including approved, pending, and rejected leave requests with their respective dates and types.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description:
              "The unique identifier of the employee whose leave records should be retrieved. This is typically a UUID.",
          },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "markLeave",
      description:
        "Mark a specific date as leave for an employee. This creates a new leave record with the specified date and type.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description:
              "The unique identifier of the employee for whom the leave should be marked. This is typically a UUID.",
          },
          date: {
            type: "string",
            format: "date",
            description: "The date for which leave should be marked in YYYY-MM-DD format.",
          },
          type: {
            type: "string",
            description:
              "The type of leave being requested, such as 'sick', 'vacation', 'personal', 'maternity', etc.",
          },
        },
        required: ["employeeId", "date", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "removeLeave",
      description:
        "Remove a previously marked leave record for an employee on a specific date. This completely deletes the leave entry.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description:
              "The unique identifier of the employee whose leave record should be removed. This is typically a UUID.",
          },
          date: {
            type: "string",
            format: "date",
            description: "The date of the leave record to be removed in YYYY-MM-DD format.",
          },
        },
        required: ["employeeId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getEmployeeAttendance",
      description:
        "Fetch attendance records of an employee within a specified date range, showing present days, absences, and leave days.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description:
              "The unique identifier of the employee whose attendance records should be retrieved. This is typically a UUID.",
          },
          startDate: {
            type: "string",
            format: "date",
            description:
              "The start date of the period for which attendance records should be retrieved in YYYY-MM-DD format.",
          },
          endDate: {
            type: "string",
            format: "date",
            description:
              "The end date of the period for which attendance records should be retrieved in YYYY-MM-DD format.",
          },
        },
        required: ["employeeId", "startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateDesignation",
      description:
        "Update the job designation or title of an employee. This is typically used for promotions or role changes.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description:
              "The unique identifier of the employee whose designation should be updated. This is typically a UUID.",
          },
          newDesignation: {
            type: "string",
            description:
              "The new job title or designation for the employee, such as 'Senior Developer', 'Team Lead', 'Manager', etc.",
          },
        },
        required: ["employeeId", "newDesignation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjustSalary",
      description:
        "Adjust the salary components of an employee, including base pay and other compensation elements. Used for raises, bonuses, or compensation adjustments.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "string",
            description:
              "The unique identifier of the employee whose salary should be adjusted. This is typically a UUID.",
          },
          newBasePay: {
            type: "number",
            description:
              "The new base salary amount for the employee, typically represented as an annual figure.",
          },
          newOtherPay: {
            type: "number",
            description:
              "The new amount for additional compensation components such as bonuses, allowances, or other benefits.",
          },
        },
        required: ["employeeId", "newBasePay", "newOtherPay"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchEmployeesByName",
      description:
        "Search for employees by name with fuzzy matching to handle typos, misspellings, and name variations. Returns matching employee records.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description:
              "The name or partial name to search for. The search is case-insensitive and uses fuzzy matching to find similar names.",
          },
        },
        required: ["searchTerm"],
      },
    },
  },
];

class OpenAIService {
  constructor(companyId, userId, conversationId) {
    this.companyId = companyId;
    this.userId = userId;
    this.conversationId = conversationId;
    this.companyDetails = null;
    this.userDetails = null;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
  }

  async handleIncomingMessage(payload) {
    this.companyDetails = await Company.findByPk(this.companyId);
    this.userDetails = await User.findByPk(this.userId);

    const companyContextData = {
      id: this.companyDetails.id,
      name: this.companyDetails.name,
    };

    const { conversationId, message } = payload;

    if (!conversationId || !message) {
      console.error("Invalid payload:", payload);
      return;
    }

    const userMessage = await Message.create({
      conversationId,
      chatUser: "user",
      chatText: message,
    });

    try {
      // Fetch conversation history
      const previousMessages = await Message.findAll({
        where: { conversationId },
        order: [["createdAt", "ASC"]],
      });

      // Build messages array for OpenAI
      const messages = [
        {
          role: "system",
          content: adminPrompt + `\n\n Company details: \n\n ${JSON.stringify(companyContextData)}`,
        },
        ...previousMessages.map((msg) => {
          const meta = JSON.parse(msg.meta || "{}");

          if (msg.chatUser === "assistant" && meta.toolCalls && meta.toolCalls.length > 0) {
            return {
              role: "assistant",
              content: msg.chatText,
              tool_calls: meta.toolCalls,
            };
          } else if (msg.chatUser === "tool") {
            const meta = JSON.parse(msg.meta || "{}");
            return {
              role: "tool",
              tool_call_id: meta.toolCallId,
              content: msg.chatText,
            };
          } else {
            return {
              role: msg.chatUser,
              content: msg.chatText,
            };
          }
        }),
        // { role: "user", content: message },
      ];

      console.log("Messages to OpenAI:", JSON.stringify(messages, null, 2));

      // Initial OpenAI call
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
      });

      let responseMessage = completion.choices[0].message;

      // Handle tool calls if present
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Store assistant message with tool calls
        await Message.create({
          conversationId,
          chatText: responseMessage.content,
          chatUser: "assistant",
          meta: JSON.stringify({ toolCalls: responseMessage.tool_calls }),
        });

        messages.push({
          role: "assistant",
          tool_calls: responseMessage.tool_calls,
          content: responseMessage.content,
        });

        // Process each tool call
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          // Execute tool function
          const toolResponse = await functionCalls(functionName, [args]);
          const stringifiedToolResponse = JSON.stringify({
            [functionName]: toolResponse,
          });

          // Store tool response
          await Message.create({
            conversationId,
            chatText: stringifiedToolResponse,
            chatUser: "tool",
            meta: JSON.stringify({ toolCallId: toolCall.id }),
          });

          // Add tool response to messages
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: stringifiedToolResponse,
          });

          console.log("Messages to OpenAI after toolcall:", JSON.stringify(messages, null, 2));
        }

        // Get final response after tool calls
        const secondCompletion = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages,
        });

        responseMessage = secondCompletion.choices[0].message;

        // Store final assistant response
        await Message.create({
          conversationId,
          chatText: responseMessage.content,
          chatUser: "assistant",
          meta: JSON.stringify({}),
        });
      } else {
        // Store simple assistant response (no tool calls)
        await Message.create({
          conversationId,
          chatText: responseMessage.content,
          chatUser: "assistant",
          meta: JSON.stringify({}),
        });
      }

      // Publish final response
      await eventService.publish("response_v1", {
        conversationId,
        response: responseMessage.content,
      });

      console.log("Successfully generated and published response");
    } catch (error) {
      console.error("Error generating AI response:", error);
      await eventService.publish("response_v1", {
        conversationId,
        response: "An error occurred while processing your request.",
      });
    }
  }

  async handleVoiceChat(payload) {
    this.companyDetails = await Company.findByPk(this.companyId);
    this.userDetails = await User.findByPk(this.userId);

    const companyContextData = {
      id: this.companyDetails.id,
      name: this.companyDetails.name,
    };

    const { conversationId, message } = payload;

    if (!conversationId || !message) {
      console.error("Invalid payload:", payload);
      return;
    }

    const userMessage = await Message.create({
      conversationId,
      chatUser: "user",
      chatText: message,
    });

    try {
      // Fetch conversation history
      const previousMessages = await Message.findAll({
        where: { conversationId },
        order: [["createdAt", "ASC"]],
      });

      // Build messages array for OpenAI
      const messages = [
        {
          role: "system",
          content: adminPrompt + `\n\n Company details: \n\n ${JSON.stringify(companyContextData)}`,
        },
        ...previousMessages.map((msg) => {
          const meta = JSON.parse(msg.meta || "{}");

          if (msg.chatUser === "assistant" && meta.toolCalls && meta.toolCalls.length > 0) {
            return {
              role: "assistant",
              content: msg.chatText,
              tool_calls: meta.toolCalls,
            };
          } else if (msg.chatUser === "tool") {
            const meta = JSON.parse(msg.meta || "{}");
            return {
              role: "tool",
              tool_call_id: meta.toolCallId,
              content: msg.chatText,
            };
          } else {
            return {
              role: msg.chatUser,
              content: msg.chatText,
            };
          }
        }),
        // { role: "user", content: message },
      ];

      console.log("Messages to OpenAI:", JSON.stringify(messages, null, 2));

      // Initial OpenAI call
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
      });

      let responseMessage = completion.choices[0].message;

      // Handle tool calls if present
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Store assistant message with tool calls
        await Message.create({
          conversationId,
          chatText: responseMessage.content,
          chatUser: "assistant",
          meta: JSON.stringify({ toolCalls: responseMessage.tool_calls }),
        });

        messages.push({
          role: "assistant",
          tool_calls: responseMessage.tool_calls,
          content: responseMessage.content,
        });

        // Process each tool call
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          // Execute tool function
          const toolResponse = await functionCalls(functionName, [args]);
          const stringifiedToolResponse = JSON.stringify({
            [functionName]: toolResponse,
          });

          // Store tool response
          await Message.create({
            conversationId,
            chatText: stringifiedToolResponse,
            chatUser: "tool",
            meta: JSON.stringify({ toolCallId: toolCall.id }),
          });

          // Add tool response to messages
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: stringifiedToolResponse,
          });

          console.log("Messages to OpenAI after toolcall:", JSON.stringify(messages, null, 2));
        }

        // Get final response after tool calls
        const secondCompletion = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages,
        });

        responseMessage = secondCompletion.choices[0].message;

        // Store final assistant response
        await Message.create({
          conversationId,
          chatText: responseMessage.content,
          chatUser: "assistant",
          meta: JSON.stringify({}),
        });
      } else {
        // Store simple assistant response (no tool calls)
        await Message.create({
          conversationId,
          chatText: responseMessage.content,
          chatUser: "assistant",
          meta: JSON.stringify({}),
        });
      }

      return { response: responseMessage.content };

    } catch (error) {
      console.error("Error generating AI response:", error);
      await eventService.publish("response_v1", {
        conversationId,
        response: "An error occurred while processing your request.",
      });
    }
  }
}

module.exports = OpenAIService;
