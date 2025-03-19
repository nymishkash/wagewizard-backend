const express = require("express");
const eventService = require("../config/redis");

const router = express.Router();

router.get("/:conversationId", (req, res) => {
  const { conversationId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log(`Client connected for conversation ${conversationId}`);

  // Send an initial event so the client knows the connection is open
  res.write(`data: ${JSON.stringify({ message: "Connection established" })}\n\n`);

  const subscriber = eventService.subscribe((eventType, data) => {
    console.log(`Received event: ${eventType}`, data);

    // Ensure the correct SSE format
    res.write(`data: ${JSON.stringify({ eventType, data })}\n\n`);
  });

  req.on("close", () => {
    subscriber.unsubscribe();
    console.log(`Connection closed for conversation ${conversationId}`);
  });
});

module.exports = router;
