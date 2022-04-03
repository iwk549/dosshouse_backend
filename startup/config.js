const config = require("config");

// db, jwtPrivateKey, versionID are required to start the app
module.exports = function () {
  if (!config.get("jwtPrivateKey")) {
    console.log("jwt");
    throw new Error("FATAL ERROR: jwtPrivateKey is not defined");
  }
  if (!config.get("db")) {
    console.log("db");
    throw new Error("FATAL ERROR: database is not defined");
  }
};
