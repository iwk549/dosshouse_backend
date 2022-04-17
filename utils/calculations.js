function calculatePrediction(prediction, result, competition) {
  let points = {
    group: 0,
    playoff: 0,
    champion: 0,
    misc: 0,
  };

  // group positioning
  if (competition.scoring.group) {
    prediction.groupPredictions.forEach((groupPrediction) => {
      let thisGroupPoints = 0;
      const groupResult = result.group.find(
        (groupResult) => groupResult.groupName === groupPrediction.groupName
      );
      if (groupResult) {
        groupResult.teamOrder.forEach((resultTeam, idx) => {
          // add the per team point amount for each correctly placed team
          if (resultTeam === groupPrediction.teamOrder[idx])
            thisGroupPoints += competition.scoring.group.perTeam;
        });

        // if max points were acheived for this group
        // meaning all teams were in the correct place, add the bonus points
        if (
          thisGroupPoints ===
          groupResult.teamOrder.length * competition.scoring.group.perTeam
        )
          thisGroupPoints += competition.scoring.group.bonus;
      }
      points.group = points.group + thisGroupPoints;
    });
  }

  // playoff picks
  if (competition.scoring.playoff) {
    result.playoff.forEach((playoffResult) => {
      const thisRoundPredictions = prediction.playoffPredictions.filter(
        (playoffPrediction) => playoffPrediction.round === playoffResult.round
      );
      const thisRoundScoring = competition.scoring.playoff.find(
        (c) => c.roundNumber === playoffResult.round
      );
      if (thisRoundScoring && thisRoundPredictions) {
        thisRoundPredictions.forEach((pred) => {
          if (playoffResult.teams.includes(pred.homeTeam)) {
            points.playoff = points.playoff + thisRoundScoring.points;
          }
          if (playoffResult.teams.includes(pred.awayTeam)) {
            points.playoff = points.playoff + thisRoundScoring.points;
          }
        });
      }
    });
  }

  // add winner as separate category
  if (result.misc.winner && prediction.misc.winner === result.misc.winner)
    points.champion = competition.scoring.champion;

  // misc picks
  if (competition.miscPicks) {
    competition.miscPicks.forEach((miscPick) => {
      const predictionPick = prediction.misc[miscPick.name];
      if (predictionPick && predictionPick === result.misc[miscPick.name]) {
        points.misc = points.misc + miscPick.points;
      }
    });
  }

  // sum the total
  const totalPoints =
    points.group + points.playoff + points.champion + points.misc;

  // return {points, totalPoints} for bulkwrite
  return { points, totalPoints };
}

module.exports.calculatePrediction = calculatePrediction;
