const express = require("express");
const router = express.Router();
const validateObjectID = require("../../middleware/validateObjectID");
const auth = require("../../middleware/auth");
const { adminCheck } = require("../../middleware/admin");
const {
  updateResultsByCompetition,
  getResult,
  calculateCompetition,
} = require("../controllers/result.controller");

router.use(auth);

router.put("/:code", [adminCheck], updateResultsByCompetition);
router.get("/:id", [validateObjectID], getResult);
router.post("/calculate/:code", [adminCheck], calculateCompetition);

module.exports = router;
