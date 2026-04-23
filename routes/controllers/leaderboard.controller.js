const { default: mongoose } = require("mongoose");
const { Group } = require("../../models/group.model");
const { removeFieldsFromPopulatedUser } = require("../../utils/allowables");
const {
  deadlineHasPassed,
  leaderboardFilters,
} = require("../../utils/predictions");
const { Competition } = require("../../models/competition.model");
const { Prediction } = require("../../models/prediction.model");

async function getLeaderboardByGroup(req, res, next) {
  const competition = await Competition.findById(req.params.id);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

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
    potentialPoints: "$potentialPoints",
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
    "competitionID isSecondChance",
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
      selectedFields,
    );
  else predictionToSend = await Prediction.findById(req.params.id);

  res.send(predictionToSend);
}

async function getTeamEliminations(req, res, next) {
  const competition = await Competition.findById(req.params.id);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  if (!deadlineHasPassed(competition, req.query.secondChance === "true"))
    return next({
      status: 400,
      message: "Pick information hidden until submission deadline has passed",
    });

  if (
    req.params.groupID !== "all" &&
    !mongoose.Types.ObjectId.isValid(req.params.groupID)
  )
    return next({
      status: 400,
      message: `Group ID parameter must be "all" or a valid objectID`,
    });

  const { groupsQuery, secondChanceQuery } = leaderboardFilters(req);
  const team = req.params.team;

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
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: 1,
        userID: { name: "$user.name" },
        totalPoints: 1,
        eliminationRound: { $ifNull: [`$teamEliminations.${team}`, null] },
      },
    },
    { $sort: { totalPoints: -1 } },
  ]);

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
  getLeaderboardByGroup,
  searchLeaderboard,
  getNonUserPrediction,
  getPredictionsByMisc,
  getTeamEliminations,
};
