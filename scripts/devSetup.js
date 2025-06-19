const { User } = require("../models/user.model");
const { Competition } = require("../models/competition.model");
const { saltAndHashPassword } = require("../utils/users");
const competitions = require("../data/activeCompetitions.json");
const { default: mongoose } = require("mongoose");

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

  let comps = [];
  competitions.forEach((comp) => {
    let upComp = { ...comp };
    upComp._id = mongoose.Types.ObjectId(upComp._id.$oid);
    upComp.submissionDeadline = new Date(upComp.submissionDeadline.$date);
    upComp.competitionStart = new Date(upComp.competitionStart.$date);
    upComp.competitionEnd = new Date(upComp.competitionEnd.$date);
    comps.push(upComp);
  });
  await Competition.insertMany(comps);

  process.exit();
}

setupDev();
