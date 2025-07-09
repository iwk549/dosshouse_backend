const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");

const { Match, validateMatch } = require("../../models/match.model");
const { Competition } = require("../../models/competition.model");
const { mapCsvFields } = require("../../utils/allowables");

async function getMatches(req, res, next) {
  const competition = await Competition.findById(req.params.id);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });
  const matches = await Match.find({
    bracketCode: competition.code,
  }).sort({ groupName: 1, dateTime: 1, matchNumber: 1 });
  res.send(matches);
}

async function updateJsonMatches(req, res) {
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
            teamsSet: match.teamsSet,
            location: match.location,
            dateTime: match.dateTime?.$date,
          },
        },
      },
    }))
  );

  res.send(`${results.nModified} matches updated`);
}

async function upsertCsvMatches(req, res, next) {
  if (!req.file) return next({ status: 400, message: "No file uploaded" });
  const filePath = path.join(__dirname, "../../", req.file.path);
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
            return next({ status: 400, message: errors });
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
          return next({ status: 500, message: "Error uploading matches" });
        } finally {
          fs.unlinkSync(filePath);
        }
      });
  } catch (error) {
    next({ status: 500, message: `Error processing file: ${error.message}` });
  }
}

module.exports = {
  getMatches,
  updateJsonMatches,
  upsertCsvMatches,
};
