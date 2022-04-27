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
const c = require("config");
const { Competition } = require("../../../models/competitionModel");

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
    testObjectID(exec);
    it("should return 404 if prediction not found", async () => {
      const res = await exec(getToken(), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "bracket not found");
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
});
