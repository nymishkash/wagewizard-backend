const { User, Company, Message } = require("../models");
const OpenAI = require("openai");
const { default: tools } = require("./tools");

class OpenAIService {
  constructor(companyId, userId) {
    this.companyId = companyId;
    this.userId = userId;
    this.companyDetails = null;
    this.userDetails = null;
    this.toolCalls = [];
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
  }

  async init() {
    try {
      this.companyDetails = await Company.findByPk(this.companyId);
      this.userDetails = await User.findByPk(this.userId);
    } catch (error) {
      console.error("Error fetching company or user details:", error);
    }
  }

  async reply(question) {
    let response = await this.generateAnswer(question);

    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const toolResponse = await this.performToolCall(toolCall);
        this.toolCalls.push({ toolCallId: toolCall.id, response: toolResponse });
      }

      response = await this.generateAnswer(question, this.toolCalls);
    }

    await this.storeToolCalls(response.answer); // Pass the final answer to store

    return response.answer;
  }

  async generateAnswer(question, toolCallResponses = []) {
    try {
      const messages = [
        {
          role: "system",
          content: `Company: ${this.companyDetails.name}, User: ${this.userDetails.name}`,
        },
        { role: "user", content: question },
      ];

      if (toolCallResponses.length > 0) {
        for (const toolCall of toolCallResponses) {
          messages.push({
            role: "assistant",
            content: `Tool Response (${toolCall.toolCallId}): ${toolCall.response}`,
          });
        }
      }

      const tools = tools;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
      });

      const answer = completion.choices[0].message.content;
      const toolCalls = completion.choices[0].message.tool_calls || [];

      return { answer, toolCalls };
    } catch (error) {
      console.error("Error generating answer:", error);
      return { answer: "An error occurred while generating the answer.", toolCalls: [] };
    }
  }

  async performToolCall(toolCall) {
    switch (toolCall.function.name) {
      case "fetch_salary":
        return `Salary data for employee ${toolCall.parameters.employeeId}: $5000/month`;
      case "fetch_leave_balance":
        return `Leave balance for employee ${toolCall.parameters.employeeId}: 10 days remaining`;
      case "fetch_employee_list":
        return toolCall.parameters.department
          ? `Employees in ${toolCall.parameters.department}: John, Sarah, Mike`
          : "Employee List: John, Sarah, Mike";
      default:
        return "Unknown tool call";
    }
  }

  async storeToolCalls(finalAnswer) {
    // Accept final answer as a parameter
    try {
      await Message.create({
        userId: this.userId,
        companyId: this.companyId,
        chatText: finalAnswer, // Store the final generated answer text
        chatUser: "bot", // Store the chat user as "bot"
        meta: JSON.stringify({ toolCalls: this.toolCalls }),
      });
    } catch (error) {
      console.error("Error storing tool calls in message meta:", error);
    }
  }
}

module.exports = OpenAIService;
