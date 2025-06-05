const request = require("supertest");
const { header, results, users, predictions } = require("../../testData");
const {
  testResponseText,
  testObjectID,
  deleteAllData,
  testAuth,
  getToken,
  insertCompetition,
  cleanup,
} = require("../../helperFunctions");
const mongoose = require("mongoose");
const { Result } = require("../../../models/resultModel");
const { User } = require("../../../models/userModel");
const { Competition } = require("../../../models/competitionModel");
const { Prediction } = require("../../../models/predictionModel");
const { start } = require("../../..");

const endpoint = "/api/v1/results";
let server;

describe("resultsRoute", () => {
  const competitionID = mongoose.Types.ObjectId();
  beforeAll(async () => {
    if (process.env.NODE_ENV === "test") {
      server = await start();
    } else throw "Not in test environment";
  });
  afterAll(async () => {
    await cleanup(server);
  });
  afterEach(async () => {
    await deleteAllData();
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
      for (let i = 0; i < count; i++) {
        const prediction = { ...prediction1 };
        prediction._id = mongoose.Types.ObjectId();
        prediction.name = "Name" + i;
        await Prediction.collection.insertOne(prediction);
      }
    }
  };

  describe("PUT /:code", () => {
    const exec = async (token, code, results, query) => {
      return await request(server)
        .put(endpoint + "/" + code + (query ? "?" + query : ""))
        .send(results)
        .set(header, token);
    };
    testAuth(exec, "admin");
    it("should return 404 if competition not found", async () => {
      const admin = await insertUser();
      const res = await exec(
        getToken(admin._id, admin, "admin"),
        "fakeCode",
        {}
      );
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });
    it("should return 400 if result is invalid", async () => {
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      const res = await exec(
        getToken(admin._id, admin, "admin"),
        competition.code,
        { invalidField: "xxx" }
      );

      expect(res.status).toBe(400);
      testResponseText(res.text, "required");
    });
    it("should insert the result if it does not exist", async () => {
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      const res = await exec(
        getToken(admin._id, admin, "admin"),
        competition.code,
        results[0]
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("upsertedId");

      const upsertedResult = await Result.findOne({ code: competition.code });
      expect(upsertedResult).not.toBeNull();
      expect(String(upsertedResult._id)).toBe(String(res.body.upsertedId));
    });
    it("should update the result if it already exists", async () => {
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      let result = { ...results[0] };
      let updateResult = { ...results[0] };
      result.playoff = [{ round: 1, teams: ["1", "2", "3", "4"], points: 1 }];
      updateResult.playoff = [
        { round: 2, teams: ["5", "6", "7", "8"], points: 2 },
      ];
      await Result.collection.insertMany([result]);

      const res = await exec(
        getToken(admin._id, admin, "admin"),
        competition.code,
        updateResult
      );
      expect(res.status).toBe(200);
      expect(res.body.modifiedCount).toBe(1);

      const updatedResult = await Result.findOne({ code: competition.code });
      expect(updatedResult.playoff).toMatchObject(updateResult.playoff);
    });
  });

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
