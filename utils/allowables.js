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

module.exports.max = {
  groupsPerUser: 5,
  groupsPerPrediction: 5,
};

module.exports.url =
  process.env.NODE_ENV === "production"
    ? "https://dosshouse.us"
    : "http://localhost:3000";

module.exports.pickADate = function pickADate(daysAhead) {
  return new Date(new Date().setDate(new Date().getDate() + daysAhead));
};

module.exports.removeFieldsFromPopulatedUser =
  "-_id -password -passwordResetToken -email -role -__v -lastActive";

module.exports.reservedGroupNames = [
  "overall leaderboard",
  "leaderboard",
  "overall",
  "all",
  "sitewide",
  "entire",
];
