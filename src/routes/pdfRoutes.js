const express = require("express");
const profileModel = require("../models/profileModel");
const { missingFields, writePdf } = require("../services/recruitingPdf");
const router = express.Router();

router.get("/", async (req, res) => {
  if (!req.session.athleteId) return res.status(401).json({ error: "Authentication required." });
  let profile;
  try {
    profile = await profileModel.findByAthleteId(req.session.athleteId);
  } catch {
    return res.status(500).json({ error: "Unable to load recruiting profile." });
  }
  const missing = missingFields(profile);
  if (missing.length) {
    return res.status(422).json({ error: `Complete your profile before downloading: ${missing.join(", ")}.` });
  }
  // Load the PDF library only after authentication and validation succeed.
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "LETTER", margin: 54 });
  doc.on("error", error => {
    if (!res.headersSent) res.status(500).json({ error: "Unable to create recruiting PDF." });
    else res.destroy(error);
  });
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="recruiting-profile.pdf"',
    "Cache-Control": "private, no-store"
  });
  doc.pipe(res);
  writePdf(doc, profile);
});

module.exports = router;
