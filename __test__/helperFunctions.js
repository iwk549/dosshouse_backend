const { User } = require("../models/user.model");
const { Prediction } = require("../models/prediction.model");
const { Competition } = require("../models/competition.model");
const { Group } = require("../models/group.model");
const { Match } = require("../models/match.model");
const { Result } = require("../models/result.model");
const {
  users,
  competitions,
  predictions,
  matches,
  results,
} = require("./testData");
const mongoose = require("mongoose");

async function cleanup(server) {
  if (server) await server.close();
  try {
    await mongoose.connection.close();
  } catch (error) {
    //
  }
}

async function deleteAllData() {
  await User.collection.deleteMany();
  await Prediction.collection.deleteMany();
  await Competition.collection.deleteMany();
  await Group.collection.deleteMany();
  await Match.collection.deleteMany();
  await Result.collection.deleteMany();
}

function testResponseText(responseText, expectedToContain) {
  expect(responseText.toLowerCase()).toEqual(
    expect.stringContaining(expectedToContain)
  );
}

function testReponse(res, expectedStatus, expectedText) {
  expect(res.status).toBe(expectedStatus);
  if (expectedText) testResponseText(res.text, expectedText);
}

function getToken(_id, user, role = "") {
  const newUser = new User(user || users[0]);
  newUser._id = _id || newUser._id;
  if (role) newUser.role = role;
  return newUser.generateAuthToken();
}

async function insertUser(userID, override = {}) {
  let user = { ...users[0], ...override };
  user._id = userID;
  await User.collection.insertOne(user);

  return user;
}

async function insertCompetition(competitionID, competition) {
  let competitionToInsert = competition || { ...competitions[0] };
  competitionToInsert._id = competitionID;
  await Competition.collection.insertOne(competitionToInsert);
  return competitionToInsert;
}

async function insertResult(override = {}) {
  let result = { ...results[0], ...override };
  await Result.collection.insertOne(result);
  return result;
}

async function insertMatch(override = {}) {
  let match = { ...matches[0], ...override };

  await Match.collection.insertOne(match);

  return match;
}

async function insertPrediction(override = {}) {
  let prediction = { ...predictions[0], ...override };

  await Prediction.collection.insertOne(prediction);

  return prediction;
}

async function insertPredictions(
  count,
  userID,
  competitionID,
  differentUsers,
  startNameOffset = 0
) {
  let predictionsToInsert = [];
  for (let i = 0 + startNameOffset; i < count + startNameOffset; i++) {
    let prediction = { ...predictions[0] };
    prediction._id = mongoose.Types.ObjectId();
    prediction.name = "Bracket " + (i + 1);
    prediction.userID = differentUsers
      ? i % 2 === 0
        ? userID
        : mongoose.Types.ObjectId()
      : userID || mongoose.Types.ObjectId();
    prediction.competitionID = competitionID || mongoose.Types.ObjectId();
    predictionsToInsert.push(prediction);
  }
  await Prediction.insertMany(predictionsToInsert);
  return predictionsToInsert;
}

async function insertGroups(count, ownerID, differentUsers) {
  let groups = [];
  for (let i = 0; i < count; i++) {
    let group = {
      _id: mongoose.Types.ObjectId(),
      ownerID: differentUsers
        ? i % 2 === 0
          ? ownerID
          : mongoose.Types.ObjectId()
        : ownerID || mongoose.Types.ObjectId(),
      name: `Group ${i + 1}`,
      passcode: "passcode",
    };
    group.lowercaseName = group.name.toLowerCase();
    groups.push(group);
  }

  await Group.collection.insertMany(groups);
  return groups;
}

function pickADate(daysAhead) {
  return new Date().setDate(new Date().getDate() + daysAhead);
}

function testAuth(executionFunction, role) {
  it("should return 400 if invalid token passed", async () => {
    const res = await executionFunction("xxx");
    expect(res.status).toBe(400);
    testResponseText(res.text, "invalid");
  });
  it("should return 401 if no token sent", async () => {
    const res = await executionFunction("");
    expect(res.status).toBe(401);
    testResponseText(res.text, "provided");
  });
  if (role) {
    if (role.includes("admin")) {
      it("should return 403 if user is not admin", async () => {
        const res = await executionFunction(getToken());
        expect(res.status).toBe(403);
        testResponseText(res.text, "access denied");
      });
    }
  }
}

function testObjectID(executionFunction, needsToken, tokenRole, user) {
  it("should return 400 if invalid object id sent", async () => {
    let res;
    if (needsToken)
      res = await executionFunction(
        getToken(null, user || null, tokenRole),
        "xxx"
      );
    else res = await executionFunction("xxx");

    expect(res.status).toBe(400);
    testResponseText(res.text, "invalid id");
  });
}

module.exports.testReponse = testReponse;
module.exports.testResponseText = testResponseText;
module.exports.getToken = getToken;
module.exports.insertUser = insertUser;
module.exports.insertCompetition = insertCompetition;
module.exports.insertResult = insertResult;
module.exports.insertPredictions = insertPredictions;
module.exports.insertGroups = insertGroups;
module.exports.insertMatch = insertMatch;
module.exports.insertPrediction = insertPrediction;
module.exports.pickADate = pickADate;
module.exports.testAuth = testAuth;
module.exports.testObjectID = testObjectID;
module.exports.deleteAllData = deleteAllData;
module.exports.cleanup = cleanup;
