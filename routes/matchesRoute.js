const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const { Match } = require("../models/matchModel");
const { brackets } = require("../utils/allowables");

router.get("/:bracketCode", async (req, res) => {
  const bracket = brackets[req.params.bracketCode];
  if (!bracket) return res.status(404).send("Invalid bracket code");
  const matches = await Match.find({
    bracketCode: req.params.bracketCode,
  }).sort("dateTime 1 groupName 1");

  res.send(matches);
});

module.exports = router;
