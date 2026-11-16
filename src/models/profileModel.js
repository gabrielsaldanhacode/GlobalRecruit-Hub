const pool = require("../config/db");

const COLUMNS = "athlete_id, full_name, country, sport, position, academic_context, gpa, graduation_year, highlight_url, updated_at";

async function findByAthleteId(athleteId) {
  const result = await pool.query(`SELECT ${COLUMNS} FROM athlete_profiles WHERE athlete_id = $1`, [athleteId]);
  return result.rows[0] || null;
}

async function save(athleteId, profile) {
  const result = await pool.query(
    `INSERT INTO athlete_profiles (athlete_id, full_name, country, sport, position, academic_context, gpa, graduation_year, highlight_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (athlete_id) DO UPDATE SET
       full_name = EXCLUDED.full_name, country = EXCLUDED.country,
       sport = EXCLUDED.sport, position = EXCLUDED.position,
       academic_context = EXCLUDED.academic_context, gpa = EXCLUDED.gpa,
       graduation_year = EXCLUDED.graduation_year, highlight_url = EXCLUDED.highlight_url,
       updated_at = NOW()
     RETURNING ${COLUMNS}`,
    [athleteId, profile.full_name, profile.country, profile.sport, profile.position,
      profile.academic_context, profile.gpa, profile.graduation_year, profile.highlight_url]
  );
  return result.rows[0];
}

module.exports = { findByAthleteId, save };
