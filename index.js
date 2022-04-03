const throng = require("throng");

const WORKERS = process.env.WEB_CONCURRENCY || 1;
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test")
  throng({
    workers: WORKERS,
    lifetime: Infinity,
    start,
  });
else {
  console.log("Testing in progress...");
  start();
}

function start() {
  let server;
  const express = require("express");
  const app = express();
  require("./startup/routes")(app);
  require("./startup/config")();
  const logger = require("./startup/logging")();
  require("./startup/db")(process.env.NODE_ENV);

  if (process.env.NODE_ENV === "production") {
    require("./startup/prod")(app);
  }

  if (process.env.NODE_ENV !== "test") {
    // require("./startup/scheduler")();
    server = app.listen(PORT, () =>
      logger.log("info", `Listening on port ${PORT}...`)
    );
  } else server = app.listen();
  module.exports = server;
}
