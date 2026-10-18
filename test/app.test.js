const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");

process.env.GIT_SHA = "abc123";
const app = require("../app");

test("healthz returns ok", async () => {
  const res = await request(app).get("/healthz");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, "ok");
});

test("version returns the git sha", async () => {
  const res = await request(app).get("/version");
  assert.strictEqual(res.body.version, "abc123");
});

test("protected route needs a token", async () => {
  const res = await request(app).post("/employees/all").send({});
  assert.strictEqual(res.status, 401);
});

test("metrics are exposed", async () => {
  const res = await request(app).get("/metrics");
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /http_requests_total/);
  assert.match(res.text, /sse_active_connections/);
});
