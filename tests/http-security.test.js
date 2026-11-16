const request = require("supertest");
const app = require("./helpers/app");

test("API responses set browser headers and do not disclose Express", async () => {
  const res = await request(app).get("/api/health");
  expect(res.headers["x-powered-by"]).toBeUndefined();
  expect(res.headers["x-content-type-options"]).toBe("nosniff");
  expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers["cache-control"]).toBe("no-store");
});

test("rejects cross-origin logout before creating a session", async () => {
  const res = await request(app).post("/api/auth/logout").set("Origin", "https://evil.example");
  expect(res.status).toBe(403);
  expect(res.headers["set-cookie"]).toBeUndefined();
});

test("rejects malformed JSON without stack traces", async () => {
  const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{");
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "Invalid JSON request." });
});

test("rejects oversized JSON", async () => {
  const res = await request(app).post("/api/auth/login").send({ password: "a".repeat(21000) });
  expect(res.status).toBe(413);
});

test("throttles repeated authentication attempts", async () => {
  for (let i = 0; i < 20; i++) {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  }
  const res = await request(app).post("/api/auth/login").send({});
  expect(res.status).toBe(429);
  expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
});
