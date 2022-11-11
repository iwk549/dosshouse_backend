const request = require("supertest");
const { header, predictions, competitions, users } = require("../../testData");
const {
  testResponseText,
  getToken,
  testAuth,
  deleteAllData,
  testObjectID,
  insertCompetition,
  insertPredictions,
} = require("../../helperFunctions");
const { Prediction } = require("../../../models/predictionModel");
const { Group } = require("../../../models/groupModel");
const mongoose = require("mongoose");
const { max, pickADate } = require("../../../utils/allowables");
const { User } = require("../../../models/userModel");

const endpoint = "/api/v1/predictions";
let server;

describe("predictionsRoute", () => {
  const userID = mongoose.Types.ObjectId();
  const competitionID = mongoose.Types.ObjectId();
  let prediction;
  beforeAll(() => {
    if (process.env.NODE_ENV === "test") server = require("../../../index");
    else throw "Not in test environment";
  });
  afterAll(() => {
    server.close();
  });
  beforeEach(async () => {
    prediction = { ...predictions[0] };
    prediction.competitionID = competitionID;
    prediction.userID = userID;
    prediction.name = "New Bracket";
  });
  afterEach(() => {
    deleteAllData();
  });

  const raiseInsertCompetition = async (daysUntilSubmissionDeadline) => {
    await insertCompetition(competitionID, {
      ...competitions[0],
      submissionDeadline: pickADate(daysUntilSubmissionDeadline),
    });
  };

  describe("POST /", () => {
    const exec = async (token, prediction) =>
      await request(server).post(endpoint).set(header, token).send(prediction);
    testAuth(exec);
    it("should return 400 if body is invalid", async () => {
      const res = await exec(getToken(), { invalidField: "xxx" });
      expect(res.status).toBe(400);
      testResponseText(res.text, "required");
    });
    it("should return 404 if competition is not found", async () => {
      const res = await exec(getToken(), prediction);
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition");
    });
    it("should return 400 if the submission deadline is passed", async () => {
      await raiseInsertCompetition(-1);
      const res = await exec(getToken(), prediction);
      expect(res.status).toBe(400);
      testResponseText(res.text, "submission deadline");
    });
    it("should return 400 if user has already submitted too many brackets", async () => {
      await raiseInsertCompetition(1);
      await insertPredictions(
        competitions[0].maxSubmissions,
        userID,
        competitionID
      );
      const res = await exec(getToken(userID), prediction);
      expect(res.status).toBe(400);
      testResponseText(res.text, "maximum");
    });
    it("should return 400 if user has bracket with same name", async () => {
      await raiseInsertCompetition(1);
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      prediction.name = insertedPredictions[0].name;
      const res = await exec(getToken(userID), prediction);
      expect(res.status).toBe(400);
      testResponseText(res.text, "choose a different name");
    });
    it("should return 400 if bracket name exists globally", async () => {
      await raiseInsertCompetition(1);
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      prediction.name = insertedPredictions[0].name;
      const res = await exec(getToken(), prediction);
      expect(res.status).toBe(400);
      testResponseText(res.text, "names must be unique");
    });
    it("should insert the prediction and return the prediction id", async () => {
      await raiseInsertCompetition(1);
      const res = await exec(getToken(), prediction);
      expect(res.status).toBe(200);
      const insertedPrediction = await Prediction.findById(res.body);
      expect(insertedPrediction).not.toBeNull();
    });
  });

  describe("PUT /:id", () => {
    const exec = async (token, predictionID, prediction) =>
      await request(server)
        .put(endpoint + "/" + predictionID)
        .set(header, token)
        .send(prediction);
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if prediction not found", async () => {
      const res = await exec(getToken(), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "prediction not found");
    });
    it("should return 404 if competition not found", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(userID), insertedPredictions[0]._id);
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });
    it("should return 400 if submission deadline has passed", async () => {
      await raiseInsertCompetition(-1);
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(
        getToken(userID),
        insertedPredictions[0]._id,
        insertedPredictions[0]
      );
      expect(res.status).toBe(400);
      testResponseText(res.text, "submission deadline");
    });
    it("should return 400 if user has bracket with same name", async () => {
      await raiseInsertCompetition(1);
      let insertedPredictions = await insertPredictions(
        2,
        userID,
        competitionID
      );
      insertedPredictions[0].name = insertedPredictions[1].name;
      const res = await exec(
        getToken(userID),
        insertedPredictions[0]._id,
        insertedPredictions[0]
      );
      expect(res.status).toBe(400);
      testResponseText(res.text, "choose a different name");
    });
    it("should return 400 if bracket name exists globally", async () => {
      await raiseInsertCompetition(1);
      let insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      let otherPrediction = { ...predictions[1] };
      otherPrediction.competitionID = competitionID;
      await Prediction.collection.insertOne(otherPrediction);
      const thisID = insertedPredictions[0]._id;
      delete insertedPredictions[0]._id;
      insertedPredictions[0].name = otherPrediction.name;
      const res = await exec(getToken(userID), thisID, insertedPredictions[0]);
      expect(res.status).toBe(400);
      testResponseText(res.text, "names must be unique");
    });
    it("should update the prediction but not allow points to be updated", async () => {
      await raiseInsertCompetition(1);
      let insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      insertedPredictions[0].points = {
        group: { points: 100, correctPicks: 100 },
      };
      const thisID = insertedPredictions[0]._id;
      delete insertedPredictions[0]._id;
      insertedPredictions[0].name = "Updated Name";
      const res = await exec(getToken(userID), thisID, insertedPredictions[0]);
      expect(res.status).toBe(200);
      const updatedPrediction = await Prediction.findById(thisID);
      expect(updatedPrediction.points.group.points).not.toBe(
        insertedPredictions[0].points.group.points
      );
      expect(updatedPrediction.name).toBe("Updated Name");
    });
  });

  describe("GET /:id", () => {
    const exec = async (token, predictionID) =>
      await request(server)
        .get(endpoint + "/" + predictionID)
        .set(header, token);
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if prediction is not found", async () => {
      const res = await exec(getToken(userID), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "not found");
    });
    it("should return the prediction", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(userID), insertedPredictions[0]._id);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name");
    });
  });

  describe("GET /", () => {
    const exec = async (token) =>
      await request(server).get(endpoint).set(header, token);
    testAuth(exec);
    it("should return all predictions belonging to user", async () => {
      await insertPredictions(5, userID, competitionID);
      const res = await exec(getToken(userID));
      expect(res.body.length).toBe(5);
    });
  });

  describe("DELETE /:id", () => {
    const exec = async (token, predictionID) =>
      await request(server)
        .delete(endpoint + "/" + predictionID)
        .set(header, token);
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if prediction not found", async () => {
      const res = await exec(getToken(userID), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "not found");
    });
    it("should delete the prediction", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(userID), insertedPredictions[0]._id);
      expect(res.status).toBe(200);
      const deletedPrediction = await Prediction.findById(
        insertedPredictions[0]._id
      );
      expect(deletedPrediction).toBeNull();
    });
  });

  describe("GET /leaderboard/:id/:resultsPerPage/:pageNumber/:groupID", () => {
    const exec = async (competitionID, pageNumber, perPage, groupID = "all") =>
      await request(server).get(
        endpoint +
          "/leaderboard/" +
          competitionID +
          "/" +
          perPage +
          "/" +
          pageNumber +
          "/" +
          groupID
      );
    testObjectID(exec);
    it("should return 404 if competition not found", async () => {
      const res = await exec(mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition");
    });
    it('should return 400 if group id is not "all" or valid object id', async () => {
      await raiseInsertCompetition(1);
      await insertPredictions(1, userID, competitionID);
      const res = await exec(competitionID, 1, 25, "xxx");
      expect(res.status).toBe(400);
      testResponseText(res.text, "group");
      testResponseText(res.text, "valid object");
    });
    it("should paginate correctly", async () => {
      await raiseInsertCompetition(1);
      await insertPredictions(49, userID, competitionID);
      const res = await exec(competitionID, 1, 25);
      expect(res.body.predictions.length).toBe(25);
      const res2 = await exec(competitionID, 2, 25);
      expect(res2.body.predictions.length).toBe(24);
      expect(res2.body.predictions[0].name).not.toBe(
        res.body.predictions[0].name
      );
    });
    it("should not return the misc field if submission deadline has not passed", async () => {
      await raiseInsertCompetition(1);
      await insertPredictions(49, userID, competitionID);
      const res = await exec(competitionID, 1, 25);
      expect(res.body.predictions[0]).not.toHaveProperty("misc");
    });
    it("should return the misc property if submission deadline has passed", async () => {
      await raiseInsertCompetition(-1);
      await insertPredictions(49, userID, competitionID);
      const res = await exec(competitionID, 1, 25);
      expect(res.body.predictions[0]).toHaveProperty("misc");
    });
    it("should only return predictions that are part of the group", async () => {
      await raiseInsertCompetition(-1);
      const insertedPredictions = await insertPredictions(
        2,
        userID,
        competitionID
      );
      const groupID = mongoose.Types.ObjectId();
      await Prediction.updateOne(
        { _id: insertedPredictions[0]._id },
        { $set: { groups: [groupID] } }
      );
      const res = await exec(competitionID, 1, 25, groupID);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });

  describe("GET /leaderboard/:id/:search", () => {
    const exec = async (competitionID, groupID = "all", search) =>
      await request(server).get(
        endpoint +
          "/leaderboard/" +
          competitionID +
          "/" +
          groupID +
          "/" +
          search
      );
    testObjectID(exec);
    it("should return 404 if competition not found", async () => {
      const res = await exec(mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition");
    });
    it('should return 400 if group id is not "all" or valid object id', async () => {
      await raiseInsertCompetition(1);
      await insertPredictions(1, userID, competitionID);
      const res = await exec(competitionID, "xxx");
      expect(res.status).toBe(400);
      testResponseText(res.text, "group");
      testResponseText(res.text, "valid object");
    });
    it("should return predictions matching the search", async () => {
      await User.insertMany({ ...users[0], _id: userID, name: "First" });
      await raiseInsertCompetition(-1);
      const predictions = await insertPredictions(
        20,
        userID,
        competitionID,
        true
      );
      const filter = "First";
      const res = await exec(competitionID, "all", filter);
      expect(res.status).toBe(200);
      expect(res.body.predictions.length).toBe(
        predictions.filter((p) => p.userID === userID).length
      );
    });
    it("should return predictions matching the search in the group", async () => {
      await User.insertMany({ ...users[0], _id: userID, name: "First" });
      await raiseInsertCompetition(-1);
      const predictions = await insertPredictions(
        20,
        userID,
        competitionID,
        true
      );

      const groupID = mongoose.Types.ObjectId();
      await Prediction.updateMany(
        {
          _id: {
            $in: [predictions[0]._id, predictions[1]._id, predictions[2]._id],
          },
        },
        { $set: { groups: [groupID] } }
      );
      const filter = "First";
      const res = await exec(competitionID, groupID, filter);
      expect(res.status).toBe(200);
      expect(res.body.predictions.length).toBe(2);
    });
  });

  describe("GET /unowned/:id", () => {
    const exec = async (token, predictionID) =>
      await request(server)
        .get(endpoint + "/unowned/" + predictionID)
        .set(header, token);
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if prediction does not exist", async () => {
      const res = await exec(getToken(), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "prediction not found");
    });
    it("should return 404 if the competition is not found", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(), insertedPredictions[0]._id);
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });
    it("should return only info fields if submission deadline is not passed", async () => {
      await raiseInsertCompetition(1);
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(), insertedPredictions[0]._id);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("groupPredictions");
      expect(res.body).not.toHaveProperty("playoffPredictions");
      expect(res.body).not.toHaveProperty("misc");
    });
    it("should return all prediction fields if submission deadline has passed", async () => {
      await raiseInsertCompetition(-1);
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(), insertedPredictions[0]._id);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("groupPredictions");
      expect(res.body).toHaveProperty("playoffPredictions");
      expect(res.body).toHaveProperty("misc");
    });
  });

  describe("POST /addtogroup/:id", () => {
    const exec = async (token, predictionID, group) =>
      await request(server)
        .put(endpoint + "/addtogroup/" + predictionID)
        .set(header, token)
        .send(group);
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if prediction does not exist", async () => {
      const res = await exec(getToken(), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "prediction not found");
    });
    it("should return 404 if group does not exist", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(userID), insertedPredictions[0]._id);
      expect(res.status).toBe(404);
      testResponseText(res.text, "group not found");
    });
    it("should return 400 if user has reached limit of groups per prediction", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      await Prediction.updateOne(
        { _id: insertedPredictions[0]._id },
        {
          $set: {
            groups: new Array(max.groupsPerPrediction).fill(
              mongoose.Types.ObjectId()
            ),
          },
        }
      );
      const res = await exec(getToken(userID), insertedPredictions[0]._id, {
        name: "group1",
        passcode: "passcode",
        ownerID: mongoose.Types.ObjectId(),
        competitionID: insertedPredictions[0].competitionID,
      });
      expect(res.status).toBe(400);
      testResponseText(res.text, "maximum");
    });
    it("should add the group to the prediction (case insensitive on group name", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const group = {
        name: "Group1",
        passcode: "passcode",
        ownerID: mongoose.Types.ObjectId(),
        competitionID: insertedPredictions[0].competitionID,
      };
      await Group.collection.insertOne(group);
      const res = await exec(getToken(userID), insertedPredictions[0]._id, {
        ...group,
        name: "group1",
      });
      expect(res.status).toBe(200);
      const updatedPrediction = await Prediction.findById(
        insertedPredictions[0]._id
      );
      expect(updatedPrediction).toHaveProperty("groups");
      expect(updatedPrediction.groups).toEqual(
        expect.arrayContaining([group._id])
      );
    });
  });

  describe("PUT /removefromgroup/:id", () => {
    const exec = async (token, predictionID, group) =>
      await request(server)
        .put(endpoint + "/removefromgroup/" + predictionID)
        .set(header, token)
        .send(group);
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if prediction does not exist", async () => {
      const res = await exec(getToken(), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "prediction not found");
    });
    it("should return 200 but do nothing if no/invalid group id is sent", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(userID), insertedPredictions[0]._id);
      expect(res.status).toBe(200);
    });
    it("should remove the groupid from the prediction", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const groupID = mongoose.Types.ObjectId();
      await Prediction.updateOne(
        { _id: insertedPredictions[0]._id },
        { $set: { groups: [groupID, mongoose.Types.ObjectId()] } }
      );
      const res = await exec(getToken(userID), insertedPredictions[0]._id, {
        _id: groupID,
      });
      expect(res.status).toBe(200);
      const updatedPrediction = await Prediction.findById(
        insertedPredictions[0]._id
      );
      expect(updatedPrediction.groups.length).toBe(1);
      expect(updatedPrediction.groups).not.toEqual(
        expect.arrayContaining([groupID])
      );
    });
  });

  describe("PUT /forceremovefromgroup/:id", () => {
    const exec = async (token, predictionID, group) =>
      await request(server)
        .put(endpoint + "/forceremovefromgroup/" + predictionID)
        .set(header, token)
        .send(group);
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if prediction not found", async () => {
      const res = await exec(getToken(), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "prediction not found");
    });
    it("should return 404 if group not found", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const res = await exec(getToken(), insertedPredictions[0]._id);
      expect(res.status).toBe(404);
      testResponseText(res.text, "group not found");
    });
    it("should return 403 if user is not owner of group", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const group = await Group.collection.insertOne({
        name: "aaa",
        passcode: "passcode",
        ownerID: userID,
      });
      const res = await exec(getToken(), insertedPredictions[0]._id, {
        _id: group.insertedId,
      });
      expect(res.status).toBe(403);
      testResponseText(res.text, "only the owner");
    });
    it("should remove the prediction from the group", async () => {
      const insertedPredictions = await insertPredictions(
        1,
        userID,
        competitionID
      );
      const group = await Group.collection.insertOne({
        name: "aaa",
        passcode: "passcode",
        ownerID: userID,
      });
      await Prediction.updateOne(
        { _id: insertedPredictions[0]._id },
        { $set: { groups: [group.insertedId, mongoose.Types.ObjectId()] } }
      );
      const res = await exec(getToken(userID), insertedPredictions[0]._id, {
        _id: group.insertedId,
      });
      expect(res.status).toBe(200);
      const updatedPrediction = await Prediction.findById(
        insertedPredictions[0]._id
      );
      expect(updatedPrediction.groups.length).toBe(1);
      expect(updatedPrediction.groups).not.toEqual(
        expect.arrayContaining([group.insertedId])
      );
    });
  });

  describe("GET /competitions/:id", () => {
    const exec = async (token, competitionID) =>
      await request(server)
        .get(endpoint + "/competitions/" + competitionID)
        .set(header, token);
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if the competition is not found", async () => {
      const res = await exec(getToken(userID), competitionID);
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });
    it("should return the predictions for the user in the provided competition", async () => {
      await insertCompetition(competitionID);
      const insertedPredictions = await insertPredictions(
        3,
        userID,
        competitionID
      );
      await insertPredictions(2, userID, mongoose.Types.ObjectId(), null, 3);

      const res = await exec(getToken(userID), competitionID);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(insertedPredictions.length);
    });
  });
});
