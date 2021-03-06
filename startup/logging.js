const winston = require("winston");
require("winston-mongodb");
require("express-async-errors");
const config = require("config");

module.exports = function () {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: "error.log", level: "error" }),
      // new winston.transports.File({ filename: "combined.log" }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: "uncaughtExceptions.log" }),
    ],
  });
  if (process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({ format: winston.format.simple() })
    );
  }
  if (process.env.NODE_ENV !== "test") {
    logger.add(
      new winston.transports.MongoDB({
        level: "error",
        db: config.get("db"),
        options: { useUnifiedTopology: true },
      })
    );
  }
  return logger;
};
