const request = require("supertest");
const { header } = require("../../testData");
const mongoose = require("mongoose");
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
  insertPredictions,
  insertGroups,
} = require("../../helperFunctions");
const { start } = require("../../..");
const { User } = require("../../../models/user.model");
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

  describe("GET /users", () => {
    const exec = async (token, page = 1, limit = 100) =>
      request(server)
        .get(`${endpoint}/users`)
        .query({ page, limit })
        .set(header, token);

    testAuth(exec, "admin");
    it("should return all users with count", async () => {
      await insertUser(null, {
        name: "Beta User",
        email: "beta@dosshouse.test.us",
      });
      await insertUser(null, {
        name: "Alpha User",
        email: "alpha@dosshouse.test.us",
      });
      const res = await exec(getToken(null, user));
      testReponse(res, 200);
      expect(res.body.count).toBe(3);
      expect(res.body.users.length).toBe(3);
    });
    it("should paginate results", async () => {
      await insertUser(null, {
        name: "Beta User",
        email: "beta@dosshouse.test.us",
      });
      await insertUser(null, {
        name: "Alpha User",
        email: "alpha@dosshouse.test.us",
      });
      const res = await exec(getToken(null, user), 1, 2);
      testReponse(res, 200);
      expect(res.body.count).toBe(3);
      expect(res.body.users.length).toBe(2);
    });
    it("should not include password in response", async () => {
      const res = await exec(getToken(null, user));
      testReponse(res, 200);
      expect(res.body.users[0].password).toBeUndefined();
    });
    it("should filter by name case insensitively when search is provided", async () => {
      await insertUser(null, { name: "Alpha User", email: "alpha@dosshouse.test.us" });
      await insertUser(null, { name: "Beta User", email: "beta@dosshouse.test.us" });
      const res = await request(server)
        .get(`${endpoint}/users`)
        .query({ search: "alpha" })
        .set(header, getToken(null, user));
      testReponse(res, 200);
      expect(res.body.count).toBe(1);
      expect(res.body.users[0].name).toBe("Alpha User");
    });
    it("should filter to only google accounts when hasGoogleAccount is true", async () => {
      await insertUser(null, { email: "google@dosshouse.test.us", googleId: "abc123" });
      await insertUser(null, { email: "nongoogle@dosshouse.test.us" });
      const res = await request(server)
        .get(`${endpoint}/users`)
        .query({ hasGoogleAccount: true })
        .set(header, getToken(null, user));
      testReponse(res, 200);
      expect(res.body.count).toBe(1);
      expect(res.body.users[0].email).toBe("google@dosshouse.test.us");
    });
    it("should filter to only non-google accounts when hasGoogleAccount is false", async () => {
      await insertUser(null, { email: "google@dosshouse.test.us", googleId: "abc123" });
      await insertUser(null, { email: "nongoogle@dosshouse.test.us" });
      const res = await request(server)
        .get(`${endpoint}/users`)
        .query({ hasGoogleAccount: false })
        .set(header, getToken(null, user));
      testReponse(res, 200);
      expect(res.body.count).toBe(2);
      expect(res.body.users.find((u) => u.email === "google@dosshouse.test.us")).toBeUndefined();
    });
    it("should filter by email case insensitively when search is provided", async () => {
      await insertUser(null, { name: "Alpha User", email: "alpha@dosshouse.test.us" });
      await insertUser(null, { name: "Beta User", email: "beta@dosshouse.test.us" });
      const res = await request(server)
        .get(`${endpoint}/users`)
        .query({ search: "BETA@" })
        .set(header, getToken(null, user));
      testReponse(res, 200);
      expect(res.body.count).toBe(1);
      expect(res.body.users[0].name).toBe("Beta User");
    });
    it("should sort by name ascending by default", async () => {
      await insertUser(null, { name: "Charlie", email: "charlie@dosshouse.test.us" });
      await insertUser(null, { name: "Alpha", email: "alpha@dosshouse.test.us" });
      await insertUser(null, { name: "Beta", email: "beta@dosshouse.test.us" });
      const res = await exec(getToken(null, user));
      testReponse(res, 200);
      const names = res.body.users.map((u) => u.name);
      expect(names).toEqual([...names].sort());
    });
    it("should sort by name descending when sort=name&order=desc", async () => {
      await insertUser(null, { name: "Charlie", email: "charlie@dosshouse.test.us" });
      await insertUser(null, { name: "Alpha", email: "alpha@dosshouse.test.us" });
      const res = await request(server)
        .get(`${endpoint}/users`)
        .query({ sort: "name", order: "desc" })
        .set(header, getToken(null, user));
      testReponse(res, 200);
      const names = res.body.users.map((u) => u.name);
      expect(names).toEqual([...names].sort().reverse());
    });
    it("should sort by email when sort=email", async () => {
      await insertUser(null, { name: "User B", email: "b@dosshouse.test.us" });
      await insertUser(null, { name: "User A", email: "a@dosshouse.test.us" });
      const res = await request(server)
        .get(`${endpoint}/users`)
        .query({ sort: "email" })
        .set(header, getToken(null, user));
      testReponse(res, 200);
      const emails = res.body.users.map((u) => u.email);
      expect(emails).toEqual([...emails].sort());
    });
    it("should fall back to name sort for an invalid sort field", async () => {
      await insertUser(null, { name: "Charlie", email: "charlie@dosshouse.test.us" });
      await insertUser(null, { name: "Alpha", email: "alpha@dosshouse.test.us" });
      const res = await request(server)
        .get(`${endpoint}/users`)
        .query({ sort: "invalidField" })
        .set(header, getToken(null, user));
      testReponse(res, 200);
      const names = res.body.users.map((u) => u.name);
      expect(names).toEqual([...names].sort());
    });
  });

  describe("DELETE /users/:id", () => {
    const exec = async (token, id) =>
      request(server).delete(`${endpoint}/users/${id}`).set(header, token);

    testAuth(exec, "admin");

    it("should return 400 if invalid object id sent", async () => {
      const res = await exec(getToken(null, user), "xxx");
      testReponse(res, 400, "invalid id");
    });

    it("should return 403 if the target user is an admin", async () => {
      const adminTarget = await insertUser(null, {
        email: "admin2@dosshouse.test.us",
        role: "admin",
      });
      const res = await exec(getToken(null, user), adminTarget._id);
      testReponse(res, 403, "cannot delete an admin");
    });
    it("should return success if user is not found", async () => {
      const res = await exec(getToken(null, user), mongoose.Types.ObjectId());
      testReponse(res, 200);
      expect(res.text.toLowerCase()).toContain("deleted");
    });

    it("should delete the target user", async () => {
      const target = await insertUser(null, {
        email: "target@dosshouse.test.us",
      });
      const res = await exec(getToken(null, user), target._id);
      testReponse(res, 200);
      expect(res.body.user.deletedCount).toBe(1);
      const remaining = await User.find();
      expect(remaining.length).toBe(1);
      expect(remaining[0].email).toBe(user.email);
    });

    it("should delete predictions and groups belonging to the target user", async () => {
      const target = await insertUser(null, {
        email: "target@dosshouse.test.us",
      });
      await insertPredictions(4, target._id, null, true);
      const groups = await insertGroups(4, target._id, true);
      await Prediction.updateMany(
        {},
        { $set: { groups: groups.map((g) => mongoose.Types.ObjectId(g._id)) } },
      );

      const res = await exec(getToken(null, user), target._id);
      testReponse(res, 200);
      expect(res.body.user.deletedCount).toBe(1);
      expect(res.body.predictions.deletedCount).toBe(2);
      expect(res.body.groups.deletedCount).toBe(2);
      expect(res.body.groupsFromPredictions.modifiedCount).toBe(2);
      expect(await User.countDocuments()).toBe(1);
    });

    it("should not delete the admin user or their data", async () => {
      const target = await insertUser(null, {
        email: "target@dosshouse.test.us",
      });
      await insertPredictions(2, target._id);
      const res = await exec(getToken(null, user), target._id);
      testReponse(res, 200);
      expect(await User.countDocuments()).toBe(1);
      const remaining = await User.findOne();
      expect(remaining.email).toBe(user.email);
    });
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
        "New Team",
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
        "New Team",
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
        "New Team",
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
