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
  insertUser,
  testReponse,
} = require("../../helperFunctions");
const { Competition } = require("../../../models/competitionModel");
const { Match } = require("../../../models/matchModel");
const { User } = require("../../../models/userModel");
const mongoose = require("mongoose");
const { start } = require("../../..");
const fs = require("fs");

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
    it("should return the array of matches for the competition bracket code", async () => {
      await insertData();
      const res = await exec(competitionID);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(matches.length);
    });
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

  describe("PUT /csv", () => {
    afterEach(() => {
      try {
        fs.unlinkSync("test.csv");
      } catch (error) {
        //
      }
    });

    const exec = async (token, filePath) => {
      if (filePath) {
        // fs.writeFileSync("test.csv", file);
        return request(server)
          .put(endpoint + "/csv")
          .set(header, token)
          .attach("file", filePath);
      } else {
        return request(server)
          .put(endpoint + "/csv")
          .set(header, token);
      }
    };
    testAuth(exec, "admin");
    it("should return 400 if no file is attached", async () => {
      const user = await insertUser(userId, { role: "admin" });
      const res = await exec(getToken(null, user, "admin"));
      testReponse(res, 400, "no file");
    });
    it("should return 400 with the invalid lines", async () => {
      const user = await insertUser(userId, { role: "admin" });
      const res = await exec(
        getToken(null, user, "admin"),
        "__test__/testMatches_invalid.csv"
      );
      testReponse(res, 400);
      expect(res.body.length).toBe(5);
    });
    it("should insert new matches", async () => {
      const user = await insertUser(userId, { role: "admin" });
      const res = await exec(
        getToken(null, user, "admin"),
        "__test__/testMatches.csv"
      );
      testReponse(res, 200);
      expect(res.body.nUpserted).toBe(7);

      const upsertedMatches = await Match.find();
      expect(upsertedMatches.length).toBe(7);
    });
    it("should update existing matches", async () => {
      const user = await insertUser(userId, { role: "admin" });
      await exec(getToken(null, user, "admin"), "__test__/testMatches.csv");
      await Match.updateOne(
        { matchNumber: 1 },
        { $set: { homeTeamName: "a different name" } }
      );

      const res = await exec(
        getToken(null, user, "admin"),
        "__test__/testMatches.csv"
      );
      testReponse(res, 200);
      expect(res.body.nModified).toBe(1);

      const updatedMatch = await Match.findOne({ matchNumber: 1 });
      expect(updatedMatch.homeTeamName).toBe("Team A");
    });
    it("should update the matches with goals and accepted status", async () => {
      const user = await insertUser(userId, { role: "admin" });
      await exec(getToken(null, user, "admin"), "__test__/testMatches.csv");

      const res = await exec(
        getToken(null, user, "admin"),
        "__test__/testMatches_updated.csv"
      );
      testReponse(res, 200);
      expect(res.body.nModified).toBe(7);

      const updatedMatches = await Match.find();

      expect(updatedMatches[0].homeTeamGoals).toBe(1);
      expect(updatedMatches[0].awayTeamGoals).toBe(0);
      expect(updatedMatches[1].homeTeamGoals).toBe(2);
      expect(updatedMatches[1].awayTeamGoals).toBe(0);
      expect(updatedMatches[2].homeTeamGoals).toBe(3);
      expect(updatedMatches[2].awayTeamGoals).toBe(0);
      expect(updatedMatches[3].homeTeamGoals).toBe(4);
      expect(updatedMatches[3].awayTeamGoals).toBe(0);

      expect(updatedMatches[4].homeTeamName).toBe("Team A");
      expect(updatedMatches[4].homeTeamPKs).toBe(1);
      expect(updatedMatches[4].awayTeamName).toBe("Team E");
      expect(updatedMatches[4].awayTeamPKs).toBe(0);

      expect(updatedMatches[5].homeTeamName).toBe("Team G");
      expect(updatedMatches[5].homeTeamPKs).toBe(2);
      expect(updatedMatches[5].awayTeamName).toBe("Team C");
      expect(updatedMatches[5].awayTeamPKs).toBe(0);

      expect(updatedMatches[6].homeTeamName).toBe("Team A");
      expect(updatedMatches[6].homeTeamPKs).toBe(undefined);
      expect(updatedMatches[6].homeTeamGoals).toBe(undefined);
      expect(updatedMatches[6].awayTeamName).toBe("Team G");
      expect(updatedMatches[6].awayTeamPKs).toBe(undefined);
      expect(updatedMatches[6].awayTeamGoals).toBe(undefined);
    });
  });
});
