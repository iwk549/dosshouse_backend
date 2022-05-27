const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { Prediction, validatePrediction } = require("../models/predictionModel");
const auth = require("../middleware/auth");
const validateObjectID = require("../middleware/validateObjectID");
const { Competition } = require("../models/competitionModel");
const { Group } = require("../models/groupModel");
const { max, removeFieldsFromPopulatedUser } = require("../utils/allowables");

function addPoints(req) {
  req.body.points = {
    group: { points: 0, correctPicks: 0 },
    playoff: { points: 0, correctPicks: 0 },
    champion: { points: 0, correctPicks: 0 },
    misc: { points: 0, correctPicks: 0 },
  };
  req.body.totalPoints = 0;
  req.body.ranking = 0;
}

function removePoints(req) {
  delete req.body.points;
  delete req.body.totalPoints;
  delete req.body.ranking;
}

async function nameIsUnique(name, userID, competitionID) {
  const predictionWithSameName = await Prediction.findOne({
    name: name,
    userID: { $ne: userID },
    competitionID,
  }).select("name");
  if (predictionWithSameName)
    return "Prediction names must be unique. This name has been taken by another user. Please try a different name.";
  return null;
}

router.post("/", [auth], async (req, res) => {
  req.body.userID = req.user._id;
  addPoints(req);

  const ex = validatePrediction(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  const competition = await Competition.findById(req.body.competitionID);
  if (!competition) return res.status(404).send("Competition not found");
  if (competition.submissionDeadline < new Date())
    return res
      .status(400)
      .send(
        "The submission deadline has passed. No more submissions are allowed."
      );

  const predictions = await Prediction.find({
    competitionID: req.body.competitionID,
    userID: req.body.userID,
  }).select("name");
  if (predictions.length >= competition.maxSubmissions)
    return res
      .status(400)
      .send(
        `You have already submitted the maximum allowed predictions for this competition (${competition.maxSubmissions})`
      );
  if (predictions.some((p) => p.name === req.body.name))
    return res
      .status(400)
      .send(
        `You already have a prediction named ${req.body.name} in this competition. Please choose a different name.`
      );

  // verify that name is unique across entire site
  const nameInUse = await nameIsUnique(
    req.body.name,
    req.user._id,
    req.body.competitionID
  );
  if (nameInUse) return res.status(400).send(nameInUse);

  const newPrediction = new Prediction(req.body);
  await newPrediction.save();

  res.send(newPrediction._id);
});

router.put("/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    userID: req.user._id,
  });
  if (!prediction) return res.status(404).send("Prediction not found");

  const competition = await Competition.findById(req.body.competitionID);
  if (!competition) return res.status(404).send("Competition not found");
  if (competition.submissionDeadline < new Date())
    return res
      .status(400)
      .send("The submission deadline has passed. No more edits can be made.");

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
        `You already have a prediction named ${req.body.name}. Please choose a different name.`
      );

  // verify that name is unique across entire site
  const nameInUse = await nameIsUnique(
    req.body.name,
    req.user._id,
    req.body.competitionID
  );
  if (nameInUse) return res.status(400).send(nameInUse);

  // add points and ranking to body for validation, they cannot be edited here so are removed after
  addPoints(req);
  const ex = validatePrediction(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);
  removePoints(req);

  await Prediction.updateOne({ _id: req.params.id }, { $set: req.body });

  res.send(prediction._id);
});

router.get("/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    userID: req.user._id,
  });
  if (!prediction) return res.status(404).send("Prediction not found");
  res.send(prediction);
});

router.get("/", [auth], async (req, res) => {
  const predictions = await Prediction.find({ userID: req.user._id })
    .select("competitionID name points totalPoints")
    .populate("competitionID")
    .populate({
      path: "groups",
      select: "name ownerID",
      populate: { path: "ownerID", select: removeFieldsFromPopulatedUser },
    });
  res.send(predictions);
});

router.delete("/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.findOne({
    userID: req.user._id,
    _id: req.params.id,
  });
  if (!prediction) return res.status(404).send("Submission not found");
  const result = await Prediction.findByIdAndDelete(req.params.id);
  res.send(result);
});

router.get(
  "/leaderboard/:id/:resultsPerPage/:pageNumber/:groupID",
  [validateObjectID],
  async (req, res) => {
    const competition = await Competition.findById(req.params.id);
    if (!competition) return res.status(404).send("Competition not found");

    let selectedFields = "name points totalPoints ranking userID";
    if (competition.submissionDeadline < new Date()) selectedFields += " misc";

    if (
      req.params.groupID !== "all" &&
      !mongoose.Types.ObjectId.isValid(req.params.groupID)
    )
      return res
        .status(400)
        .send(`Group ID parameter must be "all" or a valid objectID`);

    // group query will only be set if groupID is passed
    const groupsQuery =
      req.params.groupID.toLowerCase() === "all"
        ? {}
        : { groups: mongoose.Types.ObjectId(req.params.groupID) };

    const limit = !isNaN(Number(req.params.resultsPerPage))
      ? Number(req.params.resultsPerPage)
      : 25;
    const pageNumber = !isNaN(Number(req.params.pageNumber))
      ? Number(req.params.pageNumber)
      : 1;
    const skip = limit * (pageNumber - 1);
    const predictions = await Prediction.find({
      competitionID: req.params.id,
      ...groupsQuery,
    })
      .select(selectedFields)
      .populate("userID", removeFieldsFromPopulatedUser)
      .sort({ totalPoints: -1 })
      .skip(skip)
      .limit(limit);
    const count = await Prediction.count({
      competitionID: req.params.id,
      ...groupsQuery,
    });
    const groupInfo =
      req.params.groupID !== "all"
        ? await Group.findById(req.params.groupID)
            .select("name ownerID")
            .populate("ownerID", removeFieldsFromPopulatedUser)
        : null;
    res.send({ predictions, count, groupInfo });
  }
);

router.get("/unowned/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.findById(req.params.id).select(
    "competitionID"
  );
  if (!prediction) return res.status(404).send("Prediction not found");

  const competition = await Competition.findById(prediction.competitionID);
  if (!competition) return res.status(404).send("Competition not found");

  let selectedFields;
  if (competition.submissionDeadline > new Date())
    selectedFields = "name points totalPoints userID";

  let predictionToSend;
  if (selectedFields)
    predictionToSend = await Prediction.findById(req.params.id).select(
      selectedFields
    );
  else predictionToSend = await Prediction.findById(req.params.id);

  res.send(predictionToSend);
});

router.put("/addtogroup/:id", [auth, validateObjectID], async (req, res) => {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    userID: req.user._id,
  });
  if (!prediction) return res.status(404).send("Prediction not found");
  if (prediction.groups.length >= max.groupsPerPrediction)
    return res
      .status(400)
      .send(
        `You have added the maximum number of groups for this prediction (${max.groupsPerPrediction}. Please make a new prediction or remove a group from this one to be able to add a new group.)`
      );

  const group = await Group.findOne({
    name: req.body.name,
    passcode: req.body.passcode,
  });
  if (!group)
    return res
      .status(404)
      .send("Group not found. Please double check the name and passcode");

  const result = await Prediction.updateOne(
    { _id: req.params.id },
    { $push: { groups: group._id } }
  );
  res.send(result);
});

router.put(
  "/removefromgroup/:id",
  [auth, validateObjectID],
  async (req, res) => {
    const prediction = await Prediction.findOne({
      _id: req.params.id,
      userID: req.user._id,
    });
    if (!prediction) return res.status(404).send("Prediction not found");

    const result = await Prediction.updateOne(
      { _id: req.params.id },
      { $pull: { groups: req.body._id } }
    );
    res.send(result);
  }
);

router.put(
  "/forceremovefromgroup/:id",
  [auth, validateObjectID],
  async (req, res) => {
    const prediction = await Prediction.findById(req.params.id);
    if (!prediction) return res.status(404).send("Prediction not found");
    const group = await Group.findById(req.body._id);
    if (!group) return res.status(404).send("Group not found");

    if (String(group.ownerID) !== String(req.user._id))
      return res
        .status(403)
        .send("Only the owner can force remove a prediction from a group");

    const result = await Prediction.updateOne(
      {
        _id: req.params.id,
      },
      { $pull: { groups: req.body._id } }
    );
    res.send(result);
  }
);

module.exports = router;
