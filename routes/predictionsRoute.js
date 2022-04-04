const express = require("express");
const router = express.Router();
const { Prediction, validatePrediction } = require("../models/predictionModel");
const auth = require("../middleware/auth");
const { activeCompetitions } = require("../utils/allowables");

router.post("/", [auth], async (req, res) => {
  req.body.userID = req.user._id;
  const ex = validatePrediction(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);
  const thisBracket = activeCompetitions[req.body.bracketCode];
  if (!thisBracket) return res.status(404).send("Competition not found");

  const predictions = await Prediction.find({
    bracketCode: req.body.bracketCode,
    userID: req.body.userID,
  });
  if (predictions.length >= thisBracket.maxSubmissions)
    return res
      .status(400)
      .send(
        `You have already submitted the maximum allowed brackets for this competition (${thisBracket.maxSubmissions})`
      );
  const newPrediction = new Prediction(req.body);
  await newPrediction.save();

  res.send(newPrediction._id);
});

module.exports = router;
