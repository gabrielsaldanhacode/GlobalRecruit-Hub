// Run the real middleware stack without credentials or a live database.
jest.mock("../../src/config/db", () => ({ query: jest.fn() }));
jest.mock("connect-pg-simple", () => session => session.MemoryStore);
process.env.SESSION_SECRET = "test-only-session-secret-not-for-production";
process.env.APP_ORIGIN = "";
module.exports = require("../../src/app");
