const express = require("express");
const model = require("../models/profileModel");
const router = express.Router();

router.use((req, res, next) => {
  if (!req.session.athleteId) return res.status(401).json({ error: "Authentication required." });
  next();
});

router.get("/", async (req, res) => {
  try {
    const profile = await model.findByAthleteId(req.session.athleteId);
    return res.json({ profile });
  } catch {
    return res.status(500).json({ error: "Unable to load profile." });
  }
});

router.put("/", async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Provide a valid profile." });
  }
  const profile = {};
  for (const [key, max] of Object.entries({ full_name: 150, country: 100, sport: 100, position: 100 })) {
    if (typeof body[key] !== "string" || !body[key].trim() || body[key].trim().length > max) {
      return res.status(400).json({ error: `${key.replace("_", " ")} is required and must be at most ${max} characters.` });
    }
    profile[key] = body[key].trim();
  }
  if (body.academic_context != null && (typeof body.academic_context !== "string" || body.academic_context.length > 300)) {
    return res.status(400).json({ error: "Academic context must be at most 300 characters." });
  }
  profile.academic_context = body.academic_context?.trim() || null;
  if (body.gpa == null || body.gpa === "") profile.gpa = null;
  else if (typeof body.gpa !== "number" || !Number.isFinite(body.gpa) || body.gpa < 0 || body.gpa > 4 || Math.round(body.gpa * 100) !== body.gpa * 100) {
    return res.status(400).json({ error: "GPA must be a number between 0 and 4 with at most two decimal places." });
  } else profile.gpa = body.gpa;
  if (profile.gpa == null && !profile.academic_context) {
    return res.status(400).json({ error: "Add a GPA or academic context." });
  }
  const year = new Date().getUTCFullYear();
  if (!Number.isInteger(body.graduation_year) || body.graduation_year < year - 10 || body.graduation_year > year + 15) {
    return res.status(400).json({ error: "Enter a valid graduation or enrollment year." });
  }
  profile.graduation_year = body.graduation_year;
  if (body.highlight_url != null && body.highlight_url !== "") {
    if (typeof body.highlight_url !== "string" || body.highlight_url.length > 2048) {
      return res.status(400).json({ error: "Enter a valid HTTPS highlight link." });
    }
    try {
      const url = new URL(body.highlight_url);
      if (url.protocol !== "https:" || !url.hostname.includes(".")) throw new Error();
      profile.highlight_url = url.href;
    } catch {
      return res.status(400).json({ error: "Enter a valid HTTPS highlight link." });
    }
  } else profile.highlight_url = null;
  try {
    const saved = await model.save(req.session.athleteId, profile);
    return res.json({ profile: saved });
  } catch {
    return res.status(500).json({ error: "Unable to save profile." });
  }
});

module.exports = router;
