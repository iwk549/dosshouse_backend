/* 
The competitions route does not allow for updating or deleting
Tests can get finicky when trying to manually insert and delete data quickly with multiple tests
Each describe block must have it's own beforeAll and afterAll calls to ensure data validity
*/

const request = require("supertest");
const { competitions } = require("../../testData");
const {
  testResponseText,
  testObjectID,
  deleteAllData,
  cleanup,
} = require("../../helperFunctions");
const { Competition } = require("../../../models/competitionModel");
const mongoose = require("mongoose");
const { start } = require("../../../index");

const endpoint = "/api/v1/competitions";
let server;

describe("competitionsRoute", () => {
  const insertCompetitions = async (activeCount) => {
    let newCompetitions = [];
    competitions.forEach((c, idx) => {
      let competition = { ...c };
      competition.competitionEnd = new Date(
        idx < activeCount
          ? new Date().setDate(new Date().getDate() + 1)
          : new Date().setDate(new Date().getDate() - 1)
      );
      newCompetitions.push(competition);
    });
    await Competition.collection.insertMany(newCompetitions);
  };

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

  describe("GET /active", () => {
    const exec = async () => {
      return await request(server).get(endpoint + "/active");
    };

    it("should return an empty array when no competitions are present", async () => {
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });
    it("should return only the active competitions", async () => {
      const activeCount = 2;
      await insertCompetitions(activeCount);
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(activeCount);
    });
  });
  describe("GET /expired", () => {
    const exec = async () => {
      return await request(server).get(endpoint + "/expired");
    };
    it("should return an empty array when no competitions are present", async () => {
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
    });
    it("should return only the expired competitions", async () => {
      const activeCount = 0;
      await insertCompetitions(activeCount);
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(competitions.length - activeCount);
    });
  });
  describe("GET /single/:id", () => {
    const exec = async (id) => {
      return await request(server).get(endpoint + "/single/" + id);
    };
    testObjectID(exec);
    it("should return 404 if the competition is not found", async () => {
      const res = await exec(new mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "not found");
    });
    it("should return the competition if it exists", async () => {
      await insertCompetitions(2);
      const res = await exec(competitions[0]._id);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(competitions[0].name);
    });
  });
});
