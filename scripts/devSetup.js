const { User } = require("../models/user.model");
const { Competition } = require("../models/competition.model");
const { Match } = require("../models/match.model");
const { Result } = require("../models/result.model");
const { Prediction } = require("../models/prediction.model");
const { saltAndHashPassword } = require("../utils/users");
const { calculateAndPostSubmissions } = require("../routes/controllers/result.controller");

const devUsers = require("./devData/users");
const devCompetitions = require("./devData/competitions");
const devMatches = require("./devData/matches");
const devResults = require("./devData/results");
const devPredictions = require("./devData/predictions");

require("../startup/db")(process.env.NODE_ENV);

async function setupDev() {
  for (const user of devUsers) {
    const password = await saltAndHashPassword(user.password);
    await User.updateOne(
      { email: user.email },
      { $set: { name: user.name, password, role: user.role } },
      { upsert: true },
    );
  }

  for (const comp of devCompetitions) {
    await Competition.updateOne(
      { code: comp.code },
      { $set: comp },
      { upsert: true },
    );
  }

  for (const match of devMatches) {
    await Match.updateOne(
      { bracketCode: match.bracketCode, matchNumber: match.matchNumber },
      { $set: match },
      { upsert: true },
    );
  }

  for (const result of devResults) {
    await Result.updateOne(
      { code: result.code },
      { $set: result },
      { upsert: true },
    );
  }

  for (const template of devPredictions) {
    const user = await User.findOne({ email: template.userEmail });
    const competition = await Competition.findOne({
      code: template.competitionCode,
    });
    if (!user || !competition) continue;

    // eslint-disable-next-line no-unused-vars
    const { userEmail, competitionCode, ...pred } = template;
    await Prediction.updateOne(
      { userID: user._id, competitionID: competition._id, name: pred.name },
      { $set: { ...pred, userID: user._id, competitionID: competition._id } },
      { upsert: true },
    );
  }

  const competitionCodes = [...new Set(devPredictions.map((p) => p.competitionCode))];
  for (const code of competitionCodes) {
    const competition = await Competition.findOne({ code });
    const result = await Result.findOne({ code });
    if (!competition || !result) continue;
    await calculateAndPostSubmissions(competition, result);
  }

  process.exit();
}

setupDev();
