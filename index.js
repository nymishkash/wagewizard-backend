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
app.use("/sse/", require("./routes/sse"));

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
