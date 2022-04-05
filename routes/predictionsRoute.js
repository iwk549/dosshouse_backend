const express = require("express");
const router = express.Router();
const { Prediction, validatePrediction } = require("../models/predictionModel");
const auth = require("../middleware/auth");
const { activeCompetitions } = require("../utils/allowables");
const validateObjectID = require("../middleware/validateObjectID");

router.post("/", [auth], async (req, res) => {
  req.body.userID = req.user._id;
  req.body.points = {
    group: 0,
    playoff: 0,
    misc: 0,
  };

  const ex = validatePrediction(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  const thisBracket = activeCompetitions[req.body.bracketCode];
  if (!thisBracket) return res.status(404).send("Competition not found");

  const predictions = await Prediction.find({
    bracketCode: req.body.bracketCode,
    userID: req.body.userID,
  }).select("name");
  if (predictions.length >= thisBracket.maxSubmissions)
    return res
      .status(400)
      .send(
        `You have already submitted the maximum allowed brackets for this competition (${thisBracket.maxSubmissions})`
      );
  if (predictions.some((p) => p.name === req.body.name))
    return res
      .status(400)
      .send(
        `You already have a bracket named ${req.body.name}. Please choose a different name.`
      );

  const newPrediction = new Prediction(req.body);
  await newPrediction.save();

  res.send(newPrediction._id);
});

router.put("/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.findById(req.params.id);
  if (!prediction) return res.status(404).send("Bracket not found");

  req.body.userID = req.user._id;
  const predictions = await Prediction.find({
    bracketCode: req.body.bracketCode,
    userID: req.body.userID,
  }).select("name");

  if (
    predictions.some(
      (p) =>
        p.name === req.body.name && String(prediction._id) !== String(p._id)
    )
  )
    return res
      .status(400)
      .send(
        `You already have a bracket named ${req.body.name}. Please choose a different name.`
      );

  const ex = validatePrediction(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);
  delete req.body.points;
  await Prediction.updateOne({ _id: req.params.id }, { $set: req.body });

  res.send(prediction._id);
});

router.get("/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    userID: req.user._id,
  });
  if (!prediction) res.status(404).send("Bracket not found");
  res.send(prediction);
});

router.get("/", [auth], async (req, res) => {
  const predictions = await Prediction.find({ userID: req.user._id }).select(
    "bracketCode name points"
  );
  let namedPredictions = [];
  predictions.forEach((p) => {
    let prediction = { ...p };
    prediction.bracketName = activeCompetitions[prediction.bracketCode]?.name;
    namedPredictions.push(prediction);
  });
  res.send(namedPredictions);
});

module.exports = router;
