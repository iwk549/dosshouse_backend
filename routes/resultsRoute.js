const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const validateObjectID = require("../middleware/validateObjectID");
const auth = require("../middleware/auth");
const { adminCheck } = require("../middleware/admin");
const { calculatePrediction, addRanking } = require("../utils/calculations");

const { Result } = require("../models/resultModel");
const { Prediction } = require("../models/predictionModel");
const { Competition } = require("../models/competitionModel");

router.get("/:id", [auth, validateObjectID], async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).send("Competition not found");

  const results = await Result.findOne({ code: competition.code });
  if (!results) return res.status(404).send("Results not found");

  res.send(results);
});

router.post("/calculate/:code", [auth, adminCheck], async (req, res) => {
  const result = await Result.findOne({ code: req.params.code });
  const competition = await Competition.findOne({ code: req.params.code });
  if (!result) return res.status(404).send("Result not found");
  if (!competition) return res.status(404).send("Competition not found");

  const allPredictions = await Prediction.find({
    competitionID: competition._id,
  });
  let updatedPoints = [];
  allPredictions.forEach((p) => {
    const { points, totalPoints } = calculatePrediction(p, result, competition);
    updatedPoints.push({
      _id: p._id,
      points,
      totalPoints,
    });
  });

  const predictionsWithRanking = addRanking(updatedPoints);

  Prediction.bulkWrite(
    predictionsWithRanking.map((u) => ({
      updateOne: {
        filter: { _id: mongoose.Types.ObjectId(u._id) },
        update: {
          $set: {
            points: u.points,
            totalPoints: u.totalPoints,
            ranking: u.ranking,
          },
        },
      },
    }))
  );

  res.send("ok");
});

module.exports = router;
