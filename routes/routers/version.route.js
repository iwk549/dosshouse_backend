const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { adminCheck } = require("../../middleware/admin");
const { loginLimiter } = require("../../middleware/rateLimiter");
const {
  getVersion,
  updateVersion,
} = require("../controllers/version.controller");

// do not implement limiter during test
const testingLimiter = process.env.NODE_ENV !== "test" ? [loginLimiter] : [];

router.get("/", getVersion);
router.post("/", [...testingLimiter, auth, adminCheck], updateVersion);

module.exports = router;
