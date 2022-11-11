const mongoose = require("mongoose");
const request = require("supertest");
const { User } = require("../../../models/userModel");
const {
  Version,
  dosshouseVersionStringID,
} = require("../../../models/versionModel");
const {
  testResponseText,
  deleteAllData,
  testAuth,
  getToken,
} = require("../../helperFunctions");
const { users, header, versions } = require("../../testData");

const endpoint = "/api/v1/versions";
let server;

describe("usersRoute", () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV === "test") server = require("../../../index");
    else throw "Not in test environment";
  });
  afterAll(() => {
    server.close();
  });
  afterEach(() => {
    deleteAllData();
  });

  const user = { ...users[0] };
  user._id = mongoose.Types.ObjectId();
  user.role = "admin";

  describe("GET /", () => {
    const exec = async () => await request(server).get(endpoint);

    it("should return null if version is not present", async () => {
      const res = await exec();
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("major");
    });
    it("should return only the major minor and patch fields", async () => {
      const version = { ...versions[0] };
      version.stringID = dosshouseVersionStringID;
      await Version.insertMany([version]);
      const res = await exec();
      expect(res.status).toBe(200);
      delete version.stringID;
      expect(res.body).toMatchObject(version);
      expect(res.body).not.toHaveProperty("stringID");
    });
  });

  describe("POST /", () => {
    beforeEach(async () => {
      await User.insertMany([user]);
    });
    const exec = async (token, version) =>
      await request(server).post(endpoint).set(header, token).send(version);

    testAuth(exec, "admin");

    it("should return 400 if wrong versionID is passed", async () => {
      const res = await exec(getToken(null, user, "admin"));
      expect(res.status).toBe(400);
      testResponseText(res.text, "incorrect version id");
    });
    it("should return 400 if invalid version is passed", async () => {
      const res = await exec(getToken(null, user, "admin"), {
        stringID: dosshouseVersionStringID,
        invalidField: "xxx",
      });
      expect(res.status).toBe(400);
      testResponseText(res.text, "not a valid");
    });
    it("should insert the version if it doesn't already exist", async () => {
      // check if version exists
      const version = await Version.findOne({
        stringID: dosshouseVersionStringID,
      });
      expect(version).toBeNull();

      // post the version then check again
      let newVersion = { ...versions[0] };
      newVersion.stringID = dosshouseVersionStringID;
      const res = await exec(getToken(null, user, "admin"), newVersion);
      expect(res.status).toBe(200);
      const insertedVersion = await Version.findOne({
        stringID: dosshouseVersionStringID,
      });
      expect(insertedVersion).not.toBeNull();
      expect(insertedVersion).toMatchObject(newVersion);
    });
    it("should update the version if it already exists", async () => {
      let version = { ...versions[0] };
      version.stringID = dosshouseVersionStringID;
      await Version.insertMany([version]);
      version.patch = version.patch + 1;

      const res = await exec(getToken(null, user, "admin"), version);
      expect(res.status).toBe(200);
      const updatedVersion = await Version.findOne({
        stringID: dosshouseVersionStringID,
      });
      expect(updatedVersion.patch).toBe(version.patch);
    });
  });
});
