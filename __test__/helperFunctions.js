const { User } = require("../models/userModel");
const { users } = require("./testData");

function testResponseText(responseText, expectedToContain) {
  expect(responseText.toLowerCase()).toEqual(
    expect.stringContaining(expectedToContain)
  );
}

function getToken(_id, user, role = "") {
  const newUser = new User(user || users[0]);
  newUser._id = _id || newUser._id;
  if (role) newUser.role = role;
  return newUser.generateAuthToken();
}

function testAuth(exec, role) {
  it("should return 400 if invalid token passed", async () => {
    const res = await exec("xxx");
    expect(res.status).toBe(400);
    testResponseText(res.text, "invalid");
  });
  it("should return 401 if no token sent", async () => {
    const res = await exec("");
    expect(res.status).toBe(401);
    testResponseText(res.text, "provided");
  });
  if (role) {
    if (role.includes("admin")) {
      it("should return 403 if user is not admin", async () => {
        const res = await exec(getToken());
        expect(res.status).toBe(403);
        testResponseText(res.text, "access denied");
      });
    }
  }
}

function testObjectID(exec) {
  it("should return 400 if invalid object id sent", async () => {
    const res = await exec("xxx");
    expect(res.status).toBe(400);
    testResponseText(res.text, "invalid");
  });
}

module.exports.testResponseText = testResponseText;
module.exports.getToken = getToken;
module.exports.testAuth = testAuth;
module.exports.testObjectID = testObjectID;
