const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { adminCheck } = require("../middleware/admin");
const { loginLimiter } = require("../middleware/rateLimiter");
const {
  Version,
  validateVersion,
  dosshouseVersionStringID,
} = require("../models/versionModel");

// do not implement limiter during test
const testingLimiter = process.env.NODE_ENV !== "test" ? [loginLimiter] : [];

router.get("/", async (req, res) => {
  const version = await Version.findOne({
    stringID: dosshouseVersionStringID,
  }).select("major minor patch");
  res.send(version);
});

router.post("/", [...testingLimiter, auth, adminCheck], async (req, res) => {
  if (req.body.stringID !== dosshouseVersionStringID)
    return res.status(400).send("Incorrect version ID");

  const ex = validateVersion(req.body);
  if (ex.error) return res.status(400).send("Not a valid version");

  const result = await Version.updateOne(
    { stringID: req.body.stringID },
    { $set: req.body },
    { upsert: true }
  );

  res.send(result);
});

module.exports = router;
