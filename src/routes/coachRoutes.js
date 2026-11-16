const express = require("express");
const coaches = require("../data/coaches");
const router = express.Router();

function searchCoaches(query = "") {
  const term = query.trim().toLocaleLowerCase();
  return coaches.filter(coach => `${coach.name} ${coach.college}`.toLocaleLowerCase().includes(term));
}

router.get("/", (req, res) => {
  if (typeof req.query.q !== "undefined" && (typeof req.query.q !== "string" || req.query.q.length > 100)) {
    return res.status(400).json({ error: "Search must be at most 100 characters." });
  }
  return res.json({ coaches: searchCoaches(req.query.q) });
});

module.exports = router;
module.exports.searchCoaches = searchCoaches;
