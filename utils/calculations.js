function calculatePrediction(prediction, result, competition, tree, final) {
  let points = {
    group: { points: 0, correctPicks: 0, bonus: 0 },
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
      let thisGroupBonus = 0;
      const groupResult = result.group.find(
        (groupResult) => groupResult.groupName === groupPrediction.groupName,
      );
      if (!prediction.isSecondChance && groupResult) {
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
        if (
          thisGroupPoints ===
          groupResult.teamOrder.length * scoring.perTeam
        ) {
          thisGroupBonus += 1;
          thisGroupPoints += scoring.bonus || 0;
        }
      }
      points.group = {
        points: points.group.points + thisGroupPoints,
        correctPicks: points.group.correctPicks + thisGroupCorrectPicks,
        bonus: points.group.bonus + thisGroupBonus,
      };
    });
  }

  // playoff picks
  if (
    competition.scoring.playoff &&
    result.playoff &&
    prediction.playoffPredictions
  ) {
    result.playoff.forEach((playoffResult) => {
      if (prediction.isSecondChance && playoffResult.round === 1) {
        // skip this round for second chance brackets
        // these picks were prepopulated
      } else {
        const thisRoundPredictions = prediction.playoffPredictions.filter(
          (playoffPrediction) =>
            playoffPrediction.round === playoffResult.round,
        );
        const thisRoundScoring = competition.scoring.playoff.find(
          (c) => c.roundNumber === playoffResult.round,
        );
        if (thisRoundScoring && thisRoundPredictions) {
          // match the result against each team in prediction
          // this will prevent a user from picking a single team
          // in multiple spots and getting points for each
          playoffResult.teams.forEach((t) => {
            const teamFound = thisRoundPredictions.find(
              (p) => p.homeTeam === t || p.awayTeam === t,
            );
            if (teamFound) {
              points.playoff = {
                points: points.playoff.points + thisRoundScoring.points,
                correctPicks: points.playoff.correctPicks + 1,
              };
            }
          });
        }
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
        if (prediction.isSecondChance && miscPick.name !== "thirdPlace") {
          // do not add points for non third place picks
          // golden boot, worst discipline, etc are not awarded to second chance brackets
        } else {
          points.misc = {
            points: points.misc.points + miscPick.points,
            correctPicks: points.misc.correctPicks + 1,
          };
        }
      }
    });
  }

  // sum the total
  const totalPoints =
    points.group.points +
    points.playoff.points +
    points.champion.points +
    points.misc.points;
  const totalPicks =
    points.group.correctPicks +
    points.playoff.correctPicks +
    points.champion.correctPicks +
    points.misc.correctPicks;

  const potentialPoints = calculatePotentialPoints(
    prediction,
    result,
    competition,
    tree,
    final,
    totalPoints,
  );

  // return {points, totalPoints, totalPicks} for bulkwrite
  return { points, totalPoints, totalPicks, potentialPoints };
}

function buildBracketTree(matchNumber, matches) {
  const match = matches.find((m) => m.matchNumber === matchNumber);
  if (!match) return null;
  const node = { match };
  if (match.getTeamsFrom) {
    node.left = buildBracketTree(match.getTeamsFrom.home.matchNumber, matches);
    node.right = buildBracketTree(match.getTeamsFrom.away.matchNumber, matches);
  }
  return node;
}

function findNodeByMatchNumber(node, matchNumber) {
  if (!node) return null;
  if (node.match.matchNumber === matchNumber) return node;
  return (
    findNodeByMatchNumber(node.left, matchNumber) ||
    findNodeByMatchNumber(node.right, matchNumber)
  );
}

function getTeamsInSubtree(node, remainingTeams) {
  if (!node) return [];
  if (!node.match.getTeamsFrom) {
    return [node.match.homeTeamName, node.match.awayTeamName].filter((t) =>
      remainingTeams.includes(t),
    );
  }
  return [
    ...getTeamsInSubtree(node.left, remainingTeams),
    ...getTeamsInSubtree(node.right, remainingTeams),
  ];
}

function calculatePotentialPoints(
  prediction,
  result,
  competition,
  tree,
  final,
  totalPoints,
) {
  let maximum = totalPoints;
  let realistic = totalPoints;
  /* 
  if the final round has been entered in the results document
  then there are no more potential points to calculate,
  set them to equal total points
  */
  const latestResultRound = result.playoff?.length;
  const finalCompetitionRound = competition.scoring.playoff?.length;
  if (!latestResultRound) {
    maximum = 0;
    realistic = 0;
  } else if (
    latestResultRound < finalCompetitionRound &&
    competition.scoring.playoff &&
    result.playoff &&
    prediction.playoffPredictions
  ) {
    /*
    get the remaining teams from the result
    (latest playoff stage entered)
    if the prediction picked a winner that is in the remaining teams
    then those points are possible (realistic)
    */
    const remainingTeams = result.playoff[result.playoff.length - 1]?.teams;
    if (remainingTeams.includes(prediction.misc?.winner)) {
      maximum += competition.scoring.champion;
      realistic += competition.scoring.champion;
    }

    if (tree && final) {
      const completedRounds = new Set(result.playoff.map((r) => r.round));
      let potentialPlayoffPoints = 0;

      prediction.playoffPredictions.forEach((pred) => {
        if (completedRounds.has(pred.round)) return;

        const thisRoundPoints =
          competition.scoring.playoff.find((c) => c.roundNumber === pred.round)
            ?.points || 0;

        const node = findNodeByMatchNumber(tree, pred.matchNumber);
        if (!node || !node.left || !node.right) return;

        const leftTeams = getTeamsInSubtree(node.left, remainingTeams);
        const rightTeams = getTeamsInSubtree(node.right, remainingTeams);

        const homeInLeft = leftTeams.includes(pred.homeTeam);
        const homeInRight = rightTeams.includes(pred.homeTeam);
        const awayInLeft = leftTeams.includes(pred.awayTeam);
        const awayInRight = rightTeams.includes(pred.awayTeam);

        const homeReachable = homeInLeft || homeInRight;
        const awayReachable = awayInLeft || awayInRight;

        if (homeReachable) potentialPlayoffPoints += thisRoundPoints;
        if (awayReachable) potentialPlayoffPoints += thisRoundPoints;

        // if both teams are reachable but their paths collide in the same
        // subtree, one is guaranteed to eliminate the other before this round
        if (homeReachable && awayReachable) {
          const collision =
            (homeInLeft && awayInLeft) || (homeInRight && awayInRight);
          if (collision) potentialPlayoffPoints -= thisRoundPoints;
        }
      });

      maximum += potentialPlayoffPoints;
      realistic += potentialPlayoffPoints;

      // thirdPlace potential: a team can finish third if they lose in the semi-final
      // check if the prediction's thirdPlace pick is predicted for the semi-final
      // and is still a remaining team
      const thirdPlaceMiscPick = competition.miscPicks?.find(
        (m) => m.name === "thirdPlace",
      );
      const thirdPlacePick = prediction.misc?.thirdPlace;
      if (thirdPlaceMiscPick && thirdPlacePick) {
        const semiFinalPredictions = prediction.playoffPredictions.filter(
          (m) => m.round === final.round - 1,
        );
        const isThirdPlaceCandidate =
          remainingTeams.includes(thirdPlacePick) &&
          semiFinalPredictions.some(
            (m) =>
              m.homeTeam === thirdPlacePick || m.awayTeam === thirdPlacePick,
          );
        if (isThirdPlaceCandidate) {
          maximum += thirdPlaceMiscPick.points;
          realistic += thirdPlaceMiscPick.points;
        }
      }
    }
    // if the prediction picked a miscPick that is in the remaining teams
    // then those points are available but not yet realistic
    // if the miscPick is contained in the "realisticWinners" entry
    // within the result then those points should be added to realistic as well
    if (competition.miscPicks && result.misc && prediction.misc) {
      competition.miscPicks.forEach((miscPick) => {
        if (miscPick.name !== "thirdPlace") {
          const realisticWinners =
            (result.potentials?.realisticWinners &&
              result.potentials?.realisticWinners[miscPick.name]) ||
            [];
          const predictionPick = prediction.misc[miscPick.name];

          if (remainingTeams.includes(predictionPick))
            maximum += miscPick.points;
          if (realisticWinners.includes(predictionPick))
            realistic += miscPick.points;
        }
      });
    }
  }

  return { maximum, realistic };
}

function getDescendantProp(obj, desc) {
  var arr = desc.split(".");
  while (arr.length && (obj = obj[arr.shift()]));
  return obj;
}
const tiebreakers = [
  "totalPoints",
  "points.champion.correctPicks",
  "totalPicks",
  "points.playoff.points",
  "points.playoff.correctPicks",
  "points.group.points",
  "points.group.correctPicks",
  "points.group.bonus",
  "points.misc.points",
  "points.misc.correctPicks",
];

function addRanking(predictions) {
  predictions.sort((a, b) => {
    let value;
    for (let i = 0; i < tiebreakers.length; i++) {
      const aVal = getDescendantProp(a, tiebreakers[i]) || 0;
      const bVal = getDescendantProp(b, tiebreakers[i]) || 0;
      value = bVal - aVal;
      if (value !== 0) break;
    }
    return value;
  });

  let nextRanking = 1;
  const withRankings = predictions.map((p, idx) => {
    const prev = predictions[idx - 1];
    if (prev) {
      let value;
      for (let i = 0; i < tiebreakers.length; i++) {
        const aVal = getDescendantProp(p, tiebreakers[i]) || 0;
        const bVal = getDescendantProp(prev, tiebreakers[i]) || 0;
        value = bVal - aVal;
        if (value !== 0) break;
      }
      if (value) nextRanking = idx + 1;
    }

    return { ...p, ranking: nextRanking };
  });

  return withRankings;
}

module.exports.calculatePrediction = calculatePrediction;
module.exports.addRanking = addRanking;
module.exports.buildBracketTree = buildBracketTree;
