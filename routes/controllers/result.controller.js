const mongoose = require("mongoose");
const {
  calculatePrediction,
  addRanking,
  buildBracketTree,
} = require("../../utils/calculations");
const { calculateWhatIfPaths } = require("../../utils/whatIf");

const { Result, validateResult } = require("../../models/result.model");
const { WhatIfResult } = require("../../models/whatIfResult.model");
const { Prediction } = require("../../models/prediction.model");
const { Competition } = require("../../models/competition.model");
const { Match } = require("../../models/match.model");

const calculateAndPostSubmissions = async (competition, result) => {
  const allPredictions = await Prediction.find({
    competitionID: competition._id,
  });
  const matches = await Match.find({ bracketCode: competition.code });

  // Build tree and find final once — matches are the same for all predictions
  let tree = null;
  let final = null;
  matches.forEach((match) => {
    if (match.type !== "Playoff") return;
    if (!final || match.round > final.round) final = match;
  });
  if (final) tree = buildBracketTree(final.matchNumber, matches);

  let updatedPoints = [];
  allPredictions.forEach((p) => {
    const { points, totalPoints, totalPicks, potentialPoints } =
      calculatePrediction(p, result, competition, tree, final);
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
      }),
    ),
  );

  await calculateAndSaveWhatIf(
    competition,
    result,
    allPredictions,
    matches,
    tree,
  );
};

async function calculateAndSaveWhatIf(
  competition,
  result,
  predictions,
  matches,
  tree,
) {
  const paths = calculateWhatIfPaths(
    competition,
    result,
    predictions,
    matches,
    tree,
  );

  if (paths === null) {
    await WhatIfResult.deleteOne({ competitionCode: competition.code });
  } else {
    await WhatIfResult.updateOne(
      { competitionCode: competition.code },
      { competitionCode: competition.code, calculatedAt: new Date(), paths },
      { upsert: true },
    );
  }
}

async function updateResultsByCompetition(req, res, next) {
  const competition = await Competition.findOne({
    code: req.params.code,
  }).lean();
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
    await Competition.updateOne(
      { code: req.params.code },
      { lastCalculated: new Date() },
    );
  }

  res.send(update);
}

async function getResult(req, res, next) {
  const competition = await Competition.findById(req.params.id).lean();
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  const results = await Result.findOne({ code: competition.code }).lean();
  if (!results) return next({ status: 404, message: "Results not found" });

  res.send(results);
}

async function calculateCompetition(req, res, next) {
  const result = await Result.findOne({ code: req.params.code }).lean();
  const competition = await Competition.findOne({
    code: req.params.code,
  }).lean();
  if (!result) return next({ status: 404, message: "Result not found" });
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  await calculateAndPostSubmissions(competition, result);
  await Competition.updateOne(
    { code: req.params.code },
    { lastCalculated: new Date() },
  );

  res.send("ok");
}

async function getWhatIfResult(req, res, next) {
  const whatIf = await WhatIfResult.findOne({
    competitionCode: req.params.code,
  })
    .populate("paths.topSubmissions.predictionID", "name")
    .populate("paths.topSubmissions.userID", "name")
    .populate("paths.secondChanceTopSubmissions.predictionID", "name")
    .populate("paths.secondChanceTopSubmissions.userID", "name");
  if (!whatIf)
    return next({ status: 404, message: "What-if result not found" });
  res.send(whatIf);
}

module.exports = {
  updateResultsByCompetition,
  getResult,
  calculateCompetition,
  calculateAndPostSubmissions,
  getWhatIfResult,
};
