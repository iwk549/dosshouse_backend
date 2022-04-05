module.exports.activeCompetitions = {
  worldCup2022: {
    name: "World Cup 2022",
    deadline: new Date(2022, 10, 20),
    maxSubmissions: 2,
  },
  marchMadness2022: {
    name: "March Madness 2022",
    deadline: new Date(2022, 02, 01),
    maxSubmissions: 0,
  },
};

module.exports.pwComplexityOptions = {
  min: 8,
  max: 50,
  lowerCase: 1,
  upperCase: 1,
  numeric: 1,
  symbol: 0,
  requirementCount: 3,
};
