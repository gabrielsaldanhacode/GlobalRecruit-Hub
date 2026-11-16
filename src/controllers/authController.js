
const bcrypt = require("bcryptjs");
const athleteModel = require("../models/athleteModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Missing accounts still pay the same bcrypt cost as an incorrect password.
const DUMMY_HASH = bcrypt.hashSync("unused-login-timing-placeholder", 12);

async function startSession(req, athleteId) {
  await new Promise((resolve, reject) => {
    req.session.regenerate(error => error ? reject(error) : resolve());
  });
  req.session.athleteId = String(athleteId);
  try {
    await new Promise((resolve, reject) => {
      req.session.save(error => error ? reject(error) : resolve());
    });
  } catch (error) {
    // Do not let Express automatically persist authenticated state on an error response.
    delete req.session.athleteId;
    req.session.destroy(() => {});
    throw error;
  }
}

function publicAthlete(athlete) {
  return { id: athlete.id, email: athlete.email, created_at: athlete.created_at };
}

async function register(req, res) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !EMAIL_REGEX.test(email.trim()) ||
      email.length > 255
    ) {
      return res.status(400).json({
        error: "Enter a valid email address."
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        error: "Password must contain at least 8 characters and at most 72 UTF-8 bytes."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingAthlete =
      await athleteModel.findByEmail(normalizedEmail);

    if (existingAthlete) {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const athlete = await athleteModel.createAthlete(
      normalizedEmail,
      passwordHash
    );

    await startSession(req, athlete.id);
    return res.status(201).json({
      message: "Account created successfully.",
      athlete: publicAthlete(athlete)
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "An account with this email already exists."
      });
    }

    console.error("Registration failed.");
    return res.status(500).json({
      error: "Unable to register athlete."
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !EMAIL_REGEX.test(email.trim()) || email.length > 255 ||
      password.length < 8 || Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    const athlete = await athleteModel.findByEmail(
      email.trim().toLowerCase()
    );

    const validPassword = await bcrypt.compare(password, athlete ? athlete.password_hash : DUMMY_HASH);

    if (!athlete || !validPassword) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    await startSession(req, athlete.id);
    return res.status(200).json({
      message: "Login successful.",
      athlete: { id: athlete.id, email: athlete.email }
    });
  } catch (error) {
    console.error("Login failed.");
    return res.status(500).json({
      error: "Unable to log in."
    });
  }
}

async function me(req, res) {
  if (!req.session.athleteId) {
    return res.status(401).json({
      error: "Authentication required."
    });
  }

  try {
    const athlete = await athleteModel.findById(
      req.session.athleteId
    );

    if (!athlete) {
      return res.status(401).json({
        error: "Authentication required."
      });
    }

    return res.json({ athlete: publicAthlete(athlete) });
  } catch (error) {
    console.error("Account lookup failed.");
    return res.status(500).json({
      error: "Unable to retrieve account."
    });
  }
}

function logout(req, res) {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        error: "Unable to log out."
      });
    }

    res.clearCookie("grh.sid");
    return res.json({ message: "Logged out successfully." });
  });
}

module.exports = { register, login, me, logout };
