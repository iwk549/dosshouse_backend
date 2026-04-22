const defaultCompetition = {
  scoring: {
    playoff: [
      { roundNumber: 1, points: 2 },
      { roundNumber: 2, points: 4 },
      { roundNumber: 3, points: 8 },
      { roundNumber: 4, points: 16 },
    ],
    champion: 32,
  },
  miscPicks: [
    { name: "thirdPlace", points: 16 },
    { name: "discipline", points: 10 },
    { name: "topScorer", points: 10 },
  ],
  groupMatrix: [{ key: "thirdPlaceRank" }],
};

const defaultResult = {
  group: [{ groupName: "A", teamOrder: ["a", "b", "c", "d"] }],
  playoff: [{ round: 1, teams: ["a", "b", "c", "d"], points: 2 }],
  misc: { winner: "", thirdPlace: "", discipline: "", topScorer: "" },
  potentials: {
    realisticWinners: {
      topScorer: ["a", "c"],
      discipline: ["d"],
    },
  },
};

// Two-match bracket feeding into a final at round 2
const defaultMatches = [
  { matchNumber: 1, homeTeamName: "a", awayTeamName: "b", round: 1 },
  { matchNumber: 2, homeTeamName: "c", awayTeamName: "d", round: 1 },
  {
    matchNumber: 3,
    homeTeamName: "Winner 1",
    awayTeamName: "Winner 2",
    round: 2,
    getTeamsFrom: { home: { matchNumber: 1 }, away: { matchNumber: 2 } },
  },
];

// 3-round bracket with 8 QF teams: QF(r1) → SF(r2) → Final(r3)
// SF match 5 is fed by QF matches 1 (A/B) and 2 (C/D)
// SF match 6 is fed by QF matches 3 (E/F) and 4 (G/H)
const qfResult = {
  playoff: [{ round: 1, teams: ["A", "B", "C", "D", "E", "F", "G", "H"] }],
  misc: {},
};
const qfCompetition = {
  scoring: {
    playoff: [
      { roundNumber: 1, points: 2 },
      { roundNumber: 2, points: 4 },
      { roundNumber: 3, points: 8 },
    ],
  },
};
const qfMatches = [
  { matchNumber: 1, homeTeamName: "A", awayTeamName: "B", round: 1 },
  { matchNumber: 2, homeTeamName: "C", awayTeamName: "D", round: 1 },
  { matchNumber: 3, homeTeamName: "E", awayTeamName: "F", round: 1 },
  { matchNumber: 4, homeTeamName: "G", awayTeamName: "H", round: 1 },
  {
    matchNumber: 5,
    homeTeamName: "Winner 1",
    awayTeamName: "Winner 2",
    round: 2,
    getTeamsFrom: { home: { matchNumber: 1 }, away: { matchNumber: 2 } },
  },
  {
    matchNumber: 6,
    homeTeamName: "Winner 3",
    awayTeamName: "Winner 4",
    round: 2,
    getTeamsFrom: { home: { matchNumber: 3 }, away: { matchNumber: 4 } },
  },
  {
    matchNumber: 7,
    homeTeamName: "Winner 5",
    awayTeamName: "Winner 6",
    round: 3,
    getTeamsFrom: { home: { matchNumber: 5 }, away: { matchNumber: 6 } },
  },
];

// Simulates devCupActive: SFs pull from group positions (no matchNumber in getTeamsFrom).
// buildBracketTree gives SF nodes null children — getTeamsInSubtree must fall back to
// homeTeamName/awayTeamName to find reachable teams for the final pick.
const groupFedMatches = [
  {
    matchNumber: 1,
    homeTeamName: "Brazil",
    awayTeamName: "Spain",
    round: 1,
    type: "Playoff",
    getTeamsFrom: { home: { groupName: "A", position: 1 }, away: { groupName: "B", position: 2 } },
  },
  {
    matchNumber: 2,
    homeTeamName: "Argentina",
    awayTeamName: "France",
    round: 1,
    type: "Playoff",
    getTeamsFrom: { home: { groupName: "B", position: 1 }, away: { groupName: "A", position: 2 } },
  },
  {
    matchNumber: 3,
    homeTeamName: "Winner 1",
    awayTeamName: "Winner 2",
    round: 2,
    type: "Playoff",
    getTeamsFrom: { home: { matchNumber: 1 }, away: { matchNumber: 2 } },
  },
];
const groupFedResult = {
  playoff: [{ round: 1, teams: ["Brazil", "Spain", "Argentina", "France"] }],
  misc: { winner: "" },
};
const groupFedCompetition = {
  scoring: {
    playoff: [
      { roundNumber: 1, points: 8 },
      { roundNumber: 2, points: 16 },
    ],
    champion: 32,
  },
  miscPicks: [],
};

const potentialPointsTestCases = [
  {
    description: "No Playoff Results, do not calculate potential points",
    data: {
      prediction: {
        groupPredictions: [{ groupName: "A", teamOrder: ["a", "b"] }],
        playoffPredictions: [{ round: 1, homeTeam: "a", awayTeam: "b" }],
      },
      result: { group: [{ groupName: "A", teamOrder: ["a", "b"] }] },
      competition: { scoring: { group: { perTeam: 1 }, playoff: [{ roundNumber: 1, points: 4 }] } },
      matches: [],
    },
    expected: {
      totalPoints: 2,
      potentialPoints: { maximum: 0, realistic: 0 },
    },
  },
  {
    description: "Tournament is finished, potential points match total points",
    data: {
      prediction: { playoffPredictions: [{ round: 1, homeTeam: "a", awayTeam: "b" }] },
      result: { playoff: [{ round: 1, teams: ["a", "b"] }] },
      competition: { scoring: { playoff: [{ roundNumber: 1, points: 4 }] } },
      matches: [],
    },
    expected: {
      totalPoints: 8,
      potentialPoints: { maximum: 8, realistic: 8 },
    },
  },
  {
    description: "Potential points equal total points when no matches passed and tournament not finished",
    data: {
      prediction: {
        playoffPredictions: [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 1, homeTeam: "a", awayTeam: "c", round: 4 },
        ],
      },
      result: defaultResult,
      competition: defaultCompetition,
      matches: [],
    },
    expected: {
      totalPoints: 8,
      potentialPoints: { maximum: 8, realistic: 8 },
    },
  },
  {
    description: "Winner pick still in remaining teams adds champion points to both maximum and realistic",
    data: {
      prediction: {
        playoffPredictions: [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 1, homeTeam: "a", awayTeam: "c", round: 2 },
        ],
        misc: { winner: "a" },
      },
      result: defaultResult,
      competition: defaultCompetition,
      matches: [],
    },
    expected: {
      totalPoints: 8,
      potentialPoints: { maximum: 40, realistic: 40 },
    },
  },
  {
    description: "MiscPicks in remaining teams add to maximum only; realisticWinners add to realistic too",
    data: {
      prediction: {
        playoffPredictions: [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 1, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 1, homeTeam: "a", awayTeam: "c", round: 2 },
        ],
        misc: { topScorer: "b", discipline: "c", thirdPlace: "c" },
      },
      result: defaultResult,
      competition: defaultCompetition,
      matches: [],
    },
    expected: {
      totalPoints: 8,
      // topScorer "b" and discipline "c" are in remainingTeams but not realisticWinners
      potentialPoints: { maximum: 28, realistic: 8 },
    },
  },
  {
    description: "ThirdPlace pick adds to both maximum and realistic if pick is a semi-finalist still remaining",
    data: {
      prediction: {
        playoffPredictions: [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 2, homeTeam: "c", awayTeam: "d", round: 1 },
        ],
        misc: { thirdPlace: "b" },
      },
      result: defaultResult,
      competition: defaultCompetition,
      matches: defaultMatches,
    },
    expected: {
      totalPoints: 8,
      potentialPoints: { maximum: 24, realistic: 24 },
    },
  },
  {
    description: "ThirdPlace pick adds no points if pick is not a remaining team",
    data: {
      prediction: {
        playoffPredictions: [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 2, homeTeam: "c", awayTeam: "d", round: 1 },
        ],
        misc: { thirdPlace: "z" },
      },
      result: defaultResult,
      competition: defaultCompetition,
      matches: defaultMatches,
    },
    expected: {
      totalPoints: 8,
      potentialPoints: { maximum: 8, realistic: 8 },
    },
  },
  {
    description: "Predicted finalists from the same bracket half subtract one set of points (path collision)",
    data: {
      prediction: {
        playoffPredictions: [
          { matchNumber: 1, homeTeam: "a", awayTeam: "b", round: 1 },
          { matchNumber: 2, homeTeam: "c", awayTeam: "d", round: 1 },
          { matchNumber: 3, homeTeam: "c", awayTeam: "d", round: 2 },
        ],
      },
      result: defaultResult,
      competition: defaultCompetition,
      matches: defaultMatches,
    },
    expected: {
      totalPoints: 8,
      // c and d are both in the right subtree — collision deducts one set of points
      potentialPoints: { maximum: 12, realistic: 12 },
    },
  },
  {
    description: "At QF stage: predicting two teams from the same QF match in the SF collides — only one set of points awarded",
    data: {
      prediction: {
        // A and B both come from QF match 1 (left subtree of SF match 5)
        playoffPredictions: [{ matchNumber: 5, homeTeam: "A", awayTeam: "B", round: 2 }],
      },
      result: qfResult,
      competition: qfCompetition,
      matches: qfMatches,
    },
    expected: {
      totalPoints: 0,
      // A reachable (+4) + B reachable (+4) - collision (-4) = 4
      potentialPoints: { maximum: 4, realistic: 4 },
    },
  },
  {
    description: "At QF stage: predicting two teams from different QF matches in the SF has no collision — both sets of points awarded",
    data: {
      prediction: {
        // A comes from QF match 1 (left subtree), C comes from QF match 2 (right subtree)
        playoffPredictions: [{ matchNumber: 5, homeTeam: "A", awayTeam: "C", round: 2 }],
      },
      result: qfResult,
      competition: qfCompetition,
      matches: qfMatches,
    },
    expected: {
      totalPoints: 0,
      // A reachable (+4) + C reachable (+4) = 8
      potentialPoints: { maximum: 8, realistic: 8 },
    },
  },
  {
    description: "At QF stage: predicting A vs C in the final collides even though they don't meet at QF — both are in SF5's subtree so only one can reach the final",
    data: {
      prediction: {
        // A (match 1) and C (match 2) are in different QF matches but both feed into SF5
        // SF5 is the left child of the final — so A and C share the same half of the bracket
        playoffPredictions: [{ matchNumber: 7, homeTeam: "A", awayTeam: "C", round: 3 }],
      },
      result: qfResult,
      competition: qfCompetition,
      matches: qfMatches,
    },
    expected: {
      totalPoints: 0,
      // A reachable (+8) + C reachable (+8) - collision (-8) = 8
      potentialPoints: { maximum: 8, realistic: 8 },
    },
  },
  {
    description: "Group-position-fed SFs: finalist picks from opposite halves each earn final-round potential points",
    data: {
      prediction: {
        playoffPredictions: [{ matchNumber: 3, homeTeam: "Brazil", awayTeam: "Argentina", round: 2 }],
        misc: { winner: "Brazil" },
      },
      result: groupFedResult,
      competition: groupFedCompetition,
      matches: groupFedMatches,
    },
    expected: {
      totalPoints: 0,
      // Brazil reachable from left SF (+16) + Argentina reachable from right SF (+16)
      // + champion pick Brazil still in tournament (+32)
      potentialPoints: { maximum: 64, realistic: 64 },
    },
  },
  {
    description: "Group-position-fed SFs: two picks from the same SF half collide — only one set of final-round points awarded",
    data: {
      prediction: {
        playoffPredictions: [{ matchNumber: 3, homeTeam: "Brazil", awayTeam: "Spain", round: 2 }],
      },
      result: groupFedResult,
      competition: groupFedCompetition,
      matches: groupFedMatches,
    },
    expected: {
      totalPoints: 0,
      // Brazil (+16) + Spain (+16) - collision (both in left SF, -16) = 16
      potentialPoints: { maximum: 16, realistic: 16 },
    },
  },
];

module.exports = potentialPointsTestCases;
