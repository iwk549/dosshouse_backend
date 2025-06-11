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
  groupsPerUser: 2,
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
  "-_id -password -passwordReset -email -role -__v -lastActive";

module.exports.reservedGroupNames = [
  "overall leaderboard",
  "leaderboard",
  "overall",
  "all",
  "sitewide",
  "entire",
];

module.exports.mapCsvFields = (flatRow) => {
  const result = {};

  for (const flatKey in flatRow) {
    const value = flatRow[flatKey];
    const keys = flatKey.split(".");

    let current = result;

    keys.forEach((key, index) => {
      // If we're at the last key, assign the value
      if (index === keys.length - 1) {
        if (value || value === 0)
          current[key] = !isNaN(Number(value))
            ? Number(value)
            : value === "FALSE"
            ? false
            : value === "TRUE"
            ? true
            : value;
      } else {
        // If the key doesn't exist or isn't an object, create it
        if (!current[key] || typeof current[key] !== "object") {
          current[key] = {};
        }
        current = current[key];
      }
    });
  }

  return result;
};
