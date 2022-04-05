const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const { Match } = require("../models/matchModel");
const { activeCompetitions } = require("../utils/allowables");

router.get("/", async (req, res) => {
  let competitions = [];
  Object.keys(activeCompetitions).forEach((k) => {
    let competition = {
      _id: k,
      name: activeCompetitions[k].name,
      deadline: activeCompetitions[k].deadline,
      maxSubmissions: activeCompetitions[k].maxSubmissions,
    };
    competitions.push(competition);
  });
  res.send(competitions);
});

router.get("/:bracketCode", async (req, res) => {
  const bracket = activeCompetitions[req.params.bracketCode];
  if (!bracket) return res.status(404).send("Invalid bracket code");
  const matches = await Match.find({
    bracketCode: req.params.bracketCode,
  }).sort("dateTime 1 groupName 1");

  res.send(matches);
});

module.exports = router;
