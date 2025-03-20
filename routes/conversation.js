const express = require("express");
const eventService = require("../config/redis");
const OpenAIService = require("../llm/openai");
const { Conversation, Message, Sequelize } = require("../models");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.post("/send", authenticateToken, async (req, res) => {
  const { payload } = req.body;

  if (!payload) {
    return res.status(400).json({ error: "Payload is required." });
  }

  const { userMessage, userId, companyId, conversationId } = payload;

  const openaiService = new OpenAIService(companyId, userId, conversationId);

  try {
    await openaiService.handleIncomingMessage({
      conversationId: conversationId,
      message: userMessage,
    });
    res.status(200).json({ message: "Message processed successfully." });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: "An error occurred while processing the message." });
  }
});

router.post("/all", authenticateToken, async (req, res) => {
  const { companyId } = req.body;

  if (!companyId) {
    return res.status(400).json({ error: "Company ID is required." });
  }

  try {
    const conversations = await Conversation.findAll({
      where: { companyId },
      attributes: ["id", "createdAt"],
    });

    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await Message.findOne({
          where: {
            conversationId: conversation.id,
            chatUser: {
              [Sequelize.Op.ne]: "tool",
            },
          },
          order: [["createdAt", "DESC"]],
          attributes: ["chatUser", "chatText", "createdAt"],
        });

        return {
          id: conversation.id,
          createdAt: conversation.createdAt,
          lastMessage: lastMessage || null,
        };
      })
    );

    res.status(200).json({ conversations: conversationsWithMessages });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "An error occurred while fetching conversations." });
  }
});

router.post("/create", authenticateToken, async (req, res) => {
  const { companyId } = req.body;

  if (!companyId) {
    return res.status(400).json({ error: "Company ID is required." });
  }

  try {
    const conversation = await Conversation.create({
      companyId,
      meta: {},
    });

    res.status(200).json({ conversationId: conversation.id });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "An error occurred while creating conversation." });
  }
});

router.get("/:conversationId/messages", authenticateToken, async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ error: "Conversation ID is required." });
  }

  try {
    const messages = await Message.findAll({
      where: {
        conversationId,
        chatUser: {
          [Sequelize.Op.in]: ["assistant", "user"],
        },
      },
      order: [["createdAt", "ASC"]],
      attributes: ["id", "chatText", "chatUser", "createdAt"],
    });

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "An error occurred while fetching messages." });
  }
});

module.exports = router;
