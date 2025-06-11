const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const validateObjectID = require("../../middleware/validateObjectID");
const auth = require("../../middleware/auth");
const { adminCheck } = require("../../middleware/admin");
const {
  getMatches,
  updateJsonMatches,
  upsertCsvMatches,
} = require("../controllers/match.controller");

router.get("/:id", [validateObjectID], getMatches);
router.put("/", [auth, adminCheck], updateJsonMatches);
router.put("/csv", [auth, adminCheck, upload.single("file")], upsertCsvMatches);

module.exports = router;
