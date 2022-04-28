const request = require("supertest");
const { matches, competitions } = require("../../testData");
const {
  testResponseText,
  testObjectID,
  deleteAllData,
} = require("../../helperFunctions");
const { Competition } = require("../../../models/competitionModel");
const { Match } = require("../../../models/matchModel");
const mongoose = require("mongoose");

const endpoint = "/api/v1/matches";
let server;

describe("matchesRoute", () => {
  beforeEach(async () => {
    if (process.env.NODE_ENV === "test") server = require("../../../index");
    else throw "Not in test environment";
    await Competition.collection.insertMany(competitions);
    await Match.collection.insertMany(matches);
  });
  afterEach(() => {
    server.close();
    deleteAllData();
  });

  describe("GET /:id", () => {
    const exec = async (id) => {
      return await request(server).get(endpoint + "/" + id);
    };
    testObjectID(exec);
    it("should return 404 if the competition is not found", async () => {
      const res = await exec(mongoose.Types.ObjectId());
      expect(res.status).toBe(404);
      testResponseText(res.text, "not found");
    });
    it("should return the array of matches for the competition bracket code", async () => {
      const res = await exec(competitions[0]._id);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(matches.length);
    });
  });
});
