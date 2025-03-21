const express = require("express");
const eventService = require("../config/redis");
const OpenAIService = require("../llm/openai");
const { Conversation, Message, Sequelize } = require("../models");
const { authenticateToken } = require("../middleware/auth");
const fs = require("fs");

const multer = require("multer");
const OpenAI = require("openai");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

router.post("/voice", authenticateToken, upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  const { userId, companyId, conversationId } = req.body;

  try {
    // Create a temporary file-like object
    const audioBuffer = req.file.buffer;

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_KEY,
    });

    // 1. Transcribe incoming audio using the OpenAI SDK
    // Create a temporary file path for the audio buffer
    const tempFilePath = `/tmp/audio-${Date.now()}.webm`;
    fs.writeFileSync(tempFilePath, audioBuffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "json",
    });

    if (!transcription || !transcription.text) {
      return res.status(500).json({ error: "the audio recording was empty" });
    }

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    // 2. Process with your existing OpenAI service
    const openaiService = new OpenAIService(companyId, userId, conversationId);

    const response = await openaiService.handleVoiceChat({
      conversationId,
      message: transcription.text,
    });

    // 3. Convert response to speech using the OpenAI SDK
    const speechResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: response.response,
    });

    // Convert the audio to a buffer
    const mp3Buffer = Buffer.from(await speechResponse.arrayBuffer());

    // Set appropriate headers for audio file
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": mp3Buffer.length,
    });

    // Send the audio file and end the response
    return res.send(mp3Buffer);
  } catch (error) {
    console.error("Error processing audio chat:", error);
    return res.status(500).json({
      error: "An error occurred while processing the audio chat",
      details: error.message,
    });
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
