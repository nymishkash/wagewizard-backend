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
      description: "Fetch all employees for a given company.",
      parameters: {
        type: "object",
        properties: {
          companyId: { type: "string" },
        },
        required: ["companyId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getEmployeeDetails",
      description: "Fetch details of a specific employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateEmployee",
      description: "Update details of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          updates: { type: "object" },
        },
        required: ["employeeId", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLeaveRecords",
      description: "Fetch all leave records of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "markLeave",
      description: "Mark a specific date as leave for an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          date: { type: "string", format: "date" },
          type: { type: "string" },
        },
        required: ["employeeId", "date", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "removeLeave",
      description: "Remove a leave record for an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          date: { type: "string", format: "date" },
        },
        required: ["employeeId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getEmployeeAttendance",
      description: "Fetch attendance records of an employee within a date range.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
        },
        required: ["employeeId", "startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateDesignation",
      description: "Update the designation of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          newDesignation: { type: "string" },
        },
        required: ["employeeId", "newDesignation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjustSalary",
      description: "Adjust the salary components of an employee.",
      parameters: {
        type: "object",
        properties: {
          employeeId: { type: "string" },
          newBasePay: { type: "number" },
          newOtherPay: { type: "number" },
        },
        required: ["employeeId", "newBasePay", "newOtherPay"],
      },
    },
  },
];

class OpenAIService {
  constructor(companyId, userId, conversationId = null) {
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
}

module.exports = OpenAIService;
