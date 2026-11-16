
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const directory = path.join(__dirname, "../migrations");
    const files = fs.readdirSync(directory).filter(file => /^\d+_.*\.sql$/.test(file)).sort();
    for (const file of files) {
      await client.query(fs.readFileSync(path.join(directory, file), "utf8"));
    }
    await client.query("COMMIT");

    console.log("Database migrations completed!");
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
