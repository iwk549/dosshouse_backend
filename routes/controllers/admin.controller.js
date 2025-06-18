const mongoose = require("mongoose");
const { Competition } = require("../../models/competition.model");
const { Prediction } = require("../../models/prediction.model");
const transactions = require("../../utils/transactions");
const { Result } = require("../../models/result.model");

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

module.exports = {
  updateTeamName,
};
