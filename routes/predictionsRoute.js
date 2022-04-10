const express = require("express");
const router = express.Router();
const { Prediction, validatePrediction } = require("../models/predictionModel");
const auth = require("../middleware/auth");
const validateObjectID = require("../middleware/validateObjectID");
const { Competition } = require("../models/competitionModel");

async function nameIsUnique(name, userID) {
  const predictionWithSameName = await Prediction.findOne({
    name: name,
    userID: { $ne: userID },
  }).select("name");
  if (predictionWithSameName)
    return "Bracket names must be unique. This name has been taken by another user. Please try another name.";
  return null;
}

router.post("/", [auth], async (req, res) => {
  req.body.userID = req.user._id;
  req.body.points = {
    group: 0,
    playoff: 0,
    misc: 0,
  };

  const ex = validatePrediction(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  const competition = await Competition.findById(req.body.competitionID);
  if (!competition) return res.status(404).send("Competition not found");
  if (competition.submissionDeadline < new Date())
    return res
      .status(400)
      .send("The submission deadline has passed. No submissions are allowed.");

  const predictions = await Prediction.find({
    competitionID: req.body.competitionID,
    userID: req.body.userID,
  }).select("name");
  if (predictions.length >= competition.maxSubmissions)
    return res
      .status(400)
      .send(
        `You have already submitted the maximum allowed brackets for this competition (${competition.maxSubmissions})`
      );
  if (predictions.some((p) => p.name === req.body.name))
    return res
      .status(400)
      .send(
        `You already have a bracket named ${req.body.name}. Please choose a different name.`
      );

  // verify that name is unique across enitre site
  const nameInUse = await nameIsUnique(req.body.name, req.user._id);
  if (nameInUse) return res.status(400).send(nameInUse);

  const newPrediction = new Prediction(req.body);
  await newPrediction.save();

  res.send(newPrediction._id);
});

router.put("/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.findById(req.params.id);
  if (!prediction) return res.status(404).send("Bracket not found");

  const competition = await Competition.findById(req.body.competitionID);
  if (!competition) return res.status(404).send("Competition not found");
  if (competition.submissionDeadline < new Date())
    return res
      .status(400)
      .send("The submission deadline has passed. No submissions are allowed.");

  req.body.userID = req.user._id;
  const predictions = await Prediction.find({
    competitionID: req.body.competitionID,
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

  // verify that name is unique across enitre site
  const nameInUse = await nameIsUnique(req.body.name, req.user._id);
  if (nameInUse) return res.status(400).send(nameInUse);

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
  const predictions = await Prediction.find({ userID: req.user._id })
    .select("competitionID name points")
    .populate("competitionID");
  res.send(predictions);
});

router.delete("/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.find({
    userID: req.user._id,
    _id: req.params.id,
  });
  if (!prediction) return res.status(404).send("Submission not found");
  const result = await Prediction.findByIdAndDelete(req.params.id);
  res.send(result);
});

module.exports = router;
