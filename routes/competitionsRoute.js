const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const { Competition } = require("../models/competitionModel");

router.get("/", async (req, res) => {
  const competitions = await Competition.find();
  res.send(competitions);
});

module.exports = router;
