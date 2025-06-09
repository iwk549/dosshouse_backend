function calculatePrediction(prediction, result, competition, matches) {
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
        // find if this group is part of a matrix
        const groupMatrix =
          competition.groupMatrix?.length &&
          competition.groupMatrix.find((g) => g.key === groupResult.groupName);
        const scoring =
          (groupMatrix && groupMatrix.scoring) || competition.scoring.group;
        groupResult.teamOrder.forEach((resultTeam, idx) => {
          // if part of groupMatrix need to check against group name
          const checkAgainst = groupMatrix
            ? groupPrediction.teamOrder[idx]?.split(":")[0]
            : groupPrediction.teamOrder[idx];
          // add the per team point amount for each correctly placed team
          if (resultTeam === checkAgainst) {
            thisGroupPoints += scoring.perTeam;
            thisGroupCorrectPicks++;
          }
        });

        // if max points were acheived for this group
        // meaning all teams were in the correct place, add the bonus points
        if (thisGroupPoints === groupResult.teamOrder.length * scoring.perTeam)
          thisGroupPoints += scoring.bonus;
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
      if (
        predictionPick &&
        result.misc[miscPick.name].includes(predictionPick)
      ) {
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

  // find potential points possible
  let potentialPoints;
  let maximum = totalPoints;
  let realistic = totalPoints;
  const remainingTeams = result.playoff[result.playoff.length - 1].teams;
  // if the final round has been entered in the results document then there are no more potential points to calculate, set them to equal total points
  if (
    result.playoff &&
    prediction?.playoffPredictions &&
    result.playoff[result.playoff.length - 1] ===
      prediction.playoffPredictions[prediction.playoffPredictions.length - 1]
        .round
  ) {
    // do nothing, the competition is in the final round
  } else if (
    competition.scoring.playoff &&
    result.playoff &&
    prediction.playoffPredictions
  ) {
    // get the remaining teams from the result (latest playoff stage entered)
    // if the prediction picked a winner that is in the remaining teams then those points are possible (realistic)
    if (remainingTeams.includes(prediction.misc?.winner)) {
      maximum += competition.scoring.champion;
      realistic += competition.scoring.champion;
    }

    if (matches && matches.length > 0) {
      // if matches were passed then we can figure out which playoff teams have potential to reach the next round
      // must map backwards from final to see which teams are possible
      let highestRound = 0;
      let final;
      matches.forEach((match) => {
        if (highestRound < match.round) {
          highestRound = match.round;
          final = match;
        }
      });
      if (final) {
        // give finalist points to each semi final containing a finalist
        const thisRoundPoints =
          competition.scoring.playoff.find((c) => c.roundNumber === final.round)
            ?.points || 0;
        let finalistPoints = 0;
        prediction.playoffPredictions.forEach((m) => {
          if (m.round === final.round) {
            const finalists = [m.homeTeam, m.awayTeam];
            if (remainingTeams.includes(m.homeTeam)) {
              finalistPoints += thisRoundPoints;
            }
            if (remainingTeams.includes(m.awayTeam)) {
              finalistPoints += thisRoundPoints;
            }
            const previousMatchResult1 = matches.find(
              (m) => m.matchNumber === final.getTeamsFrom.home.matchNumber
            );
            const previousMatchResult2 = matches.find(
              (m) => m.matchNumber === final.getTeamsFrom.away.matchNumber
            );
            if (
              finalists.includes(previousMatchResult1.homeTeamName) &&
              finalists.includes(previousMatchResult1.awayTeamName)
            )
              finalistPoints -= thisRoundPoints;
            if (
              finalists.includes(previousMatchResult2.homeTeamName) &&
              finalists.includes(previousMatchResult2.awayTeamName)
            )
              finalistPoints -= thisRoundPoints;
          }
        });
        maximum += finalistPoints;
        realistic += finalistPoints;
      }
    }
    // if the prediction picked a miscPick that is in the remaining teams then those points are available but not realistic
    // for third place they are not available
    // if the miscPick is contained in the "realisticWinners" entry within the result then those points should be added to both
    if (competition.miscPicks && result.misc && prediction.misc) {
      competition.miscPicks.forEach((miscPick) => {
        const realisticWinners =
          (result.potentials?.realisticWinners &&
            result.potentials?.realisticWinners[miscPick.name]) ||
          [];
        const predictionPick = prediction.misc[miscPick.name];

        if (
          remainingTeams.includes(predictionPick) &&
          miscPick.name !== "thirdPlace"
        )
          maximum += miscPick.points;
        if (realisticWinners.includes(predictionPick)) {
          realistic += miscPick.points;
          if (miscPick.name === "thirdPlace") maximum += miscPick.points;
        }
      });
    }
  }

  potentialPoints = {
    maximum,
    realistic,
  };

  // return {points, totalPoints} for bulkwrite
  return { points, totalPoints, potentialPoints };
}

function addRanking(predictions) {
  predictions.sort((a, b) => b.totalPoints - a.totalPoints);
  let nextRanking = 0;
  const addRanking = predictions.map((p, idx) => {
    if (
      !predictions[idx - 1] ||
      predictions[idx - 1].totalPoints !== p.totalPoints
    )
      nextRanking = idx + 1;

    return { ...p, ranking: nextRanking };
  });
  return addRanking;
}

module.exports.calculatePrediction = calculatePrediction;
module.exports.addRanking = addRanking;
