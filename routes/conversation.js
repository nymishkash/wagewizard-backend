const express = require("express");
const eventService = require("../config/redis");
const OpenAIService = require("../llm/openai");
const { Conversation } = require("../models");

const router = express.Router();

router.get("/:conversationId", (req, res) => {
  const { conversationId } = req.params;

  res.setHeader("Connection", "keep-alive");

  const subscriber = eventService.subscribe((eventType, data) => {
    console.log(`Received event: ${eventType}`, data);
    res.write(JSON.stringify({ eventType, data }));
  });

  req.on("close", () => {
    subscriber.unsubscribe();
    console.log(`Connection closed for conversation ${conversationId}`);
  });

  res.status(200).json({ message: `Keep-alive for conversation ${conversationId}` });
});

router.post("/send", async (req, res) => {
  const { payload } = req.body;

  if (!payload) {
    return res.status(400).json({ error: "Payload is required." });
  }

  const { userMessage, userId, companyId, conversationId } = payload;

  let finalConversationId = conversationId;

  if (!finalConversationId) {
    try {
      const conversation = await Conversation.create({
        companyId,
      });
      finalConversationId = conversation.id;
    } catch (error) {
      console.error("Error creating new conversation:", error);
      return res
        .status(500)
        .json({ error: "An error occurred while creating a new conversation." });
    }
  }

  const openaiService = new OpenAIService(companyId, userId, finalConversationId);

  try {
    await openaiService.handleIncomingMessage({
      conversationId: finalConversationId,
      message: userMessage,
    });
    res.status(200).json({ message: "Message processed successfully." });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: "An error occurred while processing the message." });
  }
});

module.exports = router;
