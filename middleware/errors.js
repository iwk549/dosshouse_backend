/* eslint-disable no-unused-vars */

const logger = require("../startup/logging")();

module.exports = function (err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Something went wrong";

  if (status === 500) logger.log("error", message);
  res.status(status).send(message);
};
