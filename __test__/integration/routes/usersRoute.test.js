const mongoose = require("mongoose");
const request = require("supertest");
const { User } = require("../../../models/userModel");
const { pickADate } = require("../../../utils/allowables");
const {
  testResponseText,
  testObjectID,
  deleteAllData,
} = require("../../helperFunctions");
const { users } = require("../../testData");

const endpoint = "/api/v1/users";
let server;

describe("usersRoute", () => {
  beforeEach(async () => {
    if (process.env.NODE_ENV === "test") server = require("../../../index");
    else throw "Not in test environment";
  });
  afterEach(() => {
    server.close();
    deleteAllData();
  });

  const insertUsers = async () => {
    let insertedUsers = [];
    users.forEach((u) => {
      let user = { ...u };
      insertedUsers.push(user);
    });
    await User.collection.insertMany(users);
    return insertedUsers;
  };

  const updateUser = async (_id, set) => {
    await User.updateOne({ _id: _id }, { $set: set });
  };

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
