const mongoose = require("mongoose");
const { Competition } = require("../../models/competition.model");
const { Prediction } = require("../../models/prediction.model");
const transactions = require("../../utils/transactions");
const { Result } = require("../../models/result.model");
const { User } = require("../../models/user.model");
const { deleteUserByID } = require("../../utils/users");

async function updateTeamName(req, res, next) {
  const competition = await Competition.findOne({ code: req.body.bracketCode });
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  if (!req.body.oldTeamName || !req.body.newTeamName)
    return next({
      status: 400,
      message: "Both old and new team name is required",
    });

  const newTeamName = String(req.body.newTeamName);

  const queries = {
    matches: {
      collection: "matches",
      query: "updateMany",
      data: {
        filter: {
          bracketCode: competition.code,
          $or: [
            { homeTeamName: req.body.oldTeamName },
            { awayTeamName: req.body.oldTeamName },
          ],
        },
        update: [
          {
            $set: {
              homeTeamName: {
                $cond: [
                  { $eq: ["$homeTeamName", req.body.oldTeamName] },
                  newTeamName,
                  "$homeTeamName",
                ],
              },
              awayTeamName: {
                $cond: [
                  { $eq: ["$awayTeamName", req.body.oldTeamName] },
                  newTeamName,
                  "$awayTeamName",
                ],
              },
            },
          },
        ],
      },
    },
  };

  const predictions = await Prediction.find({
    competitionID: competition._id,
  }).lean();

  let updatedPredictions = [];
  predictions.forEach((pred) => {
    pred.groupPredictions.forEach((g) => {
      g.teamOrder.forEach((t, idx) => {
        if (t === req.body.oldTeamName) g.teamOrder[idx] = newTeamName;
      });
    });

    pred.playoffPredictions.forEach((m) => {
      if (m.homeTeam === req.body.oldTeamName) m.homeTeam = newTeamName;
      if (m.awayTeam === req.body.oldTeamName) m.awayTeam = newTeamName;
    });

    if (pred.misc)
      Object.keys(pred.misc).forEach((k) => {
        if (pred.misc[k] === req.body.oldTeamName) pred.misc[k] = newTeamName;
      });

    updatedPredictions.push(pred);
  });

  if (updatedPredictions.length)
    queries.predictions = {
      collection: "predictions",
      query: "bulkWrite",
      data: updatedPredictions.map((u) => ({
        updateOne: {
          filter: { _id: mongoose.Types.ObjectId(u._id) },
          update: {
            $set: u,
          },
        },
      })),
    };

  const result = await Result.findOne({ code: competition.code }).lean();
  if (result) {
    result.group?.forEach((g) => {
      g.teamOrder.forEach((t, idx) => {
        if (t === req.body.oldTeamName) g.teamOrder[idx] = newTeamName;
      });
    });
    result.playoff?.forEach((r) => {
      r.teams.forEach((t, idx) => {
        if (t === req.body.oldTeamName) r.teams[idx] = newTeamName;
      });
    });
    if (result.misc)
      Object.keys(result.misc).forEach((k) => {
        if (result.misc[k] === req.body.oldTeamName)
          result.misc[k] = newTeamName;
      });

    queries.results = {
      collection: "results",
      query: "updateOne",
      data: {
        filter: { code: competition.code },
        update: { $set: result },
      },
    };
  }

  const results = await transactions.executeTransactionRepSet(queries);
  if (results.name)
    return next({
      status: 400,
      message:
        "Something went wrong, team name was not updated. Please try again.",
    });

  res.send(results);
}

async function getUsers(req, res) {
  const limit = !isNaN(Number(req.query.limit)) ? Number(req.query.limit) : 100;
  const page = !isNaN(Number(req.query.page)) ? Number(req.query.page) : 1;
  const skip = limit * (page - 1);

  const searchQuery = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const googleQuery =
    req.query.hasGoogleAccount !== undefined
      ? req.query.hasGoogleAccount === "true"
        ? { googleId: { $exists: true, $ne: null } }
        : { $or: [{ googleId: { $exists: false } }, { googleId: null }] }
      : {};

  const validSortFields = ["name", "email", "lastActive"];
  const sortField = validSortFields.includes(req.query.sort) ? req.query.sort : "name";
  const sortOrder = req.query.order === "desc" ? -1 : 1;

  const rawUsers = await User.find({ ...searchQuery, ...googleQuery })
    .select("name email lastActive googleId role")
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();
  const users = rawUsers.map(({ googleId, ...u }) => ({
    ...u,
    hasGoogleAccount: !!googleId,
  }));
  const count = await User.countDocuments({ ...searchQuery, ...googleQuery });

  res.send({ users, count });
}

async function deleteUser(req, res, next) {
  const user = await User.findById(req.params.id);
  if (!user) return res.send("Account Deleted");
  if (user.role === "admin")
    return next({ status: 403, message: "Cannot delete an admin account" });

  const results = await deleteUserByID(req.params.id);
  if (results.name)
    return next({
      status: 400,
      message:
        "Something went wrong, account was not deleted. Please try again.",
    });

  res.send(results);
}

module.exports = {
  updateTeamName,
  getUsers,
  deleteUser,
};
