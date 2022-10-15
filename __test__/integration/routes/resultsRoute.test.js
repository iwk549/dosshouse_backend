const request = require("supertest");
const { header, results, users, predictions } = require("../../testData");
const {
  testResponseText,
  testObjectID,
  deleteAllData,
  testAuth,
  getToken,
  insertCompetition,
} = require("../../helperFunctions");
const mongoose = require("mongoose");
const { Result } = require("../../../models/resultModel");
const { User } = require("../../../models/userModel");
const { Competition } = require("../../../models/competitionModel");
const { Prediction } = require("../../../models/predictionModel");

const endpoint = "/api/v1/results";
let server;

describe("resultsRoute", () => {
  const competitionID = mongoose.Types.ObjectId();
  beforeEach(async () => {
    if (process.env.NODE_ENV === "test") server = require("../../../index");
    else throw "Not in test environment";
  });
  afterEach(() => {
    server.close();
    deleteAllData();
  });

  const insertResult = async (competition) => {
    let result = { ...results[0] };
    result.bracketCode = competition.code;
    await Result.collection.insertOne(result);
    return result;
  };

  const insertUser = async () => {
    let user = { ...users[0] };
    user.role = "admin";
    await User.collection.insertOne(user);
    return user;
  };

  const insertPredictions = async (competitionID, allTheSame, count = 10) => {
    const prediction1 = { ...predictions[0] };
    delete prediction1.points;
    delete prediction1.totalPoints;
    prediction1.competitionID = competitionID;
    if (allTheSame) {
      for (i = 0; i < count; i++) {
        const prediction = { ...prediction1 };
        prediction._id = mongoose.Types.ObjectId();
        prediction.name = "Name" + i;
        await Prediction.collection.insertOne(prediction);
      }
    }
  };

  describe("GET /:id", () => {
    const exec = async (token, id) => {
      return await request(server)
        .get(endpoint + "/" + id)
        .set(header, token);
    };
    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if the competition is not found", async () => {
      const res = await exec(getToken(), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });
    it("should return 404 if results not found", async () => {
      await insertCompetition(competitionID);
      const res = await exec(getToken(), competitionID);
      expect(res.status).toBe(404);
      testResponseText(res.text, "results not found");
    });
    it("should send the results", async () => {
      const competition = await insertCompetition(competitionID);
      const result = await insertResult(competition);
      const res = await exec(getToken(), competitionID);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject(result);
    });
  });

  describe("POST /calculate/:code", () => {
    const exec = async (token, code) => {
      return await request(server)
        .post(endpoint + "/calculate/" + code)
        .set(header, token);
    };
    testAuth(exec, "admin");
    it("should return 404 if result not found", async () => {
      const admin = await insertUser();
      const res = await exec(getToken(admin._id, admin, "admin"), "fakeCode");
      expect(res.status).toBe(404);
      testResponseText(res.text, "result not found");
    });
    it("should return 404 if the competition is not found", async () => {
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      const result = await insertResult(competition);
      await Competition.collection.deleteMany();
      const res = await exec(getToken(admin._id, admin, "admin"), result.code);
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });
    it("should update the db with the points and overall ranking for all predictions for the competition", async () => {
      // in this scenario all of the predictions are the same. They should all have the same amount of points and share the #1 ranking
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      const result = await insertResult(competition);
      await insertPredictions(competitionID, true);
      const res = await exec(getToken(admin._id, admin, "admin"), result.code);
      expect(res.status).toBe(200);

      const updatedPredictions = await Prediction.find({ competitionID });
      updatedPredictions.forEach((up) => {
        expect(up.ranking).toBe(1);
        expect(up.totalPoints).toBe(updatedPredictions[0].totalPoints);
      });
    });
  });
});
