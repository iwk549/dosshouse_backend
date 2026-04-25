module.exports = [
  {
    // Active competition — group stage done, knockouts upcoming
    // 6 teams: 2 groups of 3, top 2 advance → SF/Final. No bonus picks.
    // Second chance is open now (group stage complete, bracket known).
    code: "devCupActive",
    name: "Dev Spring Cup",
    submissionDeadline: new Date("2026-04-01T12:00:00.000Z"),
    competitionStart: new Date("2026-04-05T13:00:00.000Z"),
    competitionEnd: new Date("2026-12-27T22:00:00.000Z"),
    maxSubmissions: 2,
    secondChance: {
      maxSubmissions: 1,
      availableFrom: new Date("2026-04-12T00:00:00.000Z"),
      submissionDeadline: new Date("2026-12-15T23:00:00.000Z"),
      competitionStart: new Date("2026-12-16T00:00:00.000Z"),
    },
    scoring: {
      group: { perTeam: 1, bonus: 1 },
      playoff: [
        { roundName: "Semi Final", roundNumber: 1, points: 8 },
        { roundName: "Final", roundNumber: 2, points: 16 },
      ],
      champion: 32,
    },
    miscPicks: [],
  },
  {
    // Finished competition — useful for browsing results, leaderboards, scoring
    code: "devCupPast",
    name: "Dev World Cup",
    submissionDeadline: new Date("2025-06-01T12:00:00.000Z"),
    competitionStart: new Date("2025-06-01T13:00:00.000Z"),
    competitionEnd: new Date("2025-07-15T20:00:00.000Z"),
    maxSubmissions: 2,
    // 4 groups (A-D), top 2 advance → QF/SF/Final
    scoring: {
      group: { perTeam: 1, bonus: 1 },
      playoff: [
        { roundName: "Quarter Final", roundNumber: 1, points: 4 },
        { roundName: "Semi Final", roundNumber: 2, points: 8 },
        { roundName: "Final", roundNumber: 3, points: 16 },
      ],
      champion: 32,
    },
    miscPicks: [
      {
        name: "thirdPlace",
        label: "Third Place",
        description: "Winner of the third place playoff",
        points: 16,
        info: {
          homeTeamGoals: 0,
          homeTeamPKs: 0,
          awayTeamGoals: 0,
          awayTeamPKs: 0,
          matchAccepted: false,
          homeTeamName: "Southfield (GER)",
          awayTeamName: "Ironport (USA)",
          dateTime: new Date("2025-07-12T15:00:00.000Z"),
          location: "South Arena",
          matchNumber: 32,
          round: 1001,
          sport: "Soccer",
          type: "Playoff",
          getTeamsFrom: { home: { matchNumber: 29 }, away: { matchNumber: 30 } },
        },
      },
      {
        name: "topScorer",
        label: "Top Goalscorer",
        description: "Player who scores the most goals in the tournament",
        points: 10,
      },
      {
        name: "discipline",
        label: "Worst Discipline",
        description: "Team with the most yellow and red cards",
        points: 10,
      },
    ],
    prize: { text: "Bragging rights (dev only)" },
  },
  {
    // Future competition — useful for testing submissions, bracket building
    // 24 teams: 6 groups (A-F), top 2 + best 4 third-place → R16/QF/SF/Final
    code: "devCupFuture",
    name: "Dev Euro Cup",
    submissionDeadline: new Date("2027-06-10T23:00:00.000Z"),
    competitionStart: new Date("2027-06-11T00:00:00.000Z"),
    competitionEnd: new Date("2027-07-18T21:00:00.000Z"),
    maxSubmissions: 2,
    scoring: {
      group: { perTeam: 1, bonus: 1 },
      playoff: [
        { roundName: "Round of 16", roundNumber: 1, points: 2 },
        { roundName: "Quarter Final", roundNumber: 2, points: 4 },
        { roundName: "Semi Final", roundNumber: 3, points: 8 },
        { roundName: "Final", roundNumber: 4, points: 16 },
      ],
      champion: 32,
    },
    miscPicks: [
      {
        name: "topScorer",
        label: "Top Goalscorer",
        description: "Player who scores the most goals in the tournament",
        points: 10,
      },
    ],
    // Best 4 of 6 third-place teams advance. Matrix maps the sorted string of
    // qualifying group letters → which group's 3rd-place fills each R16 slot.
    groupMatrix: [
      {
        key: "devCup3rdPlace",
        name: "Third Place Ranking",
        description: "The four third-placed teams with the best records advance to the Round of 16.",
        positionInGroup: 3,
        teamsToIncludeInBracket: 4,
        matrix: {
          // Match 137 away slot — 1st alphabetically of the 4 qualifying groups
          137: {
            ABCD: { groupName: "A", position: 3 }, ABCE: { groupName: "A", position: 3 },
            ABCF: { groupName: "A", position: 3 }, ABDE: { groupName: "A", position: 3 },
            ABDF: { groupName: "A", position: 3 }, ABEF: { groupName: "A", position: 3 },
            ACDE: { groupName: "A", position: 3 }, ACDF: { groupName: "A", position: 3 },
            ACEF: { groupName: "A", position: 3 }, ADEF: { groupName: "A", position: 3 },
            BCDE: { groupName: "B", position: 3 }, BCDF: { groupName: "B", position: 3 },
            BCEF: { groupName: "B", position: 3 }, BDEF: { groupName: "B", position: 3 },
            CDEF: { groupName: "C", position: 3 },
          },
          // Match 138 away slot — 2nd alphabetically
          138: {
            ABCD: { groupName: "B", position: 3 }, ABCE: { groupName: "B", position: 3 },
            ABCF: { groupName: "B", position: 3 }, ABDE: { groupName: "B", position: 3 },
            ABDF: { groupName: "B", position: 3 }, ABEF: { groupName: "B", position: 3 },
            ACDE: { groupName: "C", position: 3 }, ACDF: { groupName: "C", position: 3 },
            ACEF: { groupName: "C", position: 3 }, ADEF: { groupName: "D", position: 3 },
            BCDE: { groupName: "C", position: 3 }, BCDF: { groupName: "C", position: 3 },
            BCEF: { groupName: "C", position: 3 }, BDEF: { groupName: "D", position: 3 },
            CDEF: { groupName: "D", position: 3 },
          },
          // Match 143 home slot — 3rd alphabetically
          143: {
            ABCD: { groupName: "C", position: 3 }, ABCE: { groupName: "C", position: 3 },
            ABCF: { groupName: "C", position: 3 }, ABDE: { groupName: "D", position: 3 },
            ABDF: { groupName: "D", position: 3 }, ABEF: { groupName: "E", position: 3 },
            ACDE: { groupName: "D", position: 3 }, ACDF: { groupName: "D", position: 3 },
            ACEF: { groupName: "E", position: 3 }, ADEF: { groupName: "E", position: 3 },
            BCDE: { groupName: "D", position: 3 }, BCDF: { groupName: "D", position: 3 },
            BCEF: { groupName: "E", position: 3 }, BDEF: { groupName: "E", position: 3 },
            CDEF: { groupName: "E", position: 3 },
          },
          // Match 144 home slot — 4th alphabetically
          144: {
            ABCD: { groupName: "D", position: 3 }, ABCE: { groupName: "E", position: 3 },
            ABCF: { groupName: "F", position: 3 }, ABDE: { groupName: "E", position: 3 },
            ABDF: { groupName: "F", position: 3 }, ABEF: { groupName: "F", position: 3 },
            ACDE: { groupName: "E", position: 3 }, ACDF: { groupName: "F", position: 3 },
            ACEF: { groupName: "F", position: 3 }, ADEF: { groupName: "F", position: 3 },
            BCDE: { groupName: "E", position: 3 }, BCDF: { groupName: "F", position: 3 },
            BCEF: { groupName: "F", position: 3 }, BDEF: { groupName: "F", position: 3 },
            CDEF: { groupName: "F", position: 3 },
          },
        },
      },
    ],
  },
];
