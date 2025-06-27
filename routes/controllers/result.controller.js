const mongoose = require("mongoose");
const { calculatePrediction, addRanking } = require("../../utils/calculations");

const { Result, validateResult } = require("../../models/result.model");
const { Prediction } = require("../../models/prediction.model");
const { Competition } = require("../../models/competition.model");
const { Match } = require("../../models/match.model");

const calculateAndPostSubmissions = async (competition, result) => {
  const allPredictions = await Prediction.find({
    competitionID: competition._id,
  });
  const matches = await Match.find({ bracketCode: competition.code });
  let updatedPoints = [];
  allPredictions.forEach((p) => {
    const { points, totalPoints, totalPicks, potentialPoints } =
      calculatePrediction(p, result, competition, matches);
    updatedPoints.push({
      _id: p._id,
      isSecondChance: p.isSecondChance,
      points,
      totalPoints,
      totalPicks,
      potentialPoints,
    });
  });

  // split second chance submissions into separate ranking order
  const primary = [];
  const secondary = [];
  updatedPoints.forEach((p) => {
    if (p.isSecondChance) secondary.push(p);
    else primary.push(p);
  });
  const predictionsWithRanking = addRanking(primary);
  const secondChancePredictionsWithRanking = addRanking(secondary);

  await Prediction.bulkWrite(
    [...predictionsWithRanking, ...secondChancePredictionsWithRanking].map(
      (u) => ({
        updateOne: {
          filter: { _id: mongoose.Types.ObjectId(u._id) },
          update: {
            $set: {
              points: u.points,
              totalPoints: u.totalPoints,
              totalPicks: u.totalPicks,
              ranking: u.ranking,
              potentialPoints: u.potentialPoints,
            },
          },
        },
      })
    )
  );
};

async function updateResultsByCompetition(req, res, next) {
  const competition = await Competition.findOne({ code: req.params.code });
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  const ex = validateResult(req.body);
  if (ex.error)
    return next({ status: 400, message: ex.error.details[0].message });

  const update = await Result.updateOne({ code: req.params.code }, req.body, {
    upsert: true,
  });

  if (req.query.calculate) {
    await calculateAndPostSubmissions(competition, req.body);
  }

  res.send(update);
}

async function getResult(req, res, next) {
  const competition = await Competition.findById(req.params.id);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  const results = await Result.findOne({ code: competition.code });
  if (!results) return next({ status: 404, message: "Results not found" });

  res.send(results);
}

async function calculateCompetition(req, res, next) {
  const result = await Result.findOne({ code: req.params.code });
  const competition = await Competition.findOne({ code: req.params.code });
  if (!result) return next({ status: 404, message: "Result not found" });
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  await calculateAndPostSubmissions(competition, result);

  res.send("ok");
}

module.exports = {
  updateResultsByCompetition,
  getResult,
  calculateCompetition,
};
