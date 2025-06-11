const { User } = require("../models/user.model");
const { saltAndHashPassword } = require("../utils/users");

require("../startup/db")(process.env.NODE_ENV);

async function setupDev() {
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
