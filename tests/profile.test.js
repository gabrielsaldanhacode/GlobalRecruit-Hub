jest.mock("../src/models/profileModel", () => ({ findByAthleteId: jest.fn(), save: jest.fn() }));
const model = require("../src/models/profileModel");
const router = require("../src/routes/profileRoutes");
const handlers = router.stack.filter(layer => layer.route);
const get = handlers.find(layer => layer.route.methods.get).route.stack[0].handle;
const put = handlers.find(layer => layer.route.methods.put).route.stack[0].handle;
const auth = router.stack.find(layer => !layer.route).handle;

function context(body, athleteId = "1") {
  const req = { body, session: { athleteId } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
}
const valid = { full_name: "Alex Athlete", country: "Brazil", sport: "Soccer", position: "Midfielder",
  academic_context: "Computer Science", gpa: 3.8, graduation_year: 2027,
  highlight_url: "https://example.com/highlights" };

beforeEach(() => jest.resetAllMocks());

test("requires a session for both profile routes", () => {
  const { req, res } = context(valid, undefined);
  delete req.session.athleteId;
  const next = jest.fn();
  auth(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test("loads only the signed-in athlete's profile", async () => {
  const { req, res } = context();
  model.findByAthleteId.mockResolvedValue(valid);
  await get(req, res);
  expect(model.findByAthleteId).toHaveBeenCalledWith("1");
  expect(res.json).toHaveBeenCalledWith({ profile: valid });
});

test("saves normalized fields under the session athlete ID", async () => {
  const { req, res } = context({ ...valid, full_name: "  Alex Athlete  " });
  model.save.mockResolvedValue({ ...valid, athlete_id: "1" });
  await put(req, res);
  expect(model.save).toHaveBeenCalledWith("1", expect.objectContaining({ full_name: "Alex Athlete", gpa: 3.8 }));
  expect(res.json).toHaveBeenCalledWith({ profile: expect.objectContaining({ athlete_id: "1" }) });
});

test.each([
  { full_name: "" }, { sport: "" }, { graduation_year: 1999 }, { graduation_year: "2027" },
  { gpa: 4.1 }, { gpa: -0.1 }, { gpa: 3.123 }, { highlight_url: "http://example.com" },
  { highlight_url: "not-a-url" }, { academic_context: "x".repeat(301) },
  { academic_context: "", gpa: null }
])("rejects invalid profile field %j", async changes => {
  const { req, res } = context({ ...valid, ...changes });
  await put(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(model.save).not.toHaveBeenCalled();
});

test("reports database failures without leaking details", async () => {
  const { req, res } = context(valid);
  model.save.mockRejectedValue(new Error("private database details"));
  await put(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: "Unable to save profile." });
});
