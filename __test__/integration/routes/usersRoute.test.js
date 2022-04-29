const request = require("supertest");
const { User } = require("../../../models/userModel");
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
      console.log(updatedUser);
      expect(updatedUser).toHaveProperty("passwordResetToken");
    });
  });
});
