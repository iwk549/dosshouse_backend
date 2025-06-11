const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");

const validateObjectID = require("../middleware/validateObjectID");
const { Match, validateMatch } = require("../models/matchModel");
const { Competition } = require("../models/competitionModel");
const auth = require("../middleware/auth");
const { adminCheck } = require("../middleware/admin");
const { mapCsvFields } = require("../utils/allowables");

router.get("/:id", [validateObjectID], async (req, res) => {
  const competition = await Competition.findById(req.params.id);
  if (!competition) return res.status(404).send("Competition not found");
  const matches = await Match.find({
    bracketCode: competition.code,
  }).sort({ groupName: 1, dateTime: 1, matchNumber: 1 });
  res.send(matches);
});

router.put("/", [auth, adminCheck], async (req, res) => {
  // validate each incoming match against the round/matchNumber to do the update
  const results = await Match.bulkWrite(
    req.body.map((match) => ({
      updateOne: {
        filter: {
          bracketCode: match.bracketCode,
          matchNumber: match.matchNumber,
          round: match.round,
        },
        update: {
          $set: {
            homeTeamName: match.homeTeamName,
            awayTeamName: match.awayTeamName,
            homeTeamGoals: match.homeTeamGoals,
            homeTeamPKs: match.homeTeamPKs,
            awayTeamGoals: match.awayTeamGoals,
            awayTeamPKs: match.awayTeamPKs,
            matchAccepted: match.matchAccepted,
            location: match.location,
            dateTime: match.dateTime?.$date,
          },
        },
      },
    }))
  );

  res.send(`${results.nModified} matches updated`);
});

router.put(
  "/csv",
  [auth, adminCheck, upload.single("file")],
  async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");
    const filePath = path.join(__dirname, "../", req.file.path);
    try {
      let results = [];
      let errors = [];
      let rowIdx = 1;
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row) => {
          const doc = mapCsvFields(row);
          if (row.date && row.time) {
            const [month, day, year] = row.date.split("/").map(Number);
            const [hours, minutes] = row.time.split(":").map(Number);
            doc.dateTime = new Date(
              Date.UTC(year, month - 1, day, hours, minutes)
            );
            delete doc.date;
            delete doc.time;
          }
          const ex = validateMatch(doc);
          if (ex.error) {
            errors.push({
              line: rowIdx,
              errors: ex.error.details[0].message,
            });
          } else results.push(doc);
          rowIdx++;
        })
        .on("end", async () => {
          try {
            if (errors.length) {
              return res.status(400).send(errors);
            }

            const result = await Match.bulkWrite(
              results.map((match) => ({
                updateOne: {
                  filter: {
                    bracketCode: match.bracketCode,
                    matchNumber: match.matchNumber,
                    round: match.round,
                  },
                  update: {
                    $set: match,
                  },
                  upsert: true,
                },
              }))
            );

            res.send(result);
          } catch (error) {
            return res.status(500).send("Error uploading matches");
          } finally {
            fs.unlinkSync(filePath);
          }
        });
    } catch (error) {
      res.status(500).send(`Error processing file: ${error.message}`);
    }
  }
);

module.exports = router;
