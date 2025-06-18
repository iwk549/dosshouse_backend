const request = require("supertest");
const { header } = require("../../testData");
const {
  testAuth,
  deleteAllData,
  cleanup,
  getToken,
  insertUser,
  testReponse,
  insertCompetition,
  insertMatch,
  insertPrediction,
  insertResult,
} = require("../../helperFunctions");
const { start } = require("../../..");
const { Match } = require("../../../models/match.model");
const { Prediction } = require("../../../models/prediction.model");
const { Result } = require("../../../models/result.model");

const endpoint = "/api/v1/admin";
let server;
let user;

describe("groupsRoute", () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV === "test") {
      server = await start();
    } else throw "Not in test environment";
  });
  afterAll(async () => {
    await cleanup(server);
  });
  beforeEach(async () => {
    user = await insertUser(null, { role: "admin" });
  });
  afterEach(async () => {
    await deleteAllData();
  });

  describe("PUT /teamname", () => {
    const exec = async (token, bracketCode, oldTeamName, newTeamName) =>
      request(server)
        .put(endpoint + "/teamname")
        .set(header, token)
        .send({ bracketCode, oldTeamName, newTeamName });

    testAuth(exec, "admin");
    it("should return 404 if the competition is not found", async () => {
      const res = await exec(getToken(null, user));
      testReponse(res, 404, "competition not found");
    });
    it("should return 400 if old team name is not provided", async () => {
      const comp = await insertCompetition();
      const res = await exec(getToken(null, user), comp.code);
      testReponse(res, 400, "old and new");
    });
    it("should return 400 if new team name is not provided", async () => {
      const comp = await insertCompetition();
      const res = await exec(getToken(null, user), comp.code, "Team A");
      testReponse(res, 400, "old and new");
    });
    it("should update matches for home and away teams", async () => {
      const comp = await insertCompetition();
      await insertMatch({ bracketCode: comp.code, homeTeamName: "Old Team" });
      await insertMatch({ bracketCode: comp.code, awayTeamName: "Old Team" });

      const res = await exec(
        getToken(null, user),
        comp.code,
        "Old Team",
        "New Team"
      );
      testReponse(res, 200);
      expect(res.body.matches.modifiedCount).toBe(2);
      const updatedMatches = await Match.find();
      expect(updatedMatches[0].homeTeamName).toBe("New Team");
      expect(updatedMatches[1].awayTeamName).toBe("New Team");
    });
    it("should update predictions", async () => {
      const comp = await insertCompetition();
      await insertPrediction({
        competitionID: comp._id,
        groupPredictions: [
          { groupName: "A", teamOrder: ["Old Team", "Other Team"] },
          { groupName: "B", teamOrder: ["Other Team", "Other Team"] },
          { groupName: "C", teamOrder: ["Other Team", "Old Team"] },
        ],
        playoffPredictions: [
          { matchNumber: 1, homeTeam: "Old Team", awayTeam: "Other Team" },
          { matchNumber: 2, homeTeam: "Other Team", awayTeam: "Other Team" },
          { matchNumber: 3, homeTeam: "Other Team", awayTeam: "Old Team" },
        ],
        misc: {
          winner: "Old Team",
          goldenBoot: "Other Team",
          otherKey: "Old Team",
        },
      });

      const res = await exec(
        getToken(null, user),
        comp.code,
        "Old Team",
        "New Team"
      );
      testReponse(res, 200);
      expect(res.body.predictions.nModified).toBe(1);
      const updatePred = await Prediction.findOne();
      expect(updatePred.groupPredictions).toEqual([
        { groupName: "A", teamOrder: ["New Team", "Other Team"] },
        { groupName: "B", teamOrder: ["Other Team", "Other Team"] },
        { groupName: "C", teamOrder: ["Other Team", "New Team"] },
      ]);
      expect(updatePred.playoffPredictions).toEqual([
        { matchNumber: 1, homeTeam: "New Team", awayTeam: "Other Team" },
        { matchNumber: 2, homeTeam: "Other Team", awayTeam: "Other Team" },
        { matchNumber: 3, homeTeam: "Other Team", awayTeam: "New Team" },
      ]);
      expect(updatePred.misc).toEqual({
        winner: "New Team",
        goldenBoot: "Other Team",
        otherKey: "New Team",
      });
    });
    it("should update the results", async () => {
      const comp = await insertCompetition();
      await insertResult({
        code: comp.code,
        group: [
          { teamOrder: ["Old Team", "Old Team"] },
          { teamOrder: ["Old Team", "Other Team"] },
        ],
        playoff: [
          { teams: ["Old Team", "Other Team", "Old Team"] },
          { teams: ["Old Team", "Other Team", "Other Team"] },
        ],
        misc: {
          winner: "Old Team",
          goldenBoot: "Other Team",
          otherKey: "Old Team",
        },
      });

      const res = await exec(
        getToken(null, user),
        comp.code,
        "Old Team",
        "New Team"
      );
      testReponse(res, 200);

      const updatedResult = await Result.findOne();
      expect(updatedResult.group).toEqual([
        { teamOrder: ["New Team", "New Team"] },
        { teamOrder: ["New Team", "Other Team"] },
      ]);
      expect(updatedResult.playoff).toEqual([
        { teams: ["New Team", "Other Team", "New Team"] },
        { teams: ["New Team", "Other Team", "Other Team"] },
      ]);
      expect(updatedResult.misc).toEqual({
        winner: "New Team",
        goldenBoot: "Other Team",
        otherKey: "New Team",
      });
    });
  });
});
