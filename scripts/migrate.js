
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

async function runMigration() {
  const client = await pool.connect();

  try {
    const filePath = path.join(
      __dirname,
      "../migrations/001_create_athletes.sql"
    );

    const sql = fs.readFileSync(filePath, "utf8");

    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    console.log("Athletes table migration completed!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error("Database connection failed:", error.message);
  process.exitCode = 1;
});
