const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { adminCheck } = require("../../middleware/admin");
const validateObjectID = require("../../middleware/validateObjectID");
const {
  updateTeamName,
  getUsers,
  deleteUser,
} = require("../controllers/admin.controller");

router.use(auth, adminCheck);

router.get("/users", getUsers);
router.delete("/users/:id", [validateObjectID], deleteUser);
router.put("/teamname", updateTeamName);

module.exports = router;
