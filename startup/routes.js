const error = require("../middleware/errors");
const express = require("express");
const matches = require("../routes/routers/match.route");
const competitions = require("../routes/routers/competition.route");
const users = require("../routes/routers/user.route");
const predictions = require("../routes/routers/prediction.route");
const results = require("../routes/routers/result.route");
const groups = require("../routes/routers/group.route");
const admin = require("../routes/routers/admin.route");
const cors = require("cors");
const { highLimiter } = require("../middleware/rateLimiter");

const uploadLimit = "5mb";

module.exports = function (app) {
  // Middleware
  app.use(
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
      limit: uploadLimit,
    })
  );
  app.use(express.urlencoded({ extended: true, limit: uploadLimit }));
  app.use(express.static("public"));
  app.use(cors());

  // rate-limiter
  app.use("/api/", highLimiter);

  // Routers
  app.use("/api/v1/competitions", competitions);
  app.use("/api/v1/matches", matches);
  app.use("/api/v1/users", users);
  app.use("/api/v1/predictions", predictions);
  app.use("/api/v1/results", results);
  app.use("/api/v1/groups", groups);
  app.use("/api/v1/admin", admin);
  app.use("/api/v1/healthz", async (req, res) => {
    res.send("Healthy");
  });

  // Error handling
  app.use(error);
};
