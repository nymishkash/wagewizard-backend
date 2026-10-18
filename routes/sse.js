const express = require("express");
const eventService = require("../config/redis");
const { sseConnections } = require("../metrics");

const router = express.Router();

router.get("/:conversationId", (req, res) => {
  const { conversationId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  console.log(`Client connected for conversation ${conversationId}`);
  sseConnections.inc();

  // init
  res.write(`data: ${JSON.stringify({ message: "Connection established" })}\n\n`);

  const subscriber = eventService.subscribe((eventType, data) => {
    console.log(`Received event: ${eventType}`, data);

    res.write(`data: ${JSON.stringify({ eventType, data })}\n\n`);
  });

  res.on("close", () => {
    subscriber.unsubscribe();
    sseConnections.dec();
    console.log(`Connection closed for conversation ${conversationId}`);
  });
});

module.exports = router;
