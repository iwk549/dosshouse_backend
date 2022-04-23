function calculatePrediction(prediction, result, competition) {
  let points = {
    group: { points: 0, correctPicks: 0 },
    playoff: { points: 0, correctPicks: 0 },
    champion: { points: 0, correctPicks: 0 },
    misc: { points: 0, correctPicks: 0 },
  };

  // group positioning
  if (
    competition.scoring.group &&
    result.group &&
    prediction.groupPredictions
  ) {
    prediction.groupPredictions.forEach((groupPrediction) => {
      let thisGroupPoints = 0;
      let thisGroupCorrectPicks = 0;
      const groupResult = result.group.find(
        (groupResult) => groupResult.groupName === groupPrediction.groupName
      );
      if (groupResult) {
        groupResult.teamOrder.forEach((resultTeam, idx) => {
          // add the per team point amount for each correctly placed team
          if (resultTeam === groupPrediction.teamOrder[idx]) {
            thisGroupPoints += competition.scoring.group.perTeam;
            thisGroupCorrectPicks++;
          }
        });

        // if max points were acheived for this group
        // meaning all teams were in the correct place, add the bonus points
        if (
          thisGroupPoints ===
          groupResult.teamOrder.length * competition.scoring.group.perTeam
        )
          thisGroupPoints += competition.scoring.group.bonus;
      }
      points.group = {
        points: points.group.points + thisGroupPoints,
        correctPicks: points.group.correctPicks + thisGroupCorrectPicks,
      };
    });
  }

  const addPointsAndPicks = (thisRoundScoring) => {
    points.playoff = {
      points: points.playoff.points + thisRoundScoring.points,
      correctPicks: points.playoff.correctPicks + 1,
    };
  };
  // playoff picks
  if (
    competition.scoring.playoff &&
    result.playoff &&
    prediction.playoffPredictions
  ) {
    result.playoff.forEach((playoffResult) => {
      const thisRoundPredictions = prediction.playoffPredictions.filter(
        (playoffPrediction) => playoffPrediction.round === playoffResult.round
      );
      const thisRoundScoring = competition.scoring.playoff.find(
        (c) => c.roundNumber === playoffResult.round
      );
      if (thisRoundScoring && thisRoundPredictions) {
        // match the result against each team in prediction
        // this will prevent a user from picking a single team
        // in multiple spots and getting points for each
        playoffResult.teams.forEach((t) => {
          const teamFound = thisRoundPredictions.find(
            (p) => p.homeTeam === t || p.awayTeam === t
          );
          if (teamFound) addPointsAndPicks(thisRoundScoring);
        });
      }
    });
  }

  // add winner as separate category
  if (result.misc?.winner && prediction.misc?.winner === result.misc.winner)
    points.champion = { points: competition.scoring.champion, correctPicks: 1 };

  // misc picks
  if (competition.miscPicks && result.misc && prediction.misc) {
    competition.miscPicks.forEach((miscPick) => {
      const predictionPick = prediction.misc[miscPick.name];
      if (predictionPick && predictionPick === result.misc[miscPick.name]) {
        points.misc = {
          points: points.misc.points + miscPick.points,
          correctPicks: points.misc.correctPicks + 1,
        };
      }
    });
  }

  // sum the total
  const totalPoints =
    points.group.points +
    points.playoff.points +
    points.champion.points +
    points.misc.points;

  // return {points, totalPoints} for bulkwrite
  return { points, totalPoints };
}

module.exports.calculatePrediction = calculatePrediction;
