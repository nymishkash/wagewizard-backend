const { User, Company, Message, Conversation } = require("../models");
const OpenAI = require("openai");
const { v4: uuidv4 } = require("uuid");
const eventService = require("../config/redis");
const { default: tools } = require("./tools");


class OpenAIService {
  constructor(companyId, userId, conversationId = null) {
    this.companyId = companyId;
    this.userId = userId;
    this.conversationId = conversationId;
    this.companyDetails = null;
    this.userDetails = null;
    this.toolCalls = [];
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
  }

  async init() {
    try {
      this.companyDetails = await Company.findByPk(this.companyId);
      this.userDetails = await User.findByPk(this.userId);

      if (!this.conversationId) {
        const newConversation = await Conversation.create({
          companyId: this.companyId,
          meta: {},
        });
        this.conversationId = newConversation.id;
      }
    } catch (error) {
      console.error("Error initializing OpenAIService:", error);
    }
  }

  async handleIncomingMessage(payload) {
    const { conversationId, message } = payload;

    if (!conversationId || !message) {
      console.error("Invalid payload:", payload);
      return;
    }

    try {
      // Fetch conversation history from the database
      const previousMessages = await Message.findAll({
        where: { conversationId },
        order: [["createdAt", "ASC"]],
      });

      const messages = previousMessages.map((msg) => ({
        role: msg.chatUser,
        content: msg.chatText,
      }));

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
      });

      const responseMessage = completion.choices[0].message;

      // Handle tool calls if needed
      if (responseMessage.tool_calls) {
        this.toolCalls = responseMessage.tool_calls;
        for (const toolCall of this.toolCalls) {
          const toolResponse = await this.executeToolFunction(toolCall);
          // Create a message for the tool response
          await Message.create({
            conversationId,
            chatText: JSON.stringify({ [toolCall.function.name]: toolResponse }),
            chatUser: "tool",
          });
        }

        // Fetch updated conversation history including tool responses
        const updatedMessages = await Message.findAll({
          where: { conversationId },
          order: [["createdAt", "ASC"]],
        });

        const newHistory = updatedMessages.map((msg) => ({
          role: msg.chatUser,
          content: msg.chatText,
        }));

        // Generate final answer using the new history
        const finalCompletion = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: newHistory,
          tools,
        });

        const finalResponseMessage = finalCompletion.choices[0].message.content;

        // Create message for final answer, emit to stream, add to db
        await Message.create({
          conversationId: this.conversationId,
          chatText: finalResponseMessage,
          chatUser: "bot",
          meta: JSON.stringify({ toolCalls: this.toolCalls }),
        });
        await eventService.publish("response_v1", {
          conversationId,
          response: finalResponseMessage,
        });
      } else {
        // If no tool calls, send AI response directly
        await Message.create({
          conversationId: this.conversationId,
          chatText: responseMessage.content,
          chatUser: "bot",
          meta: JSON.stringify({ toolCalls: this.toolCalls }),
        });

        await eventService.publish("response_v1", {
          conversationId,
          response: responseMessage.content,
        });
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
      await eventService.publish("response_v1", {
        conversationId,
        response: "An error occurred while processing your request.",
      });
    }
  }

  async executeToolFunction(toolCall) {
    const { name, arguments: args } = toolCall.function;
    const parsedArgs = JSON.parse(args);

    if (name === "fetch_salary") {
      return this.fetchSalary(parsedArgs.employeeId);
    }

    console.error("Unknown tool function:", name);
    return null;
  }

  async fetchSalary(employeeId) {
    try {
      const employee = await User.findByPk(employeeId);
      if (!employee) return "Employee not found.";
      return `Salary details: ${employee.salary}`;
    } catch (error) {
      console.error("Error fetching salary:", error);
      return "Error fetching salary details.";
    }
  }

  async storeMessage(finalAnswer) {
    try {
      await Message.create({
        conversationId: this.conversationId,
        chatText: finalAnswer,
        chatUser: "bot",
        meta: JSON.stringify({ toolCalls: this.toolCalls }),
      });
    } catch (error) {
      console.error("Error storing message:", error);
    }
  }
}

module.exports = OpenAIService;
