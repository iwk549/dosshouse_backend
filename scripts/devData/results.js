// devCupPast — all rounds complete
// devCupActive — group stage only (knockouts in Dec 2026)

module.exports = [
  {
    code: "devCupPast",
    group: [
      { groupName: "A", teamOrder: ["Northland (ENG)", "Southfield (GER)", "Eastbrook (FRA)", "Westmore (ESP)"] },
      { groupName: "B", teamOrder: ["Redville (ARG)",  "Blueton (BRA)",    "Greenham (ITA)",  "Yellowshore (POR)"] },
      { groupName: "C", teamOrder: ["Ironport (USA)",  "Goldfield (MEX)",  "Bronzewick (AUT)","Silverdale (RSA)"] },
      { groupName: "D", teamOrder: ["Moonhaven (JAP)", "Suncrest (KOR)",   "Starfall (MOR)",  "Skyreach (SAU)"] },
    ],
    playoff: [
      { round: 1, points: 4,  teams: ["Northland (ENG)", "Blueton (BRA)",    "Redville (ARG)",  "Southfield (GER)", "Ironport (USA)",  "Suncrest (KOR)",  "Moonhaven (JAP)", "Goldfield (MEX)"] },
      { round: 2, points: 8,  teams: ["Northland (ENG)", "Southfield (GER)", "Ironport (USA)",  "Moonhaven (JAP)"] },
      { round: 3, points: 16, teams: ["Northland (ENG)", "Moonhaven (JAP)"] },
    ],
    misc: { winner: "Northland (ENG)", topScorer: "Northland (ENG)", discipline: "Redville (ARG)" },
  },
  {
    code: "devCupActive",
    group: [
      { groupName: "A", teamOrder: ["Brazil", "France", "Germany"] },
      { groupName: "B", teamOrder: ["Argentina", "Spain", "Italy"] },
    ],
    playoff: [
      { round: 1, points: 4, teams: ["Brazil", "France", "Argentina", "Spain"] }
    ],
    misc: { winner: "" },
  },
];
