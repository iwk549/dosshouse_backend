const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const validateObjectID = require("../middleware/validateObjectID");

const { Competition } = require("../models/competitionModel");

router.get("/active", async (req, res) => {
  const competitions = await Competition.find({
    submissionDeadline: { $gte: new Date() },
  }).sort({
    submissionDeadline: 1,
  });
  res.send(competitions);
});

router.get("/expired", async (req, res) => {
  const competitions = await Competition.find({
    submissionDeadline: { $lt: new Date() },
  }).sort({
    submissionDeadline: -1,
  });
  res.send(competitions);
});

router.get("/single/:id", [validateObjectID], async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).send("Competition not found");
  res.send(competition);
});

module.exports = router;
