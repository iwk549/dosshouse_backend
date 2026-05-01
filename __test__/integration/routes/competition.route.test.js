const request = require("supertest");
const { competitions } = require("../../testData");
const {
  testResponseText,
  testObjectID,
  deleteAllData,
  cleanup,
  getToken,
  testAuth,
  insertUser,
} = require("../../helperFunctions");
const { Competition } = require("../../../models/competition.model");
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
          : new Date().setDate(new Date().getDate() - 1),
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
    it("should not include groupMatrix on returned competitions", async () => {
      await insertCompetitions(competitions.length);
      const res = await exec();
      expect(res.status).toBe(200);
      const seeded = competitions.find((c) => c.groupMatrix?.length);
      expect(seeded).toBeDefined();
      const returned = res.body.find((c) => c.code === seeded.code);
      expect(returned).toBeDefined();
      expect(returned.groupMatrix).toBeUndefined();
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
    it("should not include groupMatrix on returned competitions", async () => {
      await insertCompetitions(0);
      const res = await exec();
      expect(res.status).toBe(200);
      const seeded = competitions.find((c) => c.groupMatrix?.length);
      expect(seeded).toBeDefined();
      const returned = res.body.find((c) => c.code === seeded.code);
      expect(returned).toBeDefined();
      expect(returned.groupMatrix).toBeUndefined();
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
    it("should include groupMatrix on the returned competition", async () => {
      await insertCompetitions(competitions.length);
      const seeded = competitions.find((c) => c.groupMatrix?.length);
      expect(seeded).toBeDefined();
      const res = await exec(seeded._id);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.groupMatrix)).toBe(true);
      expect(res.body.groupMatrix.length).toBe(seeded.groupMatrix.length);
    });
  });

  describe("PUT /:code/misc-pick/:name", () => {
    let adminToken;
    const validBody = {
      homeTeamName: "Croatia",
      awayTeamName: "Morocco",
      homeTeamGoals: 2,
      awayTeamGoals: 1,
      homeTeamPKs: null,
      awayTeamPKs: null,
      matchAccepted: true,
      location: "Stadium",
      dateTime: "2022-12-17T15:00:00.000Z",
    };

    const exec = async (token, code, name, body) => {
      return await request(server)
        .put(`${endpoint}/${code}/misc-pick/${name}`)
        .set("x-auth-token", token)
        .send(body || validBody);
    };

    beforeEach(async () => {
      const user = await insertUser(null, { role: "admin" });
      adminToken = getToken(user._id, user, "admin");
      await insertCompetitions(1);
    });

    testAuth((token) => exec(token, competitions[0].code, "thirdPlace"));

    it("should return 403 if user is not admin", async () => {
      const res = await exec(getToken(), competitions[0].code, "thirdPlace");
      expect(res.status).toBe(403);
      testResponseText(res.text, "access denied");
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await exec(adminToken, competitions[0].code, "thirdPlace", {
        homeTeamName: "Croatia",
      });
      expect(res.status).toBe(400);
    });

    it("should return 404 if competition is not found", async () => {
      const res = await exec(adminToken, "NOTEXIST", "thirdPlace");
      expect(res.status).toBe(404);
      testResponseText(res.text, "competition not found");
    });

    it("should return 404 if misc pick name does not exist", async () => {
      const res = await exec(adminToken, competitions[0].code, "nonExistent");
      expect(res.status).toBe(404);
      testResponseText(res.text, "misc pick not found");
    });

    it("should update the misc pick info and return it", async () => {
      const res = await exec(adminToken, competitions[0].code, "thirdPlace");
      expect(res.status).toBe(200);
      expect(res.body.homeTeamName).toBe("Croatia");
      expect(res.body.awayTeamName).toBe("Morocco");
      expect(res.body.matchAccepted).toBe(true);
    });

    it("should persist the update to the database", async () => {
      await exec(adminToken, competitions[0].code, "thirdPlace");
      const updated = await Competition.findOne({ code: competitions[0].code });
      const pick = updated.miscPicks.find((p) => p.name === "thirdPlace");
      expect(pick.info.homeTeamName).toBe("Croatia");
      expect(pick.info.matchAccepted).toBe(true);
    });

    it("should merge with existing info rather than replacing it", async () => {
      await exec(adminToken, competitions[0].code, "thirdPlace", {
        ...validBody,
        homeTeamGoals: 3,
      });
      const updated = await Competition.findOne({ code: competitions[0].code });
      const pick = updated.miscPicks.find((p) => p.name === "thirdPlace");
      expect(pick.info.homeTeamGoals).toBe(3);
      expect(pick.info.homeTeamName).toBe("Croatia");
    });
  });
});
