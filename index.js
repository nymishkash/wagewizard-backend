require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");
const eventService = require("./config/redis");

const PORT = process.env.PORT || 8081;

async function initdb() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    if (process.env.DB_SYNC === "true") {
      await sequelize.sync();
      console.log("Database tables synchronized.");
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

async function startServer() {
  try {
    await initdb();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down");
      server.close(async () => {
        await sequelize.close();
        eventService.client.disconnect();
        process.exit(0);
      });
      server.closeIdleConnections();
      setTimeout(() => process.exit(0), 10000).unref();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
