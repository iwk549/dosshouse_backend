// devCupPast predictions — 2 users × 2 brackets each
// devCupActive predictions — 1 per user (group stage done, knockouts pending)
// devCupFuture predictions — 1 per user (no results yet, all zeroed)
// Actual results: A[Northland,Southfield,Eastbrook,Westmore] B[Redville,Blueton,Greenham,Yellowshore]
//                 C[Ironport,Goldfield,Bronzewick,Silverdale] D[Moonhaven,Suncrest,Starfall,Skyreach]
// QF: Northland,Blueton,Redville,Southfield,Ironport,Suncrest,Moonhaven,Goldfield
// SF: Northland,Southfield,Ironport,Moonhaven  Final: Northland,Moonhaven  Winner: Northland
// topScorer: "Northland (ENG)"  discipline: "Redville (ARG)"

const gA = ["Northland (ENG)",  "Southfield (GER)", "Eastbrook (FRA)",  "Westmore (ESP)"];
const gB = ["Redville (ARG)",   "Blueton (BRA)",    "Greenham (ITA)",   "Yellowshore (POR)"];
const gC = ["Ironport (USA)",   "Goldfield (MEX)",  "Bronzewick (AUT)", "Silverdale (RSA)"];
const gD = ["Moonhaven (JAP)",  "Suncrest (KOR)",   "Starfall (MOR)",   "Skyreach (SAU)"];

module.exports = [
  {
    // Perfect bracket — all groups correct, correct QF/SF/Final, correct winner + misc
    // group:20 playoff:96 champion:32 misc:20  total:168
    userEmail: "test1@test.com",
    competitionCode: "devCupPast",
    name: "All Favourites",
    groupPredictions: [
      { groupName: "A", teamOrder: gA },
      { groupName: "B", teamOrder: gB },
      { groupName: "C", teamOrder: gC },
      { groupName: "D", teamOrder: gD },
    ],
    playoffPredictions: [
      { matchNumber: 25, homeTeam: "Northland (ENG)",  awayTeam: "Blueton (BRA)",    round: 1 },
      { matchNumber: 26, homeTeam: "Redville (ARG)",   awayTeam: "Southfield (GER)", round: 1 },
      { matchNumber: 27, homeTeam: "Ironport (USA)",   awayTeam: "Suncrest (KOR)",   round: 1 },
      { matchNumber: 28, homeTeam: "Moonhaven (JAP)",  awayTeam: "Goldfield (MEX)",  round: 1 },
      { matchNumber: 29, homeTeam: "Northland (ENG)",  awayTeam: "Southfield (GER)", round: 2 },
      { matchNumber: 30, homeTeam: "Ironport (USA)",   awayTeam: "Moonhaven (JAP)",  round: 2 },
      { matchNumber: 31, homeTeam: "Northland (ENG)",  awayTeam: "Moonhaven (JAP)",  round: 3 },
    ],
    misc: { winner: "Northland (ENG)", topScorer: "Northland (ENG)", discipline: "Redville (ARG)" },
    points: {
      group:    { points: 0, correctPicks: 0, bonus: 0 },
      playoff:  { points: 0, correctPicks: 0 },
      champion: { points: 0, correctPicks: 0 },
      misc:     { points: 0, correctPicks: 0 },
    },
    totalPoints: 0,
    totalPicks:  0,
    ranking: null,
    potentialPoints: { maximum: 0, realistic: 0 },
  },
  {
    // A1/A2 swapped, B2/B3 swapped, C3/C4 swapped. Picks Ironport as finalist — wrong.
    // group:11 playoff:68 champion:32 misc:0  total:111
    userEmail: "test1@test.com",
    competitionCode: "devCupPast",
    name: "Upset Special",
    groupPredictions: [
      { groupName: "A", teamOrder: ["Southfield (GER)", "Northland (ENG)",  "Eastbrook (FRA)",  "Westmore (ESP)"] },
      { groupName: "B", teamOrder: ["Redville (ARG)",   "Greenham (ITA)",   "Blueton (BRA)",    "Yellowshore (POR)"] },
      { groupName: "C", teamOrder: ["Ironport (USA)",   "Goldfield (MEX)",  "Silverdale (RSA)", "Bronzewick (AUT)"] },
      { groupName: "D", teamOrder: gD },
    ],
    playoffPredictions: [
      { matchNumber: 25, homeTeam: "Southfield (GER)", awayTeam: "Greenham (ITA)",   round: 1 },
      { matchNumber: 26, homeTeam: "Redville (ARG)",   awayTeam: "Northland (ENG)",  round: 1 },
      { matchNumber: 27, homeTeam: "Ironport (USA)",   awayTeam: "Suncrest (KOR)",   round: 1 },
      { matchNumber: 28, homeTeam: "Moonhaven (JAP)",  awayTeam: "Goldfield (MEX)",  round: 1 },
      { matchNumber: 29, homeTeam: "Northland (ENG)",  awayTeam: "Redville (ARG)",   round: 2 },
      { matchNumber: 30, homeTeam: "Ironport (USA)",   awayTeam: "Moonhaven (JAP)",  round: 2 },
      { matchNumber: 31, homeTeam: "Northland (ENG)",  awayTeam: "Ironport (USA)",   round: 3 },
    ],
    misc: { winner: "Northland (ENG)", topScorer: "Southfield (GER)", discipline: "Moonhaven (JAP)" },
    points: {
      group:    { points: 11, correctPicks: 10, bonus: 1 },
      playoff:  { points: 68, correctPicks: 11 },
      champion: { points: 32, correctPicks: 1 },
      misc:     { points: 0,  correctPicks: 0 },
    },
    totalPoints: 111,
    totalPicks:  23,
    ranking: 3,
    potentialPoints: { maximum: 111, realistic: 111 },
  },
  {
    // A2/A3 swapped, D2/D3 swapped. Thinks A2=Eastbrook, D2=Starfall. Final correct.
    // group:14 playoff:80 champion:32 misc:10  total:136
    userEmail: "test2@test.com",
    competitionCode: "devCupPast",
    name: "The Pundit",
    groupPredictions: [
      { groupName: "A", teamOrder: ["Northland (ENG)",  "Eastbrook (FRA)",  "Southfield (GER)", "Westmore (ESP)"] },
      { groupName: "B", teamOrder: gB },
      { groupName: "C", teamOrder: gC },
      { groupName: "D", teamOrder: ["Moonhaven (JAP)",  "Starfall (MOR)",   "Suncrest (KOR)",   "Skyreach (SAU)"] },
    ],
    playoffPredictions: [
      { matchNumber: 25, homeTeam: "Northland (ENG)",  awayTeam: "Blueton (BRA)",    round: 1 },
      { matchNumber: 26, homeTeam: "Redville (ARG)",   awayTeam: "Eastbrook (FRA)",  round: 1 },
      { matchNumber: 27, homeTeam: "Ironport (USA)",   awayTeam: "Starfall (MOR)",   round: 1 },
      { matchNumber: 28, homeTeam: "Moonhaven (JAP)",  awayTeam: "Goldfield (MEX)",  round: 1 },
      { matchNumber: 29, homeTeam: "Northland (ENG)",  awayTeam: "Redville (ARG)",   round: 2 },
      { matchNumber: 30, homeTeam: "Ironport (USA)",   awayTeam: "Moonhaven (JAP)",  round: 2 },
      { matchNumber: 31, homeTeam: "Northland (ENG)",  awayTeam: "Moonhaven (JAP)",  round: 3 },
    ],
    misc: { winner: "Northland (ENG)", topScorer: "Northland (ENG)", discipline: "Moonhaven (JAP)" },
    points: {
      group:    { points: 14, correctPicks: 12, bonus: 2 },
      playoff:  { points: 80, correctPicks: 11 },
      champion: { points: 32, correctPicks: 1 },
      misc:     { points: 10, correctPicks: 1 },
    },
    totalPoints: 136,
    totalPicks:  25,
    ranking: 2,
    potentialPoints: { maximum: 136, realistic: 136 },
  },
  {
    // A1=Eastbrook, B1=Blueton, D1=Suncrest. Most groups wrong. Picks Ironport as champion.
    // group:8 playoff:60 champion:0 misc:10  total:78
    userEmail: "test2@test.com",
    competitionCode: "devCupPast",
    name: "Gut Feeling",
    groupPredictions: [
      { groupName: "A", teamOrder: ["Eastbrook (FRA)",  "Northland (ENG)",  "Southfield (GER)", "Westmore (ESP)"] },
      { groupName: "B", teamOrder: ["Blueton (BRA)",    "Redville (ARG)",   "Yellowshore (POR)","Greenham (ITA)"] },
      { groupName: "C", teamOrder: gC },
      { groupName: "D", teamOrder: ["Suncrest (KOR)",   "Moonhaven (JAP)",  "Starfall (MOR)",   "Skyreach (SAU)"] },
    ],
    playoffPredictions: [
      { matchNumber: 25, homeTeam: "Eastbrook (FRA)",  awayTeam: "Redville (ARG)",   round: 1 },
      { matchNumber: 26, homeTeam: "Blueton (BRA)",    awayTeam: "Northland (ENG)",  round: 1 },
      { matchNumber: 27, homeTeam: "Ironport (USA)",   awayTeam: "Moonhaven (JAP)",  round: 1 },
      { matchNumber: 28, homeTeam: "Suncrest (KOR)",   awayTeam: "Goldfield (MEX)",  round: 1 },
      { matchNumber: 29, homeTeam: "Northland (ENG)",  awayTeam: "Redville (ARG)",   round: 2 },
      { matchNumber: 30, homeTeam: "Ironport (USA)",   awayTeam: "Suncrest (KOR)",   round: 2 },
      { matchNumber: 31, homeTeam: "Northland (ENG)",  awayTeam: "Ironport (USA)",   round: 3 },
    ],
    misc: { winner: "Ironport (USA)", topScorer: "Ironport (USA)", discipline: "Redville (ARG)" },
    points: {
      group:    { points: 8,  correctPicks: 7,  bonus: 1 },
      playoff:  { points: 60, correctPicks: 10 },
      champion: { points: 0,  correctPicks: 0 },
      misc:     { points: 10, correctPicks: 1 },
    },
    totalPoints: 78,
    totalPicks:  18,
    ranking: 4,
    potentialPoints: { maximum: 78, realistic: 78 },
  },
  // ── Dev Spring Cup (active) ──────────────────────────────────────────────
  // Group A actual: [Brazil, France, Germany]  Group B actual: [Argentina, Spain, Italy]
  // Knockouts not yet played — playoff points will be 0 until results added
  {
    // Perfect group picks, Brazil to win
    userEmail: "test1@test.com",
    competitionCode: "devCupActive",
    name: "Spring Favourites",
    groupPredictions: [
      { groupName: "A", teamOrder: ["Brazil", "France", "Germany"] },
      { groupName: "B", teamOrder: ["Argentina", "Spain", "Italy"] },
    ],
    playoffPredictions: [
      { matchNumber: 207, homeTeam: "Brazil",    awayTeam: "Spain",      round: 1 },
      { matchNumber: 208, homeTeam: "Argentina", awayTeam: "France",     round: 1 },
      { matchNumber: 209, homeTeam: "Brazil",    awayTeam: "Argentina",  round: 2 },
    ],
    misc: { winner: "Brazil" },
    points: { group: { points: 0, correctPicks: 0, bonus: 0 }, playoff: { points: 0, correctPicks: 0 }, champion: { points: 0, correctPicks: 0 }, misc: { points: 0, correctPicks: 0 } },
    totalPoints: 0, totalPicks: 0, ranking: null, potentialPoints: { maximum: 0, realistic: 0 },
  },
  {
    // France first in A, Italy/Spain swapped in B
    userEmail: "test2@test.com",
    competitionCode: "devCupActive",
    name: "Spring Outsiders",
    groupPredictions: [
      { groupName: "A", teamOrder: ["France", "Brazil", "Germany"] },
      { groupName: "B", teamOrder: ["Argentina", "Italy", "Spain"] },
    ],
    playoffPredictions: [
      { matchNumber: 207, homeTeam: "France",    awayTeam: "Argentina",  round: 1 },
      { matchNumber: 208, homeTeam: "Brazil",    awayTeam: "Italy",      round: 1 },
      { matchNumber: 209, homeTeam: "France",    awayTeam: "Brazil",     round: 2 },
    ],
    misc: { winner: "France" },
    points: { group: { points: 0, correctPicks: 0, bonus: 0 }, playoff: { points: 0, correctPicks: 0 }, champion: { points: 0, correctPicks: 0 }, misc: { points: 0, correctPicks: 0 } },
    totalPoints: 0, totalPicks: 0, ranking: null, potentialPoints: { maximum: 0, realistic: 0 },
  },
  // ── Dev Euro Cup (future) ────────────────────────────────────────────────
  // No result yet — all points will remain 0
  {
    // England to win, strong picks throughout
    userEmail: "test1@test.com",
    competitionCode: "devCupFuture",
    name: "Euro Favourites",
    groupPredictions: [
      { groupName: "A", teamOrder: ["England",   "France",      "Spain",       "Germany"] },
      { groupName: "B", teamOrder: ["Brazil",    "Argentina",   "Netherlands", "Italy"] },
      { groupName: "C", teamOrder: ["Portugal",  "Belgium",     "Denmark",     "Croatia"] },
      { groupName: "D", teamOrder: ["Japan",     "Morocco",     "Australia",   "South Korea"] },
      { groupName: "E", teamOrder: ["Uruguay",   "Colombia",    "Sweden",      "Senegal"] },
      { groupName: "F", teamOrder: ["Poland",    "Switzerland", "Serbia",      "Scotland"] },
    ],
    playoffPredictions: [
      { matchNumber: 137, homeTeam: "England",     awayTeam: "Spain",        round: 1 },
      { matchNumber: 138, homeTeam: "Brazil",      awayTeam: "Netherlands",  round: 1 },
      { matchNumber: 139, homeTeam: "Uruguay",     awayTeam: "Switzerland",  round: 1 },
      { matchNumber: 140, homeTeam: "Poland",      awayTeam: "Colombia",     round: 1 },
      { matchNumber: 141, homeTeam: "Portugal",    awayTeam: "Morocco",      round: 1 },
      { matchNumber: 142, homeTeam: "Japan",       awayTeam: "Belgium",      round: 1 },
      { matchNumber: 143, homeTeam: "Denmark",     awayTeam: "France",       round: 1 },
      { matchNumber: 144, homeTeam: "Sweden",      awayTeam: "Argentina",    round: 1 },
      { matchNumber: 145, homeTeam: "England",     awayTeam: "Brazil",       round: 2 },
      { matchNumber: 146, homeTeam: "Uruguay",     awayTeam: "Poland",       round: 2 },
      { matchNumber: 147, homeTeam: "Portugal",    awayTeam: "Japan",        round: 2 },
      { matchNumber: 148, homeTeam: "France",      awayTeam: "Argentina",    round: 2 },
      { matchNumber: 149, homeTeam: "England",     awayTeam: "Uruguay",      round: 3 },
      { matchNumber: 150, homeTeam: "Portugal",    awayTeam: "France",       round: 3 },
      { matchNumber: 151, homeTeam: "England",     awayTeam: "Portugal",     round: 4 },
    ],
    misc: { winner: "England", topScorer: "England" },
    points: { group: { points: 0, correctPicks: 0, bonus: 0 }, playoff: { points: 0, correctPicks: 0 }, champion: { points: 0, correctPicks: 0 }, misc: { points: 0, correctPicks: 0 } },
    totalPoints: 0, totalPicks: 0, ranking: null, potentialPoints: { maximum: 0, realistic: 0 },
  },
  {
    // France to win, different group picks
    userEmail: "test2@test.com",
    competitionCode: "devCupFuture",
    name: "Euro Outsiders",
    groupPredictions: [
      { groupName: "A", teamOrder: ["France",      "England",   "Germany",     "Spain"] },
      { groupName: "B", teamOrder: ["Argentina",   "Brazil",    "Italy",       "Netherlands"] },
      { groupName: "C", teamOrder: ["Belgium",     "Portugal",  "Croatia",     "Denmark"] },
      { groupName: "D", teamOrder: ["Morocco",     "Japan",     "South Korea", "Australia"] },
      { groupName: "E", teamOrder: ["Colombia",    "Uruguay",   "Senegal",     "Sweden"] },
      { groupName: "F", teamOrder: ["Switzerland", "Poland",    "Serbia",      "Scotland"] },
    ],
    playoffPredictions: [
      { matchNumber: 137, homeTeam: "France",      awayTeam: "Germany",      round: 1 },
      { matchNumber: 138, homeTeam: "Argentina",   awayTeam: "Italy",        round: 1 },
      { matchNumber: 139, homeTeam: "Colombia",    awayTeam: "Poland",       round: 1 },
      { matchNumber: 140, homeTeam: "Switzerland", awayTeam: "Uruguay",      round: 1 },
      { matchNumber: 141, homeTeam: "Belgium",     awayTeam: "South Korea",  round: 1 },
      { matchNumber: 142, homeTeam: "Morocco",     awayTeam: "Portugal",     round: 1 },
      { matchNumber: 143, homeTeam: "Spain",       awayTeam: "England",      round: 1 },
      { matchNumber: 144, homeTeam: "Netherlands", awayTeam: "Brazil",       round: 1 },
      { matchNumber: 145, homeTeam: "France",      awayTeam: "Argentina",    round: 2 },
      { matchNumber: 146, homeTeam: "Colombia",    awayTeam: "Switzerland",  round: 2 },
      { matchNumber: 147, homeTeam: "Belgium",     awayTeam: "Morocco",      round: 2 },
      { matchNumber: 148, homeTeam: "Spain",       awayTeam: "Netherlands",  round: 2 },
      { matchNumber: 149, homeTeam: "France",      awayTeam: "Colombia",     round: 3 },
      { matchNumber: 150, homeTeam: "Belgium",     awayTeam: "Spain",        round: 3 },
      { matchNumber: 151, homeTeam: "France",      awayTeam: "Belgium",      round: 4 },
    ],
    misc: { winner: "France", topScorer: "France" },
    points: { group: { points: 0, correctPicks: 0, bonus: 0 }, playoff: { points: 0, correctPicks: 0 }, champion: { points: 0, correctPicks: 0 }, misc: { points: 0, correctPicks: 0 } },
    totalPoints: 0, totalPicks: 0, ranking: null, potentialPoints: { maximum: 0, realistic: 0 },
  },
];
