jest.mock("../src/models/athleteModel", () => ({
  findByEmail: jest.fn(), findById: jest.fn(), createAthlete: jest.fn()
}));
const model = require("../src/models/athleteModel");
const controller = require("../src/controllers/authController");
const bcrypt = require("bcryptjs");

function context(body = {}) {
  const req = { body, session: {
    regenerate: jest.fn(cb => cb()), save: jest.fn(cb => cb()), destroy: jest.fn(cb => cb())
  } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), clearCookie: jest.fn() };
  return { req, res };
}

beforeEach(() => jest.resetAllMocks());

test.each([null, {}, { email: 123, password: "longpassword" },
  { email: "bad", password: "longpassword" },
  { email: "a@b.com", password: "short" },
  { email: "a@b.com", password: "é".repeat(37) },
  { email: "a@b.com", password: "x".repeat(73) }])("rejects malformed registration %j", async body => {
  const { req, res } = context(body);
  await controller.register(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(model.createAthlete).not.toHaveBeenCalled();
});

test("normalizes email, hashes password, and rotates registration session", async () => {
  const { req, res } = context({ email: " Athlete@Example.com ", password: "SecurePass123!" });
  model.findByEmail.mockResolvedValue(null);
  model.createAthlete.mockResolvedValue({ id: "1", email: "athlete@example.com" });
  await controller.register(req, res);
  expect(model.findByEmail).toHaveBeenCalledWith("athlete@example.com");
  expect(await bcrypt.compare(req.body.password, model.createAthlete.mock.calls[0][1])).toBe(true);
  expect(req.session.regenerate).toHaveBeenCalledTimes(1);
  expect(req.session.athleteId).toBe("1");
  expect(res.status).toHaveBeenCalledWith(201);
});

test("handles concurrent duplicate registration", async () => {
  const { req, res } = context({ email: "a@b.com", password: "SecurePass123!" });
  model.findByEmail.mockResolvedValue(null);
  model.createAthlete.mockRejectedValue({ code: "23505" });
  await controller.register(req, res);
  expect(res.status).toHaveBeenCalledWith(409);
});

test("bounds login input before database or bcrypt work", async () => {
  const { req, res } = context({ email: "a@b.com", password: "é".repeat(37) });
  await controller.login(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(model.findByEmail).not.toHaveBeenCalled();
});

test("uses generic error for unknown credentials", async () => {
  const { req, res } = context({ email: "a@b.com", password: "SecurePass123!" });
  model.findByEmail.mockResolvedValue(null);
  await controller.login(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: "Invalid email or password." });
});

test("login rotates and saves session without returning password hash", async () => {
  const { req, res } = context({ email: "a@b.com", password: "SecurePass123!" });
  model.findByEmail.mockResolvedValue({ id: "2", email: "a@b.com", password_hash: await bcrypt.hash(req.body.password, 4) });
  await controller.login(req, res);
  expect(req.session.regenerate).toHaveBeenCalledTimes(1);
  expect(req.session.save).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledWith({ message: "Login successful.", athlete: { id: "2", email: "a@b.com" } });
});

test("rejects a session whose athlete no longer exists", async () => {
  const { req, res } = context();
  req.session.athleteId = "1";
  model.findById.mockResolvedValue(null);
  await controller.me(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test("logout destroys session and clears its cookie", () => {
  const { req, res } = context();
  controller.logout(req, res);
  expect(req.session.destroy).toHaveBeenCalledTimes(1);
  expect(res.clearCookie).toHaveBeenCalledWith("grh.sid");
});

test.each(["register", "login"])("%s clears authenticated state if session saving fails", async action => {
  const { req, res } = context({ email: "a@b.com", password: "SecurePass123!" });
  const athlete = { id: "1", email: "a@b.com", password_hash: await bcrypt.hash(req.body.password, 4) };
  model.findByEmail.mockResolvedValue(action === "register" ? null : athlete);
  model.createAthlete.mockResolvedValue(athlete);
  req.session.save.mockImplementation(cb => cb(new Error("private storage details")));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  await controller[action](req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(req.session.athleteId).toBeUndefined();
  expect(req.session.destroy).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(res.json.mock.calls)).not.toContain("private storage details");
  expect(JSON.stringify(log.mock.calls)).not.toContain("private storage details");
  log.mockRestore();
});

test.each(["register", "login"])("%s fails closed if session rotation fails", async action => {
  const { req, res } = context({ email: "a@b.com", password: "SecurePass123!" });
  const athlete = { id: "1", email: "a@b.com", password_hash: await bcrypt.hash(req.body.password, 4) };
  model.findByEmail.mockResolvedValue(action === "register" ? null : athlete);
  model.createAthlete.mockResolvedValue(athlete);
  req.session.regenerate.mockImplementation(cb => cb(new Error("storage unavailable")));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  await controller[action](req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(req.session.save).not.toHaveBeenCalled();
  log.mockRestore();
});

test("does not expose sensitive model fields in account responses", async () => {
  const { req, res } = context();
  req.session.athleteId = "1";
  model.findById.mockResolvedValue({ id: "1", email: "a@b.com", password_hash: "private" });
  await controller.me(req, res);
  expect(res.json).toHaveBeenCalledWith({ athlete: { id: "1", email: "a@b.com", created_at: undefined } });
});

test("does not claim successful logout when session deletion fails", () => {
  const { req, res } = context();
  req.session.destroy.mockImplementation(cb => cb(new Error("storage unavailable")));
  controller.logout(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.clearCookie).not.toHaveBeenCalled();
});
