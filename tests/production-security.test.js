const request = require("supertest");
jest.mock("../src/models/athleteModel", () => ({
  findByEmail: jest.fn(), findById: jest.fn(), createAthlete: jest.fn()
}));
process.env.NODE_ENV = "production";
const app = require("./helpers/app");
const model = require("../src/models/athleteModel");
const bcrypt = require("bcryptjs");

test("production sets Secure cookies behind its trusted HTTPS proxy", async () => {
  model.findByEmail.mockResolvedValue({
    id: "1", email: "a@b.com", password_hash: await bcrypt.hash("SecurePass123!", 4)
  });
  const res = await request(app).post("/api/auth/login")
    .set("X-Forwarded-Proto", "https")
    .send({ email: "a@b.com", password: "SecurePass123!" });
  expect(res.status).toBe(200);
  expect(res.headers["set-cookie"][0]).toContain("Secure");
  expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
  expect(res.headers["strict-transport-security"]).toContain("max-age=31536000");
});
