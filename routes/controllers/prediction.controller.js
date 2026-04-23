const {
  Prediction,
  validatePrediction,
} = require("../../models/prediction.model");
const { Competition } = require("../../models/competition.model");
const { Group } = require("../../models/group.model");
const { max } = require("../../utils/allowables");
const {
  deadlineHasPassed,
  addPoints,
  removePoints,
  computeTeamEliminations,
} = require("../../utils/predictions");

function sanitizeSecondChancePrediction(body) {
  body.groupPredictions = [];
  if (body.misc) {
    const { winner, thirdPlace } = body.misc;
    body.misc = {};
    if (winner !== undefined) body.misc.winner = winner;
    if (thirdPlace !== undefined) body.misc.thirdPlace = thirdPlace;
  }
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

async function createNewPrediction(req, res, next) {
  req.body.userID = req.user._id;
  addPoints(req);

  const ex = validatePrediction(req.body);
  if (ex.error)
    return next({ status: 400, message: ex.error.details[0].message });

  const competition = await Competition.findById(req.body.competitionID);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  if (req.body.isSecondChance && !competition.secondChance)
    return next({
      status: 400,
      message: "This competition does not allow for second chance entries",
    });

  if (deadlineHasPassed(competition, req.body.isSecondChance))
    return next({
      status: 400,
      message:
        "The submission deadline has passed. No more submissions are allowed.",
    });

  const predictions = await Prediction.find({
    competitionID: req.body.competitionID,
    userID: req.body.userID,
  }).select("name isSecondChance");
  if (
    predictions.filter((p) =>
      req.body.isSecondChance ? p.isSecondChance : !p.isSecondChance,
    ).length >= competition.maxSubmissions
  )
    return next({
      status: 400,
      message: `You have already submitted the maximum allowed predictions for this competition (${competition.maxSubmissions})`,
    });

  if (predictions.some((p) => p.name === req.body.name))
    return next({
      status: 400,
      message: `You already have a prediction named ${req.body.name} in this competition. Please choose a different name.`,
    });

  // verify that name is unique across entire site
  const nameInUse = await nameIsUnique(
    req.body.name,
    req.user._id,
    req.body.competitionID,
  );
  if (nameInUse) return next({ status: 400, message: nameInUse });

  if (req.body.isSecondChance) sanitizeSecondChancePrediction(req.body);

  req.body.teamEliminations = computeTeamEliminations(req.body, competition);

  const newPrediction = new Prediction(req.body);
  await newPrediction.save();

  res.send(newPrediction._id);
}

async function updatePrediction(req, res, next) {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    userID: req.user._id,
  });
  if (!prediction)
    return next({ status: 404, message: "Prediction not found" });

  const competition = await Competition.findById(req.body.competitionID);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });
  if (deadlineHasPassed(competition, prediction.isSecondChance))
    return next({
      status: 400,
      message: "The submission deadline has passed. No more edits can be made.",
    });

  req.body.userID = req.user._id;
  const predictions = await Prediction.find({
    competitionID: req.body.competitionID,
    userID: req.body.userID,
  }).select("name");
  if (
    predictions.some(
      (p) =>
        p.name === req.body.name && String(prediction._id) !== String(p._id),
    )
  )
    return next({
      status: 400,
      message: `You already have a prediction named ${req.body.name}. Please choose a different name.`,
    });

  // verify that name is unique across entire site
  const nameInUse = await nameIsUnique(
    req.body.name,
    req.user._id,
    req.body.competitionID,
  );
  if (nameInUse) return next({ status: 400, message: nameInUse });

  // add points and ranking to body for validation, they cannot be edited here so are removed after
  addPoints(req);
  const ex = validatePrediction(req.body);
  if (ex.error)
    return next({ status: 400, message: ex.error.details[0].message });
  removePoints(req);

  if (prediction.isSecondChance) sanitizeSecondChancePrediction(req.body);

  req.body.teamEliminations = computeTeamEliminations(req.body, competition);

  await Prediction.updateOne({ _id: req.params.id }, { $set: req.body });

  res.send(prediction._id);
}

async function getPrediction(req, res, next) {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    userID: req.user._id,
  });
  if (!prediction)
    return next({ status: 404, message: "Prediction not found" });
  res.send(prediction);
}

async function getUsersPredictions(req, res) {
  const predictions = await Prediction.find({ userID: req.user._id })
    .select(
      "competitionID name points totalPoints misc potentialPoints isSecondChance",
    )
    .populate("competitionID")
    .populate({
      path: "groups",
      select: "name ownerID",
      populate: { path: "ownerID", select: "name" },
    });
  res.send(predictions);
}

async function deletePrediction(req, res, next) {
  const prediction = await Prediction.findOne({
    userID: req.user._id,
    _id: req.params.id,
  }).populate("competitionID");
  if (!prediction)
    return next({ status: 404, message: "Submission not found" });

  if (deadlineHasPassed(prediction.competitionID, prediction.isSecondChance))
    return next({
      status: 400,
      message:
        "The submission deadline has passed, you cannot delete this submission",
    });

  const result = await Prediction.deleteOne({
    userID: req.user._id,
    _id: req.params.id,
  });
  res.send(result);
}

async function addPredictionToGroup(req, res, next) {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    userID: req.user._id,
  });
  if (!prediction)
    return next({ status: 404, message: "Prediction not found" });

  if (prediction.isSecondChance) {
    return next({
      status: 400,
      message: "Second chance predictions cannot be added to groups",
    });
  }

  if (prediction.groups.length >= max.groupsPerPrediction)
    return next({
      status: 400,
      message: `You have added the maximum number of groups for this prediction (${max.groupsPerPrediction}. Please make a new prediction or remove a group from this one to be able to add a new group.`,
    });

  const group = await Group.findOne({
    lowercaseName: req.body.name?.toLowerCase() || "",
    passcode: req.body.passcode,
  });
  if (!group)
    return next({
      status: 404,
      message: `Group not found. Please double check ${
        req.body.fromUrl ? "your link" : "the name and passcode"
      }`,
    });

  // check if this prediction already belongs to this group
  if (prediction.groups.includes(group._id))
    return next({
      status: 404,
      message: "This prediction is already a member of the requested group",
    });
  await Prediction.updateOne(
    { _id: req.params.id },
    { $push: { groups: group._id } },
  );
  res.send(group._id);
}

async function removePredictionFromGroup(req, res, next) {
  const prediction = await Prediction.findOne({
    _id: req.params.id,
    userID: req.user._id,
  });
  if (!prediction)
    return next({ status: 404, message: "Prediction not found" });

  const result = await Prediction.updateOne(
    { _id: req.params.id },
    { $pull: { groups: req.body._id } },
  );
  res.send(result);
}

async function removePredictionFromGroupByGroupOwner(req, res, next) {
  const prediction = await Prediction.findById(req.params.id);
  if (!prediction)
    return next({ status: 404, message: "Prediction not found" });
  const group = await Group.findById(req.body._id);
  if (!group) return next({ status: 404, message: "Group not found" });

  if (String(group.ownerID) !== String(req.user._id))
    return next({
      status: 403,
      message: "Only the owner can force remove a prediction from a group",
    });

  const result = await Prediction.updateOne(
    {
      _id: req.params.id,
    },
    { $pull: { groups: req.body._id } },
  );
  res.send(result);
}

async function getUsersPredictionsByCompetition(req, res) {
  const predictions = await Prediction.find({
    userID: req.user._id,
    competitionID: req.params.id,
  });
  res.send(predictions);
}

module.exports = {
  createNewPrediction,
  updatePrediction,
  getPrediction,
  getUsersPredictions,
  deletePrediction,
  addPredictionToGroup,
  removePredictionFromGroup,
  removePredictionFromGroupByGroupOwner,
  getUsersPredictionsByCompetition,
};
