const throng = require("throng");

/ * global process */;

const WORKERS = process.env.WEB_CONCURRENCY || 1;
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "test")
  throng({
    workers: WORKERS,
    lifetime: Infinity,
    start,
  });

async function start() {
  let server;
  const express = require("express");
  const app = express();
  require("./startup/routes")(app);
  require("./startup/config")();
  require("./startup/db")(process.env.NODE_ENV);
  if (process.env.NODE_ENV === "production") {
    require("./startup/prod")(app);
  }

  if (process.env.NODE_ENV !== "test") {
    const logger = require("./startup/logging")();
    server = app.listen(PORT, () => {
      logger.log("info", `Listening on port ${PORT}...`);
    });
  } else server = app.listen();

  return server;
}

[("SIGINT", "SIGTERM", "SIGQUIT")].forEach((signal) => {
  process.on(signal, async function () {
    // eslint-disable-next-line no-console
    console.error(signal + " occurred");
    process.exit();
  });
});

module.exports.start = start;
