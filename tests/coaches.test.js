const coaches = require("../src/data/coaches");
const router = require("../src/routes/coachRoutes");
const handler = router.stack.find(layer => layer.route).route.stack[0].handle;

test("directory has five distinct official sources with a checked date", () => {
  expect(coaches).toHaveLength(5);
  expect(new Set(coaches.map(coach => coach.college)).size).toBe(5);
  for (const coach of coaches) {
    expect(coach.name).toBeTruthy();
    expect(coach.sport).toBeTruthy();
    expect(coach.source_url).toMatch(/^https:\/\//);
    expect(coach.checked_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (coach.email) expect(coach.email).toContain("@");
  }
});

test("search matches coach and school, ignoring case", () => {
  expect(router.searchCoaches(" zathey ")).toHaveLength(1);
  expect(router.searchCoaches("AQUINAS")[0].name).toBe("Luke Ruff");
  expect(router.searchCoaches("no such school")).toEqual([]);
});

test("API returns empty results and bounds search input", () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  handler({ query: { q: "no such school" } }, res);
  expect(res.json).toHaveBeenCalledWith({ coaches: [] });
  handler({ query: { q: "x".repeat(101) } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
