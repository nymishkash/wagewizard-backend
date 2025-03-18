require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize, User, Message } = require("./models"); // Import both sequelize and User model
const OpenAIService = require("./llm/openai");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/conversations", require("./routes/conversation"));

// New route for generating responses
app.post("/api/chat", async (req, res) => {
  const { question, companyId, conversationId, userId } = req.body;

  if (!question || !companyId || !userId) {
    return res.status(400).json({ error: "Question, companyId, and userId are required." });
  }

  try {
    const openAIService = new OpenAIService(companyId, userId, conversationId); // Pass conversationId directly
    await openAIService.init();

    const response = await openAIService.reply(question); // No need for conditional check

    // Store the message in the database
    await Message.create({
      userId: null, // Set userId as needed
      companyId: companyId,
      chatText: response,
      chatUser: "bot",
      meta: JSON.stringify({ conversationId }),
    });

    return res.json({ response });
  } catch (error) {
    console.error("Error generating response:", error);
    return res.status(500).json({ error: "An error occurred while generating the response." });
  }
});

// Database initialization and server start
const PORT = process.env.PORT || 8081;

async function initdb() {
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // Sync all models
    // await sequelize.sync({ force: true, alter: true });
    // console.log("Database tables synchronized.");

    // Check if Users table has any records
    const userCount = await User.count(); // Now User should be defined
    console.log(`Current user count: ${userCount}`);
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

async function startServer() {
  try {
    // Initialize database
    await initdb();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
