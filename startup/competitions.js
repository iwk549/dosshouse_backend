const config = require("config");
const { Competition } = require("../models/competition.model");
const competitions = require("../data/activeCompetitions.json");

// Recursively converts BSON extended JSON ($date, $oid) to plain JS values.
// _id is dropped so MongoDB preserves the existing ObjectID on upsert.
function transformDoc(obj) {
  if (Array.isArray(obj)) return obj.map(transformDoc);
  if (obj && typeof obj === "object") {
    if ("$date" in obj) return new Date(obj.$date);
    if ("$oid" in obj) return obj.$oid;
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "_id") continue;
      result[k] = transformDoc(v);
    }
    return result;
  }
  return obj;
}

module.exports = async function seedCompetitions() {
  if (!config.get("seedCompetitionsOnStartup")) return;

  const docs = competitions.map(transformDoc);
  await Promise.all(
    docs.map((comp) =>
      Competition.updateOne(
        { code: comp.code },
        { $set: comp },
        { upsert: true },
      ),
    ),
  );
  // eslint-disable-next-line no-console
  console.log(`Seeded ${docs.length} competition(s)...`);
};
