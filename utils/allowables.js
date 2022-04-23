module.exports.pwComplexityOptions = {
  min: 8,
  max: 50,
  lowerCase: 1,
  upperCase: 1,
  numeric: 1,
  symbol: 0,
  requirementCount: 3,
};

module.exports.miscKeys = {
  type: Object,
  keys: {
    winner: { type: String, required: true },
    thirdPlace: { type: String, required: false },
    discipline: { type: String, required: false },
    topScorer: { type: String, required: false },
  },
  required: true,
};
