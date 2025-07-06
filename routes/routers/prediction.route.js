const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const validateObjectID = require("../../middleware/validateObjectID");
const {
  createNewPrediction,
  updatePrediction,
  getPrediction,
  getUsersPredictions,
  deletePrediction,
  getLeaderboardByGroup,
  searchLeaderboard,
  getNonUserPrediction,
  addPredictionToGroup,
  removePredictionFromGroup,
  removePredictionFromGroupByGroupOwner,
  getUsersPredictionsByCompetition,
  getPredictionsByMisc,
} = require("../controllers/prediction.controller");

router.post("/", [auth], createNewPrediction);
router.put("/:id", [auth, validateObjectID], updatePrediction);
router.get("/:id", [auth, validateObjectID], getPrediction);
router.get("/", [auth], getUsersPredictions);
router.delete("/:id", [auth, validateObjectID], deletePrediction);
router.get(
  "/leaderboard/:id/:resultsPerPage/:pageNumber/:groupID",
  [validateObjectID],
  getLeaderboardByGroup
);
router.get(
  "/leaderboard/:id/:groupID/:search",
  [validateObjectID],
  searchLeaderboard
);
router.get(
  "/bonus/:id/:key/:team",
  [auth, validateObjectID],
  getPredictionsByMisc
);
router.get("/unowned/:id", [auth, validateObjectID], getNonUserPrediction);
router.put("/addtogroup/:id", [auth, validateObjectID], addPredictionToGroup);
router.put(
  "/removefromgroup/:id",
  [auth, validateObjectID],
  removePredictionFromGroup
);
router.put(
  "/forceremovefromgroup/:id",
  [auth, validateObjectID],
  removePredictionFromGroupByGroupOwner
);
router.get(
  "/competitions/:id",
  [auth, validateObjectID],
  getUsersPredictionsByCompetition
);

module.exports = router;
