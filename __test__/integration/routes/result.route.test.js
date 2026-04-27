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
  insertPrediction,
} = require("../../helperFunctions");
const mongoose = require("mongoose");
const { Result } = require("../../../models/result.model");
const { WhatIfResult } = require("../../../models/whatIfResult.model");
const { User } = require("../../../models/user.model");
const { Competition } = require("../../../models/competition.model");
const { Prediction } = require("../../../models/prediction.model");
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

  const insertResult = async (competition, override = {}) => {
    let result = { ...results[0], ...override };
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
    it("should set lastCalculated on the competition when ?calculate is passed", async () => {
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      const before = new Date();
      await exec(
        getToken(admin._id, admin, "admin"),
        competition.code,
        results[0],
        "calculate=true"
      );
      const updated = await Competition.findOne({ code: competition.code });
      expect(updated.lastCalculated).toBeDefined();
      expect(new Date(updated.lastCalculated).getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
    it("should not set lastCalculated if ?calculate is not passed", async () => {
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      await exec(
        getToken(admin._id, admin, "admin"),
        competition.code,
        results[0]
      );
      const updated = await Competition.findOne({ code: competition.code });
      expect(updated.lastCalculated).toBeUndefined();
    });

    describe("leaders field", () => {
      const validLeaders = [
        {
          key: "topScorer",
          label: "Top Scorer",
          leaders: [
            { team: "France", player: "Mbappe", value: "8" },
            { team: "England", player: "Kane", value: "6", eliminated: false },
          ],
        },
      ];

      it("should accept and return a result with a leaders array", async () => {
        const admin = await insertUser();
        const competition = await insertCompetition(competitionID);
        const res = await exec(
          getToken(admin._id, admin, "admin"),
          competition.code,
          { ...results[0], leaders: validLeaders }
        );
        expect(res.status).toBe(200);
      });

      it("should persist the leaders array to the database", async () => {
        const admin = await insertUser();
        const competition = await insertCompetition(competitionID);
        await exec(
          getToken(admin._id, admin, "admin"),
          competition.code,
          { ...results[0], leaders: validLeaders }
        );
        const saved = await Result.findOne({ code: competition.code });
        expect(saved.leaders).toHaveLength(1);
        expect(saved.leaders[0].key).toBe("topScorer");
        expect(saved.leaders[0].leaders).toHaveLength(2);
        expect(saved.leaders[0].leaders[0].player).toBe("Mbappe");
      });

      it("should update the leaders array when result is updated", async () => {
        const admin = await insertUser();
        const competition = await insertCompetition(competitionID);
        await exec(
          getToken(admin._id, admin, "admin"),
          competition.code,
          { ...results[0], leaders: validLeaders }
        );
        const updatedLeaders = [
          {
            key: "topScorer",
            label: "Top Scorer",
            leaders: [{ team: "Germany", player: "Muller", value: "5" }],
          },
        ];
        await exec(
          getToken(admin._id, admin, "admin"),
          competition.code,
          { ...results[0], leaders: updatedLeaders }
        );
        const saved = await Result.findOne({ code: competition.code });
        expect(saved.leaders[0].leaders[0].player).toBe("Muller");
      });
    });
  });

  describe("GET /:id", () => {
    const exec = async (token, id) => {
      return await request(server)
        .get(endpoint + "/" + id)
        .set(header, token);
    };

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
    it("should return the leaders array when present", async () => {
      const competition = await insertCompetition(competitionID);
      const leaders = [
        {
          key: "topScorer",
          label: "Top Scorer",
          leaders: [{ team: "France", player: "Mbappe", value: "8" }],
        },
      ];
      await insertResult(competition, { leaders });
      const res = await exec(getToken(), competitionID);
      expect(res.status).toBe(200);
      expect(res.body.leaders).toHaveLength(1);
      expect(res.body.leaders[0].key).toBe("topScorer");
      expect(res.body.leaders[0].leaders[0].player).toBe("Mbappe");
    });
  });

  describe("GET /whatif/:code", () => {
    const exec = async (code) => {
      return await request(server).get(endpoint + "/whatif/" + code);
    };

    it("should return 404 if no what-if result exists for the code", async () => {
      const res = await exec("nonexistent");
      expect(res.status).toBe(404);
      testResponseText(res.text, "what-if result not found");
    });

    it("should return the what-if result when it exists", async () => {
      const competition = await insertCompetition(competitionID);
      const whatIf = {
        competitionCode: competition.code,
        calculatedAt: new Date(),
        paths: [
          {
            champion: "TeamA",
            topThree: [],
            secondChanceTopThree: [],
          },
        ],
      };
      await WhatIfResult.collection.insertOne(whatIf);

      const res = await exec(competition.code);
      expect(res.status).toBe(200);
      expect(res.body.competitionCode).toBe(competition.code);
      expect(res.body.paths).toHaveLength(1);
      expect(res.body.paths[0].champion).toBe("TeamA");
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
        expect(up.totalPicks).toBe(updatedPredictions[0].totalPicks);
      });
    });
    it("should set lastCalculated on the competition", async () => {
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      const result = await insertResult(competition);
      const before = new Date();
      await exec(getToken(admin._id, admin, "admin"), result.code);
      const updated = await Competition.findOne({ code: competition.code });
      expect(updated.lastCalculated).toBeDefined();
      expect(new Date(updated.lastCalculated).getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
    it("should add rankings separately for second chance competitions", async () => {
      const admin = await insertUser();
      const competition = await insertCompetition(competitionID);
      const result = await insertResult(competition, {
        group: [{ groupName: "A", teamOrder: ["A", "B", "C", "D"] }],
        playoff: [
          { round: 1, teams: ["A", "B", "C", "D"] },
          { round: 2, teams: ["A", "B"] },
        ],
      });
      const pred3 = await insertPrediction({
        competitionID,
        groupPredictions: [],
        playoffPredictions: [],
      });
      const pred2 = await insertPrediction({
        competitionID,
        groupPredictions: [{ groupName: "A", teamOrder: ["D", "B", "C", "A"] }],
        playoffPredictions: [{ round: 1, homeTeam: "D", awayTeam: "B" }],
      });
      const pred1 = await insertPrediction({
        competitionID,
        groupPredictions: [{ groupName: "A", teamOrder: ["A", "B", "C", "D"] }],
        playoffPredictions: [{ round: 1, homeTeam: "A", awayTeam: "B" }],
      });
      const predSc2 = await insertPrediction({
        isSecondChance: true,
        competitionID,
        groupPredictions: [],
        playoffPredictions: [],
      });
      const predSc1 = await insertPrediction({
        isSecondChance: true,
        competitionID,
        groupPredictions: [],
        playoffPredictions: [{ round: 2, homeTeam: "A", awayTeam: "B" }],
      });
      await exec(getToken(admin._id, admin, "admin"), result.code);
      const order = [pred1, pred2, pred3];
      const orderSc = [predSc1, predSc2];
      const updated = await Prediction.find();

      order.forEach((pred, idx) => {
        const thisPred = updated.find(
          (u) => String(u._id) === String(pred._id)
        );
        expect(thisPred.ranking).toBe(idx + 1);
      });
      orderSc.forEach((pred, idx) => {
        const thisPred = updated.find(
          (u) => String(u._id) === String(pred._id)
        );
        expect(thisPred.ranking).toBe(idx + 1);
      });
    });
  });
});
