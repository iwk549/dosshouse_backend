const express = require("express");
const router = express.Router();

const validateObjectID = require("../middleware/validateObjectID");
const { Match } = require("../models/matchModel");
const { Competition } = require("../models/competitionModel");
const auth = require("../middleware/auth");
const { adminCheck } = require("../middleware/admin");

router.get("/:id", [validateObjectID], async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).send("Competition not found");
  const matches = await Match.find({
    bracketCode: competition.code,
  }).sort("groupName 1 dateTime 1");
  res.send(matches);
});

router.put("/", [auth, adminCheck], async (req, res) => {
  // validate each incoming match against the team names and round/matchNumber to do the update
  const results = await Match.bulkWrite(
    req.body.map((match) => ({
      updateOne: {
        filter: {
          homeTeamName: match.homeTeamName,
          awayTeamName: match.awayTeamName,
          bracketCode: match.bracketCode,
          matchNumber: match.matchNumber,
          round: match.round,
        },
        update: {
          $set: {
            homeTeamGoals: match.homeTeamGoals,
            awayTeamGoals: match.awayTeamGoals,
            matchAccepted: match.matchAccepted,
          },
        },
      },
    }))
  );

  res.send(`${results.nModified} matches updated`);
});

module.exports = router;
