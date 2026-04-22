const { default: mongoose } = require("mongoose");

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

module.exports = {
  deadlineHasPassed,
  leaderboardFilters,
  addPoints,
  removePoints,
};
