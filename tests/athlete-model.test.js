jest.mock("../src/config/db", () => ({ query: jest.fn() }));
const pool = require("../src/config/db");
const model = require("../src/models/athleteModel");
beforeEach(() => jest.resetAllMocks());

test("email lookup binds untrusted input as a SQL parameter", async () => {
  pool.query.mockResolvedValue({ rows: [] });
  const email = "' OR 1=1 --";
  expect(await model.findByEmail(email)).toBeNull();
  expect(pool.query).toHaveBeenCalledWith(expect.not.stringContaining(email), [email]);
});

test("account lookup selects public fields and binds athlete ID", async () => {
  pool.query.mockResolvedValue({ rows: [{ id: "1", email: "a@b.com" }] });
  expect(await model.findById("1")).toEqual({ id: "1", email: "a@b.com" });
  expect(pool.query).toHaveBeenCalledWith(expect.not.stringContaining("password_hash"), ["1"]);
});

test("insertion binds email and hash and returns public fields", async () => {
  pool.query.mockResolvedValue({ rows: [{ id: "1", email: "a@b.com" }] });
  await model.createAthlete("a@b.com", "hashed-password");
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("RETURNING id, email, created_at"), ["a@b.com", "hashed-password"]);
});
