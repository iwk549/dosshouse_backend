const request = require("supertest");
const { groups, header, predictions } = require("../../testData");
const {
  testResponseText,
  getToken,
  testAuth,
  deleteAllData,
  testObjectID,
  insertCompetition,
} = require("../../helperFunctions");
const { Group } = require("../../../models/groupModel");
const { Prediction } = require("../../../models/predictionModel");
const mongoose = require("mongoose");

const endpoint = "/api/v1/groups";
let server;

describe("groupsRoute", () => {
  const userID = mongoose.Types.ObjectId();
  const competitionID = mongoose.Types.ObjectId();
  beforeEach(async () => {
    if (process.env.NODE_ENV === "test") server = require("../../../index");
    else throw "Not in test environment";
  });
  afterEach(() => {
    server.close();
    deleteAllData();
  });

  const insertGroups = async (count, ownerID) => {
    let groups = [];
    for (let i = 0; i < count; i++) {
      let group = {
        _id: mongoose.Types.ObjectId(),
        ownerID: ownerID || mongoose.Types.ObjectId(),
        name: `Group ${i + 1}`,
        passcode: "passcode",
        competitionID: mongoose.Types.ObjectId(),
      };
      groups.push(group);
    }
    await Group.collection.insertMany(groups);
    return groups;
  };

  describe("POST /", () => {
    beforeEach(async () => {
      await insertCompetition(competitionID);
    });
    const exec = async (token, group) =>
      await request(server).post(endpoint).set(header, token).send(group);

    testAuth(exec);
    it("should return 400 if user has alread created too many groups", async () => {
      await insertGroups(5, userID);
      const res = await exec(getToken(userID));
      expect(res.status).toBe(400);
      testResponseText(res.text, "maximum");
    });
    it("should return 400 if group schema is invalid", async () => {
      const res = await exec(getToken(), {
        competitionID,
        invalidField: "xxx",
      });
      expect(res.status).toBe(400);
      testResponseText(res.text, "required");
    });
    it("should return 400 if name is too long", async () => {
      const res = await exec(getToken(), {
        name: "a".repeat(51),
        passcode: "passcode",
        competitionID,
      });
      expect(res.status).toBe(400);
    });
    it("should insert the group if all valid", async () => {
      const res = await exec(getToken(), { ...groups[0], competitionID });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ insertedId: expect.any(String) });
      const insertedGroup = await Group.findById(res.body.insertedId);
      expect(insertedGroup).not.toBeNull();
    });
  });

  describe("GET /", () => {
    // this route to retrieve groups owner by the user
    const exec = async (token) =>
      await request(server).get(endpoint).set(header, token);
    testAuth(exec);
    it("should return all the groups for the user and not return passcode", async () => {
      await insertGroups(2, userID);
      const res = await exec(getToken(userID));
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).not.toHaveProperty("passcode");
      expect(res.body[1]).not.toHaveProperty("passcode");
    });
  });

  describe("PUT /:id", () => {
    const exec = async (token, id, group) =>
      await request(server)
        .put(endpoint + "/" + id)
        .set(header, token)
        .send(group);

    testAuth(exec);
    testObjectID(exec, true);
    it("should return 404 if group not found", async () => {
      const res = await exec(getToken(), mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "not found");
    });
    it("should return 403 if group does not belong to user", async () => {
      const groups = await insertGroups(1);
      const res = await exec(getToken(), groups[0]._id);
      expect(res.status).toBe(403);
      testResponseText(res.text, "group owner");
    });
    it("should return 400 if invalid group sent", async () => {
      const groups = await insertGroups(1, userID);
      const res = await exec(getToken(userID), groups[0]._id, {
        invalidField: "xxx",
      });
      expect(res.status).toBe(400);
      testResponseText(res.text, "required");
    });
    it("should update the group", async () => {
      const groups = await insertGroups(1, userID);
      const res = await exec(getToken(userID), groups[0]._id, {
        name: "New Name",
        passcode: "new passcode",
      });
      expect(res.status).toBe(200);
      const updatedGroup = await Group.findById(groups[0]._id);
      expect(updatedGroup.name).toBe("New Name");
      expect(updatedGroup.passcode).toBe("new passcode");
    });
  });

  describe("DELETE /:id", () => {
    const exec = async (token, id) =>
      await request(server)
        .delete(endpoint + "/" + id)
        .set(header, token);

    testAuth(exec);
    testObjectID(exec, true);
    it("should return 403 if group does not belong to user", async () => {
      const groups = await insertGroups(1);
      const res = await exec(getToken(), groups[0]._id);
      expect(res.status).toBe(403);
      testResponseText(res.text, "group owner");
    });
    it("should delete the group and remove groupID form all predictions", async () => {
      const insertedGroups = await insertGroups(2, userID);
      let newPredictions = [];
      predictions.forEach((p) => {
        let prediction = { ...p };
        prediction.groups = insertedGroups.map((g) => g._id);
        newPredictions.push(prediction);
      });
      await Prediction.collection.insertMany(newPredictions);
      const res = await exec(getToken(userID), insertedGroups[0]._id);
      expect(res.status).toBe(200);
      const updatedGroups = await Group.find();
      expect(updatedGroups.length).toBe(insertedGroups.length - 1);
      const updatedPredictions = await Prediction.find({
        groups: insertedGroups[0]._id,
      }).select("groups");
      expect(updatedPredictions.length).toBe(0);
    });
  });
});
