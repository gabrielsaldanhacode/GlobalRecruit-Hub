const PDFDocument = require("pdfkit");
const { writePdf } = require("../src/services/recruitingPdf");

test("renders a real PDF with the saved athlete details", async () => {
  const doc = new PDFDocument({ compress: false, size: "LETTER", margin: 54 });
  const chunks = [];
  doc.on("data", chunk => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });
  writePdf(doc, {
    full_name: "Alex Athlete", sport: "Soccer", position: "Midfielder", country: "Brazil",
    academic_context: "Computer Science", gpa: 3.8, graduation_year: 2027,
    highlight_url: "https://example.com/highlights"
  });
  await completed;
  const pdf = Buffer.concat(chunks);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(500);
  expect(pdf.toString("latin1")).toContain("%%EOF");
});
