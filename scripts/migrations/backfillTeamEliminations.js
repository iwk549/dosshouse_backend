const { Prediction } = require("../../models/prediction.model");
const { Competition } = require("../../models/competition.model");
const { computeTeamEliminations } = require("../../utils/predictions");

async function backfillTeamEliminations() {
  const predictions = await Prediction.find({
    teamEliminations: { $exists: false },
  });

  console.log(`Found ${predictions.length} predictions to backfill.`);
  if (predictions.length === 0) return;

  const competitionCache = {};
  let updated = 0;
  let skipped = 0;

  for (const prediction of predictions) {
    const compId = String(prediction.competitionID);
    if (!competitionCache[compId]) {
      competitionCache[compId] = await Competition.findById(compId);
    }
    const competition = competitionCache[compId];

    if (!competition?.scoring?.playoff?.length) {
      skipped++;
      continue;
    }

    const teamEliminations = computeTeamEliminations(prediction, competition);
    await Prediction.updateOne(
      { _id: prediction._id },
      { $set: { teamEliminations } },
    );
    updated++;
  }

  console.log(`Done. Updated: ${updated}, skipped: ${skipped}.`);
}

module.exports = { backfillTeamEliminations };

if (require.main === module) {
  const { runMigration } = require("./migrationSetup");
  runMigration(backfillTeamEliminations);
}
