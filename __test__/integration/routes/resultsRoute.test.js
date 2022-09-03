const request = require("supertest");
const { header, results } = require("../../testData");
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
});
