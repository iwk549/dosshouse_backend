const request = require("supertest");
const { header, predictions, competitions } = require("../../testData");
const {
  testResponseText,
  getToken,
  testAuth,
  deleteAllData,
  testObjectID,
  pickADate,
  insertCompetition,
} = require("../../helperFunctions");
const { Prediction } = require("../../../models/predictionModel");
const mongoose = require("mongoose");

const endpoint = "/api/v1/predictions";
let server;

describe("predictionsRoute", () => {
  const userID = mongoose.Types.ObjectId();
  const competitionID = mongoose.Types.ObjectId();
  let prediction;
  beforeEach(async () => {
    if (process.env.NODE_ENV === "test") server = require("../../../index");
    else throw "Not in test environment";
  });
  afterEach(() => {
    server.close();
    deleteAllData();
    prediction = { ...predictions[0] };
    prediction.competitionID = competitionID;
    prediction.userID = userID;
    prediction.name = "New Bracket";
  });

  const insertPredictions = async (count) => {
    let predictionsToInsert = [];
    for (let i = 0; i < count; i++) {
      let prediction = { ...predictions[0] };
      prediction._id = mongoose.Types.ObjectId();
      prediction.name = "Bracket " + (i + 1);
      prediction.userID = userID;
      prediction.competitionID = competitionID;
      predictionsToInsert.push(prediction);
    }
    await Prediction.insertMany(predictionsToInsert);
    return predictionsToInsert;
  };

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
      await insertPredictions(competitions[0].maxSubmissions);
      const res = await exec(getToken(userID), prediction);
      expect(res.status).toBe(400);
      testResponseText(res.text, "maximum");
    });
    it("should return 400 if user has bracket with same name", async () => {
      await raiseInsertCompetition(1);
      const insertedPredictions = await insertPredictions(1);
      prediction.name = insertedPredictions[0].name;
      const res = await exec(getToken(userID), prediction);
      expect(res.status).toBe(400);
      testResponseText(res.text, "choose a different name");
    });
    it("should return 400 if bracket name exists globally", async () => {
      await raiseInsertCompetition(1);
      const insertedPredictions = await insertPredictions(1);
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
      const insertedPredictions = await insertPredictions(1);
      const res = await exec(getToken(userID), insertedPredictions[0]._id);
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });
    it("should return 400 if submission deadline has passed", async () => {
      await raiseInsertCompetition(-1);
      const insertedPredictions = await insertPredictions(1);
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
      let insertedPredictions = await insertPredictions(2);
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
      let insertedPredictions = await insertPredictions(1);
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
      let insertedPredictions = await insertPredictions(1);
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
      const insertedPredictions = await insertPredictions(1);
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
      await insertPredictions(5);
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
      const insertedPredictions = await insertPredictions(1);
      const res = await exec(getToken(userID), insertedPredictions[0]._id);
      expect(res.status).toBe(200);
      const deletedPrediction = await Prediction.findById(
        insertedPredictions[0]._id
      );
      expect(deletedPrediction).toBeNull();
    });
  });

  describe("GET /leaderboard/:id", () => {
    const exec = async (competitionID, pageNumber, perPage) =>
      await request(server).get(
        endpoint +
          "/leaderboard/" +
          competitionID +
          "/" +
          perPage +
          "/" +
          pageNumber
      );
    testObjectID(exec);
    it("should return 404 if competition not found", async () => {
      const res = await exec(mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition");
    });
    it("should paginate correctly", async () => {
      await raiseInsertCompetition(1);
      await insertPredictions(49);
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
      await insertPredictions(49);
      const res = await exec(competitionID, 1, 25);
      expect(res.body.predictions[0]).not.toHaveProperty("misc");
    });
    it("should return the misc property if submission deadline has passed", async () => {
      await raiseInsertCompetition(-11);
      await insertPredictions(49);
      const res = await exec(competitionID, 1, 25);
      expect(res.body.predictions[0]).toHaveProperty("misc");
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
      const insertedPredictions = await insertPredictions(1);
      const res = await exec(getToken(), insertedPredictions[0]._id);
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });
    it("should return only info fields if submission deadline is not passed", async () => {
      await raiseInsertCompetition(1);
      const insertedPredictions = await insertPredictions(1);
      const res = await exec(getToken(), insertedPredictions[0]._id);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("groupPredictions");
      expect(res.body).not.toHaveProperty("playoffPredictions");
      expect(res.body).not.toHaveProperty("misc");
    });
    it("should return all prediction fields if submission deadline has passed", async () => {
      await raiseInsertCompetition(-1);
      const insertedPredictions = await insertPredictions(1);
      const res = await exec(getToken(), insertedPredictions[0]._id);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("groupPredictions");
      expect(res.body).toHaveProperty("playoffPredictions");
      expect(res.body).toHaveProperty("misc");
    });
  });
});
