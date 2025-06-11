const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const validateObjectID = require("../../middleware/validateObjectID");
const {
  createNewGroup,
  getUsersGroups,
  getGroupJoinLink,
  updateGroup,
  deleteGroup,
} = require("../controllers/groups.controller");

router.use(auth);

router.post("/", createNewGroup);
router.get("/", getUsersGroups);
router.get("/link/:id/:competitionID", [validateObjectID], getGroupJoinLink);
router.put("/:id", [validateObjectID], updateGroup);
router.delete("/:id", [validateObjectID], deleteGroup);

module.exports = router;
