jest.mock("../src/config/db", () => ({ query: jest.fn() }));
const pool = require("../src/config/db");
const model = require("../src/models/profileModel");
beforeEach(() => jest.resetAllMocks());

test("profile lookup scopes SQL to athlete ID", async () => {
  pool.query.mockResolvedValue({ rows: [] });
  expect(await model.findByAthleteId("2")).toBeNull();
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("WHERE athlete_id = $1"), ["2"]);
});

test("upsert binds fields and updates only the current athlete row", async () => {
  const profile = { full_name: "Alex", country: "Brazil", sport: "Soccer", position: "Midfielder",
    academic_context: null, gpa: 3.8, graduation_year: 2027, highlight_url: null };
  pool.query.mockResolvedValue({ rows: [{ athlete_id: "2", ...profile }] });
  expect(await model.save("2", profile)).toEqual({ athlete_id: "2", ...profile });
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT (athlete_id) DO UPDATE"),
    ["2", "Alex", "Brazil", "Soccer", "Midfielder", null, 3.8, 2027, null]);
});
