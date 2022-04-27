const error = require("../middleware/errors");
const express = require("express");
const matches = require("../routes/matchesRoute");
const competitions = require("../routes/competitionsRoute");
const users = require("../routes/usersRoute");
const predictions = require("../routes/predictionsRoute");
const results = require("../routes/resultsRoute");
const groups = require("../routes/groupsRoute");
const cors = require("cors");
const { highLimiter } = require("../middleware/rateLimiter");

const uploadLimit = "5mb";

module.exports = function (app) {
  // Middleware
  if (process.env.NODE_ENV === "development")
    app.use(
      require("express-status-monitor")({
        title: "Ultimate Scoreboard API Status",
      })
    );
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
  app.use("/api/v1/healthz", async (req, res) => {
    res.send("Healthy");
  });

  // Error handling
  app.use(error);
};
