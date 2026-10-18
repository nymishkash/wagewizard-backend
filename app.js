const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("./models");
const eventService = require("./config/redis");
const { register, httpRequests, httpDuration } = require("./metrics");

const app = express();

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("x-request-id", req.id);

  res.on("finish", () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route ? req.baseUrl + req.route.path : "unmatched";
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequests.inc(labels);
    if (!req.baseUrl.startsWith("/sse")) {
      httpDuration.observe(labels, seconds);
    }
    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        requestId: req.id,
        method: req.method,
        path: req.baseUrl + req.path,
        status: res.statusCode,
        ms: Math.round(seconds * 1000),
      })
    );
  });

  next();
});

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/readyz", async (req, res) => {
  try {
    await sequelize.authenticate();
    await eventService.client.ping();
    res.json({ status: "ready" });
  } catch (error) {
    res.status(503).json({ status: "not ready", error: error.message });
  }
});

app.get("/version", (req, res) => {
  res.json({ version: process.env.GIT_SHA || "unknown" });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
});

app.use("/auth", require("./routes/auth"));
app.use("/conversations", require("./routes/conversation"));
app.use("/sse/", require("./routes/sse"));
app.use("/employees/", require("./routes/employee"));

module.exports = app;
