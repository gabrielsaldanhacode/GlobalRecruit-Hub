jest.mock("../src/models/profileModel", () => ({ findByAthleteId: jest.fn() }));
const model = require("../src/models/profileModel");
const { missingFields, writePdf } = require("../src/services/recruitingPdf");

const fakeDocument = () => {
  const doc = { info: {}, on: jest.fn(), pipe: jest.fn(), end: jest.fn(),
    fontSize: jest.fn(), fillColor: jest.fn(), text: jest.fn(), moveDown: jest.fn() };
  for (const method of ["fontSize", "fillColor", "text", "moveDown"]) doc[method].mockReturnValue(doc);
  return doc;
};
let mockPdf;
jest.mock("pdfkit", () => jest.fn(() => mockPdf), { virtual: true });
const router = require("../src/routes/pdfRoutes");
const handler = router.stack.find(layer => layer.route).route.stack[0].handle;

function context(athleteId = "1") {
  const req = { session: athleteId ? { athleteId } : {} };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(), destroy: jest.fn(), headersSent: false };
  return { req, res };
}
const profile = { full_name: "Alex Athlete", sport: "Soccer", position: "Midfielder",
  country: "Brazil", graduation_year: 2027, gpa: 3.8,
  academic_context: "Computer Science", highlight_url: "https://example.com/highlights" };

beforeEach(() => { jest.resetAllMocks(); mockPdf = fakeDocument(); });

test("unauthenticated exports are rejected before profile lookup", async () => {
  const { req, res } = context(null);
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(model.findByAthleteId).not.toHaveBeenCalled();
});

test.each([null, { ...profile, full_name: "" }, { ...profile, gpa: null, academic_context: "" }])(
  "incomplete profile returns a helpful error without creating PDF", async value => {
    const { req, res } = context();
    model.findByAthleteId.mockResolvedValue(value);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json.mock.calls[0][0].error).toContain("Complete your profile");
    expect(res.set).not.toHaveBeenCalled();
  }
);

test("PDF is generated from the signed-in athlete's saved profile", async () => {
  const { req, res } = context("42");
  model.findByAthleteId.mockResolvedValue(profile);
  await handler(req, res);
  expect(model.findByAthleteId).toHaveBeenCalledWith("42");
  expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
    "Content-Type": "application/pdf", "Cache-Control": "private, no-store",
    "Content-Disposition": expect.stringContaining("attachment;")
  }));
  expect(mockPdf.pipe).toHaveBeenCalledWith(res);
  const content = mockPdf.text.mock.calls.map(call => call[0]).join(" ");
  for (const value of ["Alex Athlete", "Soccer", "Midfielder", "Brazil", "2027", "3.8", "Computer Science", "https://example.com/highlights"]) {
    expect(content).toContain(value);
  }
  expect(mockPdf.end).toHaveBeenCalledTimes(1);
});

test("optional highlight is omitted without affecting export", () => {
  const doc = fakeDocument();
  writePdf(doc, { ...profile, highlight_url: null });
  expect(doc.text.mock.calls.map(call => call[0])).not.toContain("HIGHLIGHTS");
  expect(doc.end).toHaveBeenCalledTimes(1);
});

test("database failure is reported without leaking details", async () => {
  const { req, res } = context();
  model.findByAthleteId.mockRejectedValue(new Error("private database details"));
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: "Unable to load recruiting profile." });
});

test("validation lists required fields", () => {
  expect(missingFields({ ...profile, position: "", sport: "" })).toEqual(["sport", "position"]);
});
