const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const validateObjectID = require("../middleware/validateObjectID");
const { Match } = require("../models/matchModel");
const { Competition } = require("../models/competitionModel");

router.get("/:id", [validateObjectID], async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).send("Competition not found");
  const matches = await Match.find({
    bracketCode: competition.code,
  }).sort("groupName 1 dateTime 1");
  res.send(matches);
});

module.exports = router;
