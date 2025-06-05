const mongoose = require("mongoose");
const request = require("supertest");
const { Group } = require("../../../models/groupModel");
const { Prediction } = require("../../../models/predictionModel");
const { User } = require("../../../models/userModel");
const { pickADate } = require("../../../utils/allowables");
const { saltAndHashPassword, decodeJwt } = require("../../../utils/users");
const {
  testResponseText,
  deleteAllData,
  testAuth,
  getToken,
  insertPredictions,
  insertGroups,
  cleanup,
} = require("../../helperFunctions");
const { users, header } = require("../../testData");
const { start } = require("../../..");

const endpoint = "/api/v1/users";
let server;

describe("usersRoute", () => {
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

  const insertUsers = async () => {
    let insertedUsers = [];
    for (let i = 0; i < users.length; i++) {
      let user = { ...users[i] };
      user.password = await saltAndHashPassword(user.password);
      insertedUsers.push(user);
    }
    await User.collection.insertMany(insertedUsers);
    return insertedUsers;
  };

  const updateUser = async (_id, set) => {
    await User.updateOne({ _id: _id }, { $set: set });
  };

  describe("POST /", () => {
    const exec = async (user) =>
      await request(server).post(endpoint).send(user);

    it("should return 400 if account exists using the email", async () => {
      const insertedUsers = await insertUsers();
      const res = await exec({ email: insertedUsers[0].email });
      expect(res.status).toBe(400);
      testResponseText(res.text, "already");
    });
    it("should return 400 if body is invalid", async () => {
      const res = await exec({ invalidField: "xxx" });
      expect(res.status).toBe(400);
      testResponseText(res.text, "required");
    });
    it("should return 400 if password is invalid", async () => {
      let user = { ...users[0] };
      user.password = "short";
      const res = await exec(user);
      expect(res.status).toBe(400);
      testResponseText(res.text, "password");
    });
    it("should save the user with a hashed password", async () => {
      const res = await exec(users[0]);
      expect(res.status).toBe(200);
      const insertedUser = await User.findOne({ email: users[0].email });
      expect(insertedUser).not.toBeNull();
      expect(insertedUser.password).not.toBe(users[0].password);
    });
  });

  describe("POST /login", () => {
    const exec = async (login) =>
      await request(server)
        .post(endpoint + "/login")
        .send(login);
    it("should return 400 if invalid login info passed", async () => {
      const res = await exec({ invalidField: "xxx" });
      expect(res.status).toBe(400);
      testResponseText(res.text, "email");
    });
    it("should return 400 if user is not found", async () => {
      let user = { ...users[0] };
      delete user.name;
      const res = await exec(user);
      expect(res.status).toBe(400);
      testResponseText(res.text, "invalid");
    });
    it("should return 400 if password does not match", async () => {
      const insertedUsers = await insertUsers();
      let user = { ...insertedUsers[0] };
      delete user.name;
      user.password = "nonmatchingpassword";
      const res = await exec(user);
      expect(res.status).toBe(400);
      testResponseText(res.text, "invalid");
    });
    it("should return a jwt", async () => {
      const insertedUsers = await insertUsers();
      let user = { ...insertedUsers[0] };
      delete user.name;
      user.password = users[0].password;
      const res = await exec(user);
      expect(res.status).toBe(200);
      const { decoded } = decodeJwt(res.text);
      expect(decoded).toHaveProperty("name", insertedUsers[0].name);
      expect(decoded).toHaveProperty("email", user.email);
    });
  });

  describe("GET /", () => {
    const exec = async (token) =>
      await request(server).get(endpoint).set(header, token);
    testAuth(exec);
    it("should return 409 if account not found", async () => {
      const res = await exec(getToken());
      expect(res.status).toBe(409);
      testResponseText(res.text, "account not found");
    });
    it("should return a new jwt", async () => {
      const insertedUsers = await insertUsers();
      const res = await exec(getToken(insertedUsers[0]._id));
      expect(res.status).toBe(200);
      const { decoded } = decodeJwt(res.text);
      expect(decoded).toHaveProperty("name", insertedUsers[0].name);
      expect(decoded).toHaveProperty("email", insertedUsers[0].email);
    });
  });

  describe("DELETE /", () => {
    const exec = async (token) =>
      await request(server).delete(endpoint).set(header, token);
    testAuth(exec);
    it("should return success if account is not found", async () => {
      const res = await exec(getToken());
      expect(res.status).toBe(200);
      testResponseText(res.text, "deleted");
    });
    it("should delete the user and any predictions and groups belonging to that user", async () => {
      const insertedUsers = await insertUsers();
      await insertPredictions(5, insertedUsers[0]._id, null, true);
      const insertedGroups = await insertGroups(4, insertedUsers[0]._id, true);
      // now add groups to all the predictions to test for gorup pull
      await Prediction.updateMany(
        {},
        {
          $set: {
            groups: insertedGroups.map((g) => mongoose.Types.ObjectId(g._id)),
          },
        }
      );

      const res = await exec(getToken(insertedUsers[0]._id));
      expect(res.status).toBe(200);
      expect(res.body.user.deletedCount).toBe(1);
      expect(res.body.predictions.deletedCount).toBe(3);
      expect(res.body.groups.deletedCount).toBe(2);
      expect(res.body.groupsFromPredictions.modifiedCount).toBe(2);
      const allUsers = await User.find();
      expect(allUsers.length).toBe(1);
      const allPredictions = await Prediction.find();
      expect(allPredictions.length).toBe(2);
      const allGroups = await Group.find();
      expect(allGroups.length).toBe(2);
    });
  });

  describe("PUT /", () => {
    const exec = async (token, info) =>
      await request(server).put(endpoint).set(header, token).send(info);
    testAuth(exec);
    it("should return 400 if account not found", async () => {
      const res = await exec(getToken());
      expect(res.status).toBe(400);
      testResponseText(res.text, "account not found");
    });
    it("should return 400 if info sent is invalid", async () => {
      const insertedUsers = await insertUsers();
      const res = await exec(getToken(insertedUsers[0]._id), {
        invalidField: "xxx",
      });
      expect(res.status).toBe(400);
      testResponseText(res.text, "required");
    });
    it("should update the user and return a new token", async () => {
      const insertedUsers = await insertUsers();
      const newName = "Updated Name";
      const res = await exec(getToken(insertedUsers[0]._id), {
        name: newName,
      });
      expect(res.status).toBe(200);
      const { decoded } = decodeJwt(res.text);
      expect(decoded.name).toBe(newName);
      const updatedUser = await User.findById(insertedUsers[0]._id);
      expect(updatedUser.name).toBe(newName);
    });
  });

  describe("PUT /resetpassword/:email", () => {
    const exec = async (email) =>
      await request(server).put(endpoint + "/resetpassword/" + email);
    it("should return 400 if email is not a valid email", async () => {
      const res = await exec("xxx");
      expect(res.status).toBe(400);
      testResponseText(res.text, "valid");
    });
    it("should return the generic message if user not found", async () => {
      const res = await exec(users[0].email);
      expect(res.status).toBe(200);
      testResponseText(res.text, "an email will be sent");
    });
    it("should update the user with the token", async () => {
      const insertedUsers = await insertUsers();
      const res = await exec(insertedUsers[0].email);
      expect(res.status).toBe(200);
      const updatedUser = await User.findOne({ email: insertedUsers[0].email });
      expect(updatedUser).toHaveProperty("passwordReset");
      expect(updatedUser.passwordReset).toMatchObject({
        token: expect.any(String),
        expiration: expect.any(Date),
      });
    });
  });

  describe("PUT /updatepassword", () => {
    const exec = async (resetToken, email, newPassword) =>
      await request(server)
        .put(endpoint + "/updatepassword")
        .send({ token: resetToken, email, password: newPassword });

    it("should return 400 if no user is found with reset token", async () => {
      const res = await exec("xxx");
      expect(res.status).toBe(400);
      testResponseText(res.text, "not requested");
    });
    it("should return 400 if date on token has expired", async () => {
      const insertedUsers = await insertUsers();
      const token = mongoose.Types.ObjectId();
      await updateUser(insertedUsers[0]._id, {
        passwordReset: {
          token,
          expiration: pickADate(-1),
        },
      });
      const res = await exec(token, insertedUsers[0].email);
      expect(res.status).toBe(400);
      testResponseText(res.text, "expired");
    });
    it("should return 400 if new password does not meet requirements", async () => {
      const insertedUsers = await insertUsers();
      const token = mongoose.Types.ObjectId();
      await updateUser(insertedUsers[0]._id, {
        passwordReset: {
          token,
          expiration: pickADate(1),
        },
      });
      const res = await exec(token, insertedUsers[0].email, "pw1");
      expect(res.status).toBe(400);
      testResponseText(res.text, "password must contain");
    });
    it("should update the user with new password and remove token", async () => {
      const insertedUsers = await insertUsers();
      const token = mongoose.Types.ObjectId();
      await updateUser(insertedUsers[0]._id, {
        passwordReset: {
          token,
          expiration: pickADate(1),
        },
      });
      const res = await exec(token, insertedUsers[0].email, "NewPassword1");
      expect(res.status).toBe(200);
      const updatedUser = await User.findById(insertedUsers[0]._id);
      expect(updatedUser.password).not.toBe("NewPassword1");
      expect(updatedUser.passwordReset).toBeNull();
    });
  });
});
