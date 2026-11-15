
const request = require("supertest");
const app = require("../src/app");

describe("GlobalRecruit Hub API", () => {
  test("GET /api/health returns a successful response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.application).toBe("GlobalRecruit Hub");
  });

  test("Unknown routes return 404", async () => {
    const response = await request(app).get("/api/not-found");

    expect(response.statusCode).toBe(404);
  });
});
