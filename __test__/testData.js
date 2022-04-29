const mongoose = require("mongoose");

const competitions = [
  {
    _id: mongoose.Types.ObjectId("6252ebe1d595c7d6a7a76ded"),
    code: "worldCup2022",
    name: "World Cup 2022",
    submissionDeadline: new Date("2022-11-20T16:00:00.000Z"),
    maxSubmissions: 2,
    competitionStart: new Date("2022-11-21T16:00:00.000Z"),
    competitionEnd: new Date("2022-12-18T18:00:00.000Z"),
    scoring: {
      group: {
        perTeam: 1,
        bonus: 1,
      },
      playoff: [
        {
          roundName: "Round of 16",
          roundNumber: 1,
          points: 2,
        },
        {
          roundName: "Quarter Final",
          roundNumber: 2,
          points: 4,
        },
        {
          roundName: "Semi Final",
          roundNumber: 3,
          points: 8,
        },
        {
          roundName: "Final",
          roundNumber: 4,
          points: 16,
        },
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
          homeTeamName: "Loser 61",
          awayTeamName: "Loser 62",
          dateTime: new Date("2022-12-17T15:00:00.000Z"),
          location: "Khalifa International Stadium",
          matchNumber: 63,
          round: 1001,
          sport: "Soccer",
          type: "Playoff",
          getTeamsFrom: {
            home: {
              matchNumber: 61,
            },
            away: {
              matchNumber: 62,
            },
          },
        },
      },
      {
        name: "discipline",
        label: "Worst Discipline",
        description:
          "Team with the worst disciplinary record at the end of the tournament (most yellow and red cards).",
        points: 10,
      },
      {
        name: "topScorer",
        label: "Top Goalscorer",
        description:
          "Team with the player who wins the golden boot for most goals in the tournament",
        points: 10,
      },
    ],
  },
  {
    _id: mongoose.Types.ObjectId("6252ebe1d595c7d6a7a76dee"),
    code: "marchMadness2022",
    name: "March Madness 2022",
    submissionDeadline: new Date("2022-03-16T16:00:00.000Z"),
    maxSubmissions: 2,
    competitionStart: new Date("2022-03-17T16:00:00.000Z"),
    competitionEnd: new Date("2022-04-06T18:00:00.000Z"),
    miscPicks: [],
  },
];

const matches = [
  {
    homeTeamGoals: 0,
    awayTeamGoals: 0,
    matchAccepted: false,
    homeTeamName: "Qatar",
    awayTeamName: "Ecuador",
    dateTime: new Date("2022-11-21T16:00:00.000Z"),
    location: "Al Bayt Stadium",
    matchNumber: 1,
    round: 1,
    sport: "Soccer",
    type: "Group",
    groupName: "A",
    bracketCode: "worldCup2022",
  },
  {
    homeTeamGoals: 0,
    awayTeamGoals: 0,
    matchAccepted: false,
    homeTeamName: "Senegal",
    awayTeamName: "Netherlands",
    dateTime: new Date("2022-11-21T10:00:00.000Z"),
    location: "Al Thumama Stadium",
    matchNumber: 2,
    round: 1,
    sport: "Soccer",
    type: "Group",
    groupName: "A",
    bracketCode: "worldCup2022",
  },
];

const results = [
  {
    code: "worldCup2022",
    group: [
      {
        groupName: "A",
        teamOrder: ["Senegal", "Netherlands", "Qatar", "Ecuador"],
      },
    ],
    playoff: [
      {
        round: 1,
        teams: ["Senegal", "Netherlands"],
        points: 2,
      },
      {
        round: 2,
        teams: ["Senegal", "Netherlands"],
        points: 4,
      },
    ],
    misc: {
      winner: "",
      thirdPlace: "",
      discipline: "",
      topScorer: "",
    },
  },
];

const predictions = [
  {
    // _id: mongoose.Types.ObjectId("625c5d445b889141af0a1180"),
    userID: mongoose.Types.ObjectId("6258255944fc63e5c20f212f"),
    name: "Ian's Bracket 2",
    competitionID: mongoose.Types.ObjectId("6252ebe1d595c7d6a7a76ded"),
    groupPredictions: [
      {
        groupName: "A",
        teamOrder: ["Senegal", "Netherlands", "Qatar", "Ecuador"],
      },
      {
        groupName: "B",
        teamOrder: [
          "England",
          "IR Iran",
          "United States",
          "Scotland/Wales/Ukraine",
        ],
      },
      {
        groupName: "C",
        teamOrder: ["Argentina", "Saudi Arabia", "Mexico", "Poland"],
      },
      {
        groupName: "D",
        teamOrder: ["Denmark", "Tunisia", "France", "Australia/Peru/UAE"],
      },
      {
        groupName: "E",
        teamOrder: ["Germany", "Japan", "Spain", "New Zealand/Costa Rica"],
      },
      {
        groupName: "F",
        teamOrder: ["Morocco", "Croatia", "Belgium", "Canada"],
      },
      {
        groupName: "G",
        teamOrder: ["Switzerland", "Cameroon", "Brazil", "Serbia"],
      },
      {
        groupName: "H",
        teamOrder: ["Uruguay", "South Korea", "Portugal", "Ghana"],
      },
    ],
    playoffPredictions: [
      { matchNumber: 49, homeTeam: "Senegal", awayTeam: "IR Iran", round: 1 },
      { matchNumber: 50, homeTeam: "Argentina", awayTeam: "Tunisia", round: 1 },
      {
        matchNumber: 51,
        homeTeam: "Denmark",
        awayTeam: "Saudi Arabia",
        round: 1,
      },
      {
        matchNumber: 52,
        homeTeam: "England",
        awayTeam: "Netherlands",
        round: 1,
      },
      { matchNumber: 53, homeTeam: "Germany", awayTeam: "Croatia", round: 1 },
      {
        matchNumber: 54,
        homeTeam: "Switzerland",
        awayTeam: "South Korea",
        round: 1,
      },
      { matchNumber: 55, homeTeam: "Morocco", awayTeam: "Japan", round: 1 },
      { matchNumber: 56, homeTeam: "Uruguay", awayTeam: "Cameroon", round: 1 },
      {
        matchNumber: 58,
        homeTeam: "Winner 53",
        awayTeam: "Winner 54",
        round: 2,
      },
      {
        matchNumber: 57,
        homeTeam: "Winner 49",
        awayTeam: "Winner 50",
        round: 2,
      },
      {
        matchNumber: 60,
        homeTeam: "Winner 55",
        awayTeam: "Winner 56",
        round: 2,
      },
      {
        matchNumber: 59,
        homeTeam: "Winner 51",
        awayTeam: "Winner 52",
        round: 2,
      },
      {
        matchNumber: 61,
        homeTeam: "Winner 57",
        awayTeam: "Winner 58",
        round: 3,
      },
      {
        matchNumber: 62,
        homeTeam: "Winner 59",
        awayTeam: "Winner 60",
        round: 3,
      },
      {
        matchNumber: 64,
        homeTeam: "Winner 61",
        awayTeam: "Winner 62",
        round: 4,
      },
    ],
    misc: { winner: "", discipline: "Brazil", topScorer: "Belgium" },
    points: {
      group: { points: 5, correctPicks: 4 },
      playoff: { points: 10, correctPicks: 5 },
      champion: { points: 0, correctPicks: 0 },
      misc: { points: 20, correctPicks: 2 },
    },
    totalPoints: 35,
  },
  {
    // _id: mongoose.Types.ObjectId("625c986e97cd69687c60f155"),
    userID: mongoose.Types.ObjectId("6258255944fc63e5c20f212f"),
    name: "Ian's Bracket",
    competitionID: mongoose.Types.ObjectId("6252ebe1d595c7d6a7a76ded"),
    groupPredictions: [
      {
        groupName: "A",
        teamOrder: ["Senegal", "Netherlands", "Qatar", "Ecuador"],
      },
      {
        groupName: "B",
        teamOrder: [
          "England",
          "IR Iran",
          "United States",
          "Scotland/Wales/Ukraine",
        ],
      },
      {
        groupName: "C",
        teamOrder: ["Argentina", "Saudi Arabia", "Mexico", "Poland"],
      },
      {
        groupName: "D",
        teamOrder: ["Denmark", "Tunisia", "France", "Australia/Peru/UAE"],
      },
      {
        groupName: "E",
        teamOrder: ["Germany", "Japan", "Spain", "New Zealand/Costa Rica"],
      },
      {
        groupName: "F",
        teamOrder: ["Morocco", "Croatia", "Belgium", "Canada"],
      },
      {
        groupName: "G",
        teamOrder: ["Switzerland", "Cameroon", "Brazil", "Serbia"],
      },
      {
        groupName: "H",
        teamOrder: ["Uruguay", "South Korea", "Portugal", "Ghana"],
      },
    ],
    playoffPredictions: [
      { matchNumber: 49, homeTeam: "Senegal", awayTeam: "IR Iran", round: 1 },
      { matchNumber: 50, homeTeam: "Argentina", awayTeam: "Tunisia", round: 1 },
      {
        matchNumber: 51,
        homeTeam: "Denmark",
        awayTeam: "Saudi Arabia",
        round: 1,
      },
      {
        matchNumber: 52,
        homeTeam: "England",
        awayTeam: "Netherlands",
        round: 1,
      },
      { matchNumber: 53, homeTeam: "Germany", awayTeam: "Croatia", round: 1 },
      {
        matchNumber: 54,
        homeTeam: "Switzerland",
        awayTeam: "South Korea",
        round: 1,
      },
      { matchNumber: 55, homeTeam: "Morocco", awayTeam: "Japan", round: 1 },
      { matchNumber: 56, homeTeam: "Uruguay", awayTeam: "Cameroon", round: 1 },
      {
        matchNumber: 58,
        homeTeam: "Germany",
        awayTeam: "South Korea",
        round: 2,
      },
      { matchNumber: 57, homeTeam: "Senegal", awayTeam: "Argentina", round: 2 },
      { matchNumber: 60, homeTeam: "Winner 55", awayTeam: "Uruguay", round: 2 },
      {
        matchNumber: 59,
        homeTeam: "Denmark",
        awayTeam: "Netherlands",
        round: 2,
      },
      { matchNumber: 61, homeTeam: "Argentina", awayTeam: "Germany", round: 3 },
      { matchNumber: 62, homeTeam: "Denmark", awayTeam: "Uruguay", round: 3 },
      { matchNumber: 64, homeTeam: "Argentina", awayTeam: "Denmark", round: 4 },
    ],
    misc: { winner: "Denmark" },
    points: {
      group: { points: 5, correctPicks: 4 },
      playoff: { points: 22, correctPicks: 8 },
      champion: { points: 32, correctPicks: 1 },
      misc: { points: 0, correctPicks: 0 },
    },
    totalPoints: 59,
  },
  {
    _id: mongoose.Types.ObjectId("625ca0f07dff1d62f3945ced"),
    userID: mongoose.Types.ObjectId("625ca0e97dff1d62f3945ce2"),
    name: "Billy's Bracket",
    competitionID: mongoose.Types.ObjectId("6252ebe1d595c7d6a7a76ded"),
    groupPredictions: [
      {
        groupName: "A",
        teamOrder: ["Qatar", "Netherlands", "Ecuador", "Senegal"],
      },
      {
        groupName: "B",
        teamOrder: [
          "England",
          "IR Iran",
          "United States",
          "Scotland/Wales/Ukraine",
        ],
      },
      {
        groupName: "C",
        teamOrder: ["Argentina", "Saudi Arabia", "Mexico", "Poland"],
      },
      {
        groupName: "D",
        teamOrder: ["Denmark", "Tunisia", "France", "Australia/Peru/UAE"],
      },
      {
        groupName: "E",
        teamOrder: ["Germany", "Japan", "Spain", "New Zealand/Costa Rica"],
      },
      {
        groupName: "F",
        teamOrder: ["Morocco", "Croatia", "Belgium", "Canada"],
      },
      {
        groupName: "G",
        teamOrder: ["Switzerland", "Cameroon", "Brazil", "Serbia"],
      },
      {
        groupName: "H",
        teamOrder: ["Uruguay", "South Korea", "Portugal", "Ghana"],
      },
    ],
    playoffPredictions: [
      { matchNumber: 49, homeTeam: "Qatar", awayTeam: "IR Iran", round: 1 },
      { matchNumber: 50, homeTeam: "Argentina", awayTeam: "Tunisia", round: 1 },
      {
        matchNumber: 51,
        homeTeam: "Denmark",
        awayTeam: "Saudi Arabia",
        round: 1,
      },
      {
        matchNumber: 52,
        homeTeam: "England",
        awayTeam: "Netherlands",
        round: 1,
      },
      { matchNumber: 53, homeTeam: "Germany", awayTeam: "Croatia", round: 1 },
      {
        matchNumber: 54,
        homeTeam: "Switzerland",
        awayTeam: "South Korea",
        round: 1,
      },
      { matchNumber: 55, homeTeam: "Morocco", awayTeam: "Japan", round: 1 },
      { matchNumber: 56, homeTeam: "Uruguay", awayTeam: "Cameroon", round: 1 },
      {
        matchNumber: 58,
        homeTeam: "Winner 53",
        awayTeam: "Winner 54",
        round: 2,
      },
      {
        matchNumber: 57,
        homeTeam: "Winner 49",
        awayTeam: "Winner 50",
        round: 2,
      },
      {
        matchNumber: 60,
        homeTeam: "Winner 55",
        awayTeam: "Winner 56",
        round: 2,
      },
      {
        matchNumber: 59,
        homeTeam: "Winner 51",
        awayTeam: "Winner 52",
        round: 2,
      },
      {
        matchNumber: 61,
        homeTeam: "Winner 57",
        awayTeam: "Winner 58",
        round: 3,
      },
      {
        matchNumber: 62,
        homeTeam: "Winner 59",
        awayTeam: "Winner 60",
        round: 3,
      },
      {
        matchNumber: 64,
        homeTeam: "Winner 61",
        awayTeam: "Winner 62",
        round: 4,
      },
    ],
    misc: { winner: "" },
    points: {
      group: { points: 1, correctPicks: 1 },
      playoff: { points: 8, correctPicks: 4 },
      champion: { points: 0, correctPicks: 0 },
      misc: { points: 0, correctPicks: 0 },
    },
    totalPoints: 9,
  },
  {
    _id: mongoose.Types.ObjectId("625ca0fd7dff1d62f3945cfb"),
    userID: mongoose.Types.ObjectId("625ca0e97dff1d62f3945ce2"),
    name: "Billy's Bracket 2",
    competitionID: mongoose.Types.ObjectId("6252ebe1d595c7d6a7a76ded"),
    groupPredictions: [
      {
        groupName: "A",
        teamOrder: ["Senegal", "Netherlands", "Qatar", "Ecuador"],
      },
      {
        groupName: "B",
        teamOrder: [
          "England",
          "IR Iran",
          "United States",
          "Scotland/Wales/Ukraine",
        ],
      },
      {
        groupName: "C",
        teamOrder: ["Argentina", "Saudi Arabia", "Mexico", "Poland"],
      },
      {
        groupName: "D",
        teamOrder: ["Denmark", "Tunisia", "France", "Australia/Peru/UAE"],
      },
      {
        groupName: "E",
        teamOrder: ["Germany", "Japan", "Spain", "New Zealand/Costa Rica"],
      },
      {
        groupName: "F",
        teamOrder: ["Morocco", "Croatia", "Belgium", "Canada"],
      },
      {
        groupName: "G",
        teamOrder: ["Switzerland", "Cameroon", "Brazil", "Serbia"],
      },
      {
        groupName: "H",
        teamOrder: ["Uruguay", "South Korea", "Portugal", "Ghana"],
      },
    ],
    playoffPredictions: [
      { matchNumber: 49, homeTeam: "Senegal", awayTeam: "IR Iran", round: 1 },
      { matchNumber: 50, homeTeam: "Argentina", awayTeam: "Tunisia", round: 1 },
      {
        matchNumber: 51,
        homeTeam: "Denmark",
        awayTeam: "Saudi Arabia",
        round: 1,
      },
      {
        matchNumber: 52,
        homeTeam: "England",
        awayTeam: "Netherlands",
        round: 1,
      },
      { matchNumber: 53, homeTeam: "Germany", awayTeam: "Croatia", round: 1 },
      {
        matchNumber: 54,
        homeTeam: "Switzerland",
        awayTeam: "South Korea",
        round: 1,
      },
      { matchNumber: 55, homeTeam: "Morocco", awayTeam: "Japan", round: 1 },
      { matchNumber: 56, homeTeam: "Uruguay", awayTeam: "Cameroon", round: 1 },
      {
        matchNumber: 58,
        homeTeam: "Winner 53",
        awayTeam: "Winner 54",
        round: 2,
      },
      {
        matchNumber: 57,
        homeTeam: "Winner 49",
        awayTeam: "Winner 50",
        round: 2,
      },
      {
        matchNumber: 60,
        homeTeam: "Winner 55",
        awayTeam: "Winner 56",
        round: 2,
      },
      { matchNumber: 59, homeTeam: "Denmark", awayTeam: "Winner 52", round: 2 },
      {
        matchNumber: 61,
        homeTeam: "Winner 57",
        awayTeam: "Winner 58",
        round: 3,
      },
      { matchNumber: 62, homeTeam: "Denmark", awayTeam: "Winner 60", round: 3 },
      { matchNumber: 64, homeTeam: "Winner 61", awayTeam: "Denmark", round: 4 },
    ],
    misc: { winner: "Denmark" },
    points: {
      group: { points: 5, correctPicks: 4 },
      playoff: { points: 10, correctPicks: 5 },
      champion: { points: 32, correctPicks: 1 },
      misc: { points: 0, correctPicks: 0 },
    },
    totalPoints: 0,
  },
];

const groups = [
  {
    // ownerID: mongoose.Types.ObjectId(),
    name: "Group 1",
    passcode: "passcode",
    // competitionID: mongoose.Types.ObjectId(),
  },
  {
    // ownerID: mongoose.Types.ObjectId(),
    name: "Group 2",
    passcode: "passcode",
    // competitionID: mongoose.Types.ObjectId(),
  },
];

const users = [
  {
    // _id: mongoose.Types.ObjectId(),
    name: "User 1",
    password: "Password1",
    email: "user1@dosshouse.test.us",
  },
  {
    // _id: mongoose.Types.ObjectId(),
    name: "User 2",
    password: "Password1",
    email: "user2@dosshouse.test.us",
  },
];

module.exports.competitions = competitions;
module.exports.matches = matches;
module.exports.results = results;
module.exports.predictions = predictions;
module.exports.groups = groups;
module.exports.users = users;
module.exports.header = "x-auth-token";
