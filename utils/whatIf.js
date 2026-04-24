const { calculatePrediction, addRanking } = require("./calculations");

const WHAT_IF_TOP_N = 5;

function getRoundsFromCompetition(competition) {
  const rounds = [...(competition?.scoring?.playoff || [])].sort(
    (a, b) => a.roundNumber - b.roundNumber,
  );
  const semiFinalRound = rounds[rounds.length - 2];
  const finalRound = rounds[rounds.length - 1];
  return { semiFinalRound, finalRound };
}

function getRoundFromResult(result, roundNumber) {
  if (!roundNumber) return null;
  const rounds = result?.playoff || [];
  return rounds.find((r) => r.round === roundNumber);
}

function mergeResultWithPath(realResult, newRoundResult) {
  const realRoundIndex = realResult.playoff.findIndex(
    (r) => r.round === newRoundResult.round,
  );
  const merged = [...realResult.playoff];
  merged.splice(realRoundIndex, 1, newRoundResult);
  return { ...realResult, playoff: merged };
}

function pushFinalPaths(
  paths,
  competition,
  synthResult,
  sf1Winner,
  sf2Winner,
  sf1Loser,
  sf2Loser,
) {
  const hasThirdPlace = competition?.miscPicks?.find(
    (mp) => mp.name === "thirdPlace",
  );
  const thirdPlaceResult = synthResult?.misc?.thirdPlace;
  for (const winner of [sf1Winner, sf2Winner]) {
    if (hasThirdPlace && !thirdPlaceResult) {
      for (const thirdPlace of [sf1Loser, sf2Loser]) {
        synthResult.misc = { ...synthResult.misc, thirdPlace, winner };
        paths.push({
          synthResult: { ...synthResult },
          sf1Winner,
          sf2Winner,
          champion: winner,
          thirdPlace,
        });
      }
    } else {
      synthResult.misc = { ...synthResult.misc, winner };
      paths.push({
        synthResult: { ...synthResult },
        sf1Winner,
        sf2Winner,
        champion: winner,
        thirdPlace: thirdPlaceResult || null,
      });
    }
  }
}

function scoreAndRankPaths(paths, predictions, competition, tree) {
  return paths.map((path) => {
    const scored = predictions.map((prediction) => {
      const { points, totalPoints, totalPicks } = calculatePrediction(
        prediction,
        path.synthResult,
        competition,
        tree,
      );
      return {
        _id: prediction._id,
        predictionID: prediction._id,
        userID: prediction.userID,
        name: prediction.name,
        isSecondChance: !!prediction.isSecondChance,
        points,
        totalPoints,
        totalPicks,
      };
    });

    const primary = addRanking(scored.filter((p) => !p.isSecondChance));
    const secondary = addRanking(scored.filter((p) => p.isSecondChance));

    const toEntry = (p) => ({
      rank: p.ranking,
      predictionID: p._id,
      userID: p.userID,
      name: p.name,
      totalPoints: p.totalPoints,
    });

    return {
      sf1Winner: path.sf1Winner,
      sf2Winner: path.sf2Winner,
      champion: path.champion,
      thirdPlace: path.thirdPlace,
      topSubmissions: primary.filter((p) => p.ranking <= WHAT_IF_TOP_N).map(toEntry),
      secondChanceTopSubmissions: secondary
        .filter((p) => p.ranking <= WHAT_IF_TOP_N)
        .map(toEntry),
    };
  });
}

function calculateWhatIfPaths(competition, result, predictions, matches, tree) {
  // setup: get rounds, results, etc
  const { semiFinalRound, finalRound } = getRoundsFromCompetition(competition);
  const semiFinalResult = getRoundFromResult(
    result,
    semiFinalRound?.roundNumber,
  );
  const finalResult = getRoundFromResult(result, finalRound?.roundNumber);

  // Null Case 1: Competition is Complete
  if (result?.misc?.winner) return null;

  // Null Case 2: Semi Final is not set
  if (semiFinalRound) {
    if (!semiFinalResult?.teams?.length) {
      return null;
    }
  } else {
    // Null Case 3: Competition does not have Semi Final, Final is not set
    if (!finalResult?.teams?.length) {
      return null;
    }
  }

  const semiFinalMatches = matches?.filter(
    (m) => m.type === "Playoff" && m.round === semiFinalRound?.roundNumber,
  );

  let paths = [];
  if (!finalResult?.teams?.length) {
    // Path 1: Both Semi Finals still to play
    const dummyFinalRoundResult = {
      round: finalRound?.roundNumber,
      teams: [],
    };
    if (!finalResult) {
      result.playoff.push(dummyFinalRoundResult);
    }
    const sf1 = semiFinalMatches[0];
    const sf2 = semiFinalMatches[1];
    for (const sf1Winner of [sf1.homeTeamName, sf1.awayTeamName]) {
      const sf1Loser =
        sf1Winner === sf1.homeTeamName ? sf1.awayTeamName : sf1.homeTeamName;

      for (const sf2Winner of [sf2.homeTeamName, sf2.awayTeamName]) {
        const sf2Loser =
          sf2Winner === sf2.homeTeamName ? sf2.awayTeamName : sf2.homeTeamName;
        const synthResult = mergeResultWithPath(result, {
          ...dummyFinalRoundResult,
          teams: [sf1Winner, sf2Winner],
        });
        pushFinalPaths(
          paths,
          competition,
          synthResult,
          sf1Winner,
          sf2Winner,
          sf1Loser,
          sf2Loser,
        );
      }
    }
  } else if (finalResult?.teams?.length === 1) {
    // Path 2: One Semi Final still to play
    const sf1Winner = finalResult.teams[0];
    const playedSemiFinalIndex = semiFinalMatches.findIndex(
      (m) => m.homeTeamName === sf1Winner || m.awayTeamName === sf1Winner,
    );
    const sf1 = semiFinalMatches[playedSemiFinalIndex];
    const sf1Loser =
      sf1.homeTeamName === sf1Winner ? sf1.awayTeamName : sf1.homeTeamName;
    const sf2 = semiFinalMatches[playedSemiFinalIndex === 0 ? 1 : 0];
    for (const sf2Winner of [sf2.homeTeamName, sf2.awayTeamName]) {
      const sf2Loser =
        sf2Winner === sf2.homeTeamName ? sf2.awayTeamName : sf2.homeTeamName;
      const synthResult = mergeResultWithPath(result, {
        ...finalResult,
        teams: [sf1Winner, sf2Winner],
      });
      pushFinalPaths(
        paths,
        competition,
        synthResult,
        sf1Winner,
        sf2Winner,
        sf1Loser,
        sf2Loser,
      );
    }
  } else if (finalResult?.teams?.length === 2) {
    // Path 3: Final left to play
    const sf1 = semiFinalMatches[0];
    const sf2 = semiFinalMatches[1];
    const [sf1Winner, sf2Winner] = finalResult.teams;
    const sf1Loser = finalResult.teams.includes(sf1.homeTeamName)
      ? sf1.awayTeamName
      : sf1.homeTeamName;
    const sf2Loser = finalResult.teams.includes(sf2.homeTeamName)
      ? sf2.awayTeamName
      : sf2.homeTeamName;
    pushFinalPaths(
      paths,
      competition,
      { ...result },
      sf1Winner,
      sf2Winner,
      sf1Loser,
      sf2Loser,
    );
  }

  const pathsWithScores = scoreAndRankPaths(
    paths,
    predictions,
    competition,
    tree,
  );

  return pathsWithScores;
}

module.exports.calculateWhatIfPaths = calculateWhatIfPaths;
