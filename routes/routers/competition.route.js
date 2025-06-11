const express = require("express");
const router = express.Router();
const validateObjectID = require("../../middleware/validateObjectID");

const {
  getCompetitions,
  getCompetition,
} = require("../controllers/competition.controller");

router.get("/active", getCompetitions(true));
router.get("/expired", getCompetitions(false));
router.get("/single/:id", [validateObjectID], getCompetition);

module.exports = router;
