
const express = require("express");
const authController = require("../controllers/authController");
const { createAuthLimiter } = require("../middleware/security");

const router = express.Router();

const authLimiter = createAuthLimiter();
router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.get("/me", authController.me);
router.post("/logout", authController.logout);

module.exports = router;
