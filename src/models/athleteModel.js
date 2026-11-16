
const pool = require("../config/db");

// Model: handles database operations for athlete accounts.

async function findByEmail(email) {
  const result = await pool.query(
    "SELECT id, email, password_hash FROM athletes WHERE email = $1",
    [email]
  );

  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    "SELECT id, email, created_at FROM athletes WHERE id = $1",
    [id]
  );

  return result.rows[0] || null;
}

async function createAthlete(email, passwordHash) {
  const result = await pool.query(
    `INSERT INTO athletes (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, created_at`,
    [email, passwordHash]
  );

  return result.rows[0];
}

module.exports = {
  findByEmail,
  findById,
  createAthlete
};
