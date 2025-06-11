const {
  Version,
  validateVersion,
  dosshouseVersionStringID,
} = require("../../models/version.model");

async function getVersion(req, res) {
  const version = await Version.findOne({
    stringID: dosshouseVersionStringID,
  }).select("major minor patch");
  res.send(version);
}

async function updateVersion(req, res, next) {
  if (req.body.stringID !== dosshouseVersionStringID)
    return next({ status: 400, message: "Incorrect version ID" });

  const ex = validateVersion(req.body);
  if (ex.error) return next({ status: 400, message: "Not a valid version" });

  const result = await Version.updateOne(
    { stringID: req.body.stringID },
    { $set: req.body },
    { upsert: true }
  );

  res.send(result);
}

module.exports = {
  getVersion,
  updateVersion,
};
