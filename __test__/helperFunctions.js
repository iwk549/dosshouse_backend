const { User } = require("../models/userModel");
const { Prediction } = require("../models/predictionModel");
const { Competition } = require("../models/competitionModel");
const { Group } = require("../models/groupModel");
const { Match } = require("../models/matchModel");
const { Result } = require("../models/resultModel");
const { users, competitions, predictions } = require("./testData");
const mongoose = require("mongoose");

function deleteAllData() {
  User.collection.deleteMany();
  Prediction.collection.deleteMany();
  Competition.collection.deleteMany();
  Group.collection.deleteMany();
  Match.collection.deleteMany();
  Result.collection.deleteMany();
}

function testResponseText(responseText, expectedToContain) {
  expect(responseText.toLowerCase()).toEqual(
    expect.stringContaining(expectedToContain)
  );
}

function getToken(_id, user, role = "") {
  const newUser = new User(user || users[0]);
  newUser._id = _id || newUser._id;
  if (role) newUser.role = role;
  return newUser.generateAuthToken();
}

async function insertCompetition(competitionID, competition) {
  let competitionToInsert = competition || { ...competitions[0] };
  competitionToInsert._id = competitionID;
  await Competition.collection.insertOne(competitionToInsert);
  return competitionToInsert;
}

async function insertPredictions(count, userID, competitionID, differentUsers) {
  let predictionsToInsert = [];
  for (let i = 0; i < count; i++) {
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

function testObjectID(executionFunction, needsToken) {
  it("should return 400 if invalid object id sent", async () => {
    let res;
    if (needsToken) res = await executionFunction(getToken(), "xxx");
    else res = await executionFunction("xxx");
    expect(res.status).toBe(400);
    testResponseText(res.text, "invalid id");
  });
}

module.exports.testResponseText = testResponseText;
module.exports.getToken = getToken;
module.exports.insertCompetition = insertCompetition;
module.exports.insertPredictions = insertPredictions;
module.exports.insertGroups = insertGroups;
module.exports.pickADate = pickADate;
module.exports.testAuth = testAuth;
module.exports.testObjectID = testObjectID;
module.exports.deleteAllData = deleteAllData;
