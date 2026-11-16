
const request = require("supertest");
const bcrypt = require("bcryptjs");

// Mock database operations without connecting to Neon.
jest.mock("../src/models/athleteModel", () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createAthlete: jest.fn()
}));

const athleteModel = require("../src/models/athleteModel");
const app = require("./helpers/app");

describe("Athlete Authentication API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("registers an athlete with valid information", async () => {
    athleteModel.findByEmail.mockResolvedValue(null);
    athleteModel.createAthlete.mockResolvedValue({
      id: "1",
      email: "athlete@example.com",
      created_at: new Date().toISOString()
    });

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "athlete@example.com",
        password: "SecurePass123!"
      });

    expect(response.status).toBe(201);
    expect(response.body.athlete.email).toBe("athlete@example.com");
    expect(response.body.athlete.password_hash).toBeUndefined();
    expect(athleteModel.createAthlete).toHaveBeenCalledTimes(1);

    const hash = athleteModel.createAthlete.mock.calls[0][1];
    expect(hash).not.toBe("SecurePass123!");
    expect(await bcrypt.compare("SecurePass123!", hash)).toBe(true);
  });

  test("rejects invalid email addresses", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "invalid-email",
        password: "SecurePass123!"
      });

    expect(response.status).toBe(400);
    expect(athleteModel.createAthlete).not.toHaveBeenCalled();
  });

  test("rejects passwords shorter than 8 characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "athlete@example.com",
        password: "123"
      });

    expect(response.status).toBe(400);
    expect(athleteModel.createAthlete).not.toHaveBeenCalled();
  });

  test("prevents duplicate email registration", async () => {
    athleteModel.findByEmail.mockResolvedValue({
      id: "1",
      email: "athlete@example.com"
    });

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "athlete@example.com",
        password: "SecurePass123!"
      });

    expect(response.status).toBe(409);
    expect(athleteModel.createAthlete).not.toHaveBeenCalled();
  });

  test("rejects incorrect login credentials", async () => {
    const passwordHash = await bcrypt.hash("CorrectPass123!", 4);

    athleteModel.findByEmail.mockResolvedValue({
      id: "1",
      email: "athlete@example.com",
      password_hash: passwordHash
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "athlete@example.com",
        password: "WrongPassword!"
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password.");
  });

  test("rejects access without authentication", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  test("logs in and maintains an authenticated session", async () => {
    const passwordHash = await bcrypt.hash("CorrectPass123!", 4);

    athleteModel.findByEmail.mockResolvedValue({
      id: "1",
      email: "athlete@example.com",
      password_hash: passwordHash
    });

    athleteModel.findById.mockResolvedValue({
      id: "1",
      email: "athlete@example.com"
    });

    // An agent preserves session cookies across HTTP requests.
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({
        email: "athlete@example.com",
        password: "CorrectPass123!"
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.message).toBe("Login successful.");
    expect(loginResponse.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(loginResponse.headers["set-cookie"][0]).toContain("SameSite=Lax");
    expect(loginResponse.headers["cache-control"]).toBe("no-store");

    const accountResponse = await agent.get("/api/auth/me");

    expect(accountResponse.status).toBe(200);
    expect(accountResponse.body.athlete.email)
      .toBe("athlete@example.com");
  });

  test("logs out and invalidates the session", async () => {
    const passwordHash = await bcrypt.hash("CorrectPass123!", 4);

    athleteModel.findByEmail.mockResolvedValue({
      id: "1",
      email: "athlete@example.com",
      password_hash: passwordHash
    });

    const agent = request.agent(app);

    await agent.post("/api/auth/login").send({
      email: "athlete@example.com",
      password: "CorrectPass123!"
    });

    const logoutResponse = await agent.post("/api/auth/logout");

    expect(logoutResponse.status).toBe(200);

    const accountResponse = await agent.get("/api/auth/me");

    expect(accountResponse.status).toBe(401);
  });

  test("registration rotates an existing login and invalidates its old cookie", async () => {
    athleteModel.findByEmail.mockResolvedValue({
      id: "1", email: "first@example.com", password_hash: await bcrypt.hash("SecurePass123!", 4)
    });
    const agent = request.agent(app);
    const first = await agent.post("/api/auth/login").send({ email: "first@example.com", password: "SecurePass123!" });
    expect(first.status).toBe(200);
    const oldCookie = first.headers["set-cookie"][0].split(";")[0];
    athleteModel.findByEmail.mockResolvedValue(null);
    athleteModel.createAthlete.mockResolvedValue({ id: "2", email: "second@example.com" });
    const registered = await agent.post("/api/auth/register").send({ email: "second@example.com", password: "SecurePass123!" });
    expect(registered.status).toBe(201);
    expect(registered.headers["set-cookie"][0].split(";")[0]).not.toBe(oldCookie);
    const replay = await request(app).get("/api/auth/me").set("Cookie", oldCookie);
    expect(replay.status).toBe(401);
  });
});
