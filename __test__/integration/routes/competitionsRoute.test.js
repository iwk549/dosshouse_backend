const request = require("supertest");
const { competitions } = require("../../testData");
const {
  testResponseText,
  testObjectID,
  deleteAllData,
} = require("../../helperFunctions");
const { Competition } = require("../../../models/competitionModel");
const mongoose = require("mongoose");

const endpoint = "/api/v1/competitions";
let server;

describe("competitionsRoute", () => {
  beforeEach(() => {
    if (process.env.NODE_ENV === "test") server = require("../../../index");
    else throw "Not in test environment";
  });
  afterEach(() => {
    server.close();
    deleteAllData();
  });

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
      await insertCompetitions(2);
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
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
      await insertCompetitions(2);
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(0);
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
      await insertCompetitions();
      const res = await exec(competitions[0]._id);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(competitions[0].name);
    });
  });
});
