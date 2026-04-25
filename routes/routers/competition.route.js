const express = require("express");
const router = express.Router();
const validateObjectID = require("../../middleware/validateObjectID");

const auth = require("../../middleware/auth");
const { adminCheck } = require("../../middleware/admin");
const {
  getCompetitions,
  getCompetition,
  updateMiscPickInfo,
} = require("../controllers/competition.controller");

router.get("/active", getCompetitions(true));
router.get("/expired", getCompetitions(false));
router.get("/single/:id", [validateObjectID], getCompetition);
router.put("/:code/misc-pick/:name", [auth, adminCheck], updateMiscPickInfo);

module.exports = router;
