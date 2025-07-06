const mongoose = require("mongoose");
const {
  Prediction,
  validatePrediction,
} = require("../../models/prediction.model");
const { Competition } = require("../../models/competition.model");
const { Group } = require("../../models/group.model");
const {
  max,
  removeFieldsFromPopulatedUser,
} = require("../../utils/allowables");

function addPoints(req) {
  req.body.points = {
    group: { points: 0, correctPicks: 0, bonus: 0 },
    playoff: { points: 0, correctPicks: 0 },
    champion: { points: 0, correctPicks: 0 },
    misc: { points: 0, correctPicks: 0 },
  };
  req.body.totalPoints = 0;
  req.body.totalPicks = 0;
  req.body.ranking = null;
  req.body.potentialPoints = {
    maximum: 0,
    realistic: 0,
  };
}

function removePoints(req) {
  delete req.body.points;
  delete req.body.totalPoints;
  delete req.body.totalPicks;
  delete req.body.ranking;
  delete req.body.potentialPoints;
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

function deadlineHasPassed(competition, isSecondChance) {
  return (
    (isSecondChance
      ? competition?.secondChance?.submissionDeadline
      : competition?.submissionDeadline) < new Date()
  );
}

function leaderboardFilters(req) {
  const groupsQuery =
    req.params.groupID.toLowerCase() === "all"
      ? {}
      : { groups: mongoose.Types.ObjectId(req.params.groupID) };
  const secondChanceQuery = {
    isSecondChance: req.query.secondChance === "true" || { $ne: true },
  };

  return { groupsQuery, secondChanceQuery };
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
      req.body.isSecondChance ? p.isSecondChance : !p.isSecondChance
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
    req.body.competitionID
  );
  if (nameInUse) return next({ status: 400, message: nameInUse });

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
        p.name === req.body.name && String(prediction._id) !== String(p._id)
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
    req.body.competitionID
  );
  if (nameInUse) return next({ status: 400, message: nameInUse });

  // add points and ranking to body for validation, they cannot be edited here so are removed after
  addPoints(req);
  const ex = validatePrediction(req.body);
  if (ex.error)
    return next({ status: 400, message: ex.error.details[0].message });
  removePoints(req);

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
      "competitionID name points totalPoints misc potentialPoints isSecondChance"
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

async function getLeaderboardByGroup(req, res, next) {
  const competition = await Competition.findById(req.params.id);
  if (!competition) next({ status: 404, message: "Competition not found" });

  let selectedFields =
    "name points totalPoints totalPicks ranking userID potentialPoints";
  if (deadlineHasPassed(competition, req.query.secondChance === "true"))
    selectedFields += " misc";

  if (
    req.params.groupID !== "all" &&
    !mongoose.Types.ObjectId.isValid(req.params.groupID)
  )
    return next({
      status: 400,
      message: `Group ID parameter must be "all" or a valid objectID`,
    });

  const { groupsQuery, secondChanceQuery } = leaderboardFilters(req);

  const limit = !isNaN(Number(req.params.resultsPerPage))
    ? Number(req.params.resultsPerPage)
    : 25;
  const pageNumber = !isNaN(Number(req.params.pageNumber))
    ? Number(req.params.pageNumber)
    : 1;
  const skip = limit * (pageNumber - 1);

  const predictions = await Prediction.find({
    competitionID: req.params.id,
    ...secondChanceQuery,
    ...groupsQuery,
  })
    .select(selectedFields)
    .populate("userID", removeFieldsFromPopulatedUser)
    .sort({ ranking: 1, name: 1 })
    .skip(skip)
    .limit(limit);
  const count = await Prediction.count({
    competitionID: req.params.id,
    ...groupsQuery,
    ...secondChanceQuery,
  });

  // do not remove _id from groupInfo ownerID, this is used client side to display remove button
  const groupInfo =
    req.params.groupID !== "all"
      ? await Group.findById(req.params.groupID)
          .select("name ownerID")
          .populate("ownerID", "name")
      : null;
  res.send({ predictions, count, groupInfo });
}

async function searchLeaderboard(req, res, next) {
  const competition = await Competition.findById(req.params.id);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  let projectedFields = {
    userID: { name: "$user.name" },
    _id: "$_id",
    name: "$name",
    points: "$points",
    totalPoints: "$totalPoints",
    totalPicks: "$totalPicks",
    ranking: "$ranking",
  };
  if (deadlineHasPassed(competition, req.query.secondChance === "true"))
    projectedFields.misc = "$misc";

  if (
    req.params.groupID !== "all" &&
    !mongoose.Types.ObjectId.isValid(req.params.groupID)
  )
    return next({
      status: 400,
      message: `Group ID parameter must be "all" or a valid objectID`,
    });

  const { groupsQuery, secondChanceQuery } = leaderboardFilters(req);
  const searchParamRegex = new RegExp(req.params.search, "i");

  // this pipeline will:
  // 1. search by competitionID and groupID
  // 2. populate the userID field (only with name)
  // 3. search by case insensitive search param in bracket name and user name
  const predictions = await Prediction.aggregate([
    {
      $match: {
        competitionID: mongoose.Types.ObjectId(req.params.id),
        ...secondChanceQuery,
        ...groupsQuery,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userID",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: projectedFields,
    },
    {
      $match: {
        $or: [
          { name: { $regex: searchParamRegex } },
          { "userID.name": { $regex: searchParamRegex } },
        ],
      },
    },
  ]);

  const groupInfo =
    req.params.groupID !== "all"
      ? await Group.findById(req.params.groupID)
          .select("name ownerID")
          .populate("ownerID", removeFieldsFromPopulatedUser)
      : null;

  res.send({ predictions, count: predictions.length, groupInfo });
}

async function getNonUserPrediction(req, res, next) {
  const prediction = await Prediction.findById(req.params.id).select(
    "competitionID isSecondChance"
  );
  if (!prediction)
    return next({ status: 404, message: "Prediction not found" });

  const competition = await Competition.findById(prediction.competitionID);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  let selectedFields;
  if (!deadlineHasPassed(competition, prediction.isSecondChance))
    selectedFields = "name points totalPoints userID";

  let predictionToSend;
  if (selectedFields)
    predictionToSend = await Prediction.findById(req.params.id).select(
      selectedFields
    );
  else predictionToSend = await Prediction.findById(req.params.id);

  res.send(predictionToSend);
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
    { $push: { groups: group._id } }
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
    { $pull: { groups: req.body._id } }
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
    { $pull: { groups: req.body._id } }
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

async function getPredictionsByMisc(req, res, next) {
  const predictions = await Prediction.find({
    competitionID: req.params.id,
    ["misc." + req.params.key]: req.params.team,
  })
    .populate("competitionID")
    .populate({ path: "userID", select: "name" });

  if (predictions[0] && !deadlineHasPassed(predictions[0].competitionID)) {
    return next({
      status: 400,
      message: "Pick information hidden until submission deadline has passed",
    });
  }
  res.send(predictions);
}

module.exports = {
  createNewPrediction,
  updatePrediction,
  getPrediction,
  getUsersPredictions,
  deletePrediction,
  getLeaderboardByGroup,
  searchLeaderboard,
  getNonUserPrediction,
  addPredictionToGroup,
  removePredictionFromGroup,
  removePredictionFromGroupByGroupOwner,
  getUsersPredictionsByCompetition,
  getPredictionsByMisc,
};
