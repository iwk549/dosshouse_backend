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

function computeTeamEliminations(prediction, competition) {
  const { groupPredictions, playoffPredictions, misc } = prediction;
  const { scoring } = competition;

  const roundMap = {};
  let finalRound = 0;
  for (const r of scoring.playoff) {
    roundMap[r.roundNumber] = r.roundName;
    if (r.roundNumber > finalRound) finalRound = r.roundNumber;
  }

  const teamHighestRound = {};
  for (const match of playoffPredictions || []) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!team || team.startsWith("Winner")) continue;
      if (!teamHighestRound[team] || match.round > teamHighestRound[team]) {
        teamHighestRound[team] = match.round;
      }
    }
  }

  const eliminations = {};
  const playoffTeams = new Set(Object.keys(teamHighestRound));

  for (const [team, highestRound] of Object.entries(teamHighestRound)) {
    if (highestRound === finalRound) {
      eliminations[team] = misc?.winner === team ? "Winner" : "Runner-Up";
    } else {
      eliminations[team] = roundMap[highestRound] || `Round ${highestRound}`;
    }
  }

  if (misc?.thirdPlace && eliminations[misc.thirdPlace] !== undefined) {
    eliminations[misc.thirdPlace] = "Third Place";
  }

  for (const group of groupPredictions || []) {
    for (const team of group.teamOrder || []) {
      if (!playoffTeams.has(team)) {
        eliminations[team] = "Group Stage";
      }
    }
  }

  return eliminations;
}

module.exports = {
  deadlineHasPassed,
  leaderboardFilters,
  addPoints,
  removePoints,
  computeTeamEliminations,
};
