const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { adminCheck } = require("../../middleware/admin");
const { updateTeamName } = require("../controllers/admin.controller");

router.use(auth, adminCheck);

router.put("/teamname", updateTeamName);

module.exports = router;
