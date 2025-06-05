/* 
The competitions route does not allow for updating or deleting
Tests can get finicky when trying to manually insert and delete data quickly with multiple tests
beforeAll and afterAll are best to use to ensure the data is where it is expected to be
*/

const request = require("supertest");
const { matches, competitions, header, users } = require("../../testData");
const {
  deleteAllData,
  testAuth,
  getToken,
  testResponseText,
  testObjectID,
  cleanup,
} = require("../../helperFunctions");
const { Competition } = require("../../../models/competitionModel");
const { Match } = require("../../../models/matchModel");
const { User } = require("../../../models/userModel");
const mongoose = require("mongoose");
const { start } = require("../../..");

const endpoint = "/api/v1/matches";
let server;

describe("matchesRoute", () => {
  const userId = mongoose.Types.ObjectId();
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

  const insertData = async () => {
    let competition = { ...competitions[0] };
    competition._id = competitionID;
    await Competition.collection.insertMany([competition]);
    await Match.collection.insertMany(matches);
    let user = { ...users[0] };
    user.role = "admin";
    user._id = userId;
    await User.collection.insertOne(user);
  };

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
    // it("should return the array of matches for the competition bracket code", async () => {
    //   await insertData();
    //   const res = await exec(competitionID);
    //   expect(res.status).toBe(200);
    //   expect(res.body.length).toBe(matches.length);
    // });
  });

  describe("PUT /", () => {
    const exec = async (token, matches) => {
      return await request(server)
        .put(endpoint)
        .send(matches)
        .set(header, token);
    };
    testAuth(exec, "admin");
    it("should update the matches which it is sent", async () => {
      await insertData();
      let matchesToUpdate = [];
      matches.forEach((match) => {
        let m = { ...match };
        m.matchAccepted = true;
        m.homeTeamGoals = 2;
        m.awayTeamGoals = 2;
        matchesToUpdate.push(m);
      });
      const res = await exec(getToken(userId, null, "admin"), matchesToUpdate);
      expect(res.status).toBe(200);
      const updatedMatches = await Match.find();
      updatedMatches.forEach((match) => {
        expect(match.homeTeamGoals).toBe(2);
        expect(match.awayTeamGoals).toBe(2);
        expect(match.matchAccepted).toBe(true);
      });
    });
  });
});
