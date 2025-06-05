const { User } = require("../models/userModel");
const { Version, dosshouseVersionStringID } = require("../models/versionModel");
const { saltAndHashPassword } = require("../utils/users");

require("../startup/db")(process.env.NODE_ENV);

async function setupDev() {
  await Version.updateOne(
    { stringID: dosshouseVersionStringID },
    {
      $set: {
        major: 1,
        minor: 0,
        patch: 0,
      },
    },
    { upsert: true }
  );

  const password = await saltAndHashPassword("Password1");
  await User.updateOne(
    {
      email: "test1@test.com",
    },
    {
      $set: {
        name: "Test Admin",
        password,
        role: "admin",
      },
    },
    { upsert: true }
  );

  process.exit();
}

setupDev();
