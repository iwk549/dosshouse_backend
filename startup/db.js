const config = require("config");
const mongoose = require("mongoose");

module.exports = async function (env) {
  let db;
  if (env !== "test") db = config.get("db");
  else db = "mongodb://localhost/dosshouse_tests";

  mongoose
    .connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() =>
      console.log(
        `Connected to ${
          process.env.NODE_ENV !== "production" ? db : "database"
        }...`
      )
    );
};
