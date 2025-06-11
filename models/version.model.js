const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const dosshouseVersionStringID = "dosshouseVersionID-62d42ac2e6d157bda4062eb0";

const versionMongooseSchema = new mongoose.Schema({
  stringID: { type: String, required: true },
  major: { type: Number, required: true },
  minor: { type: Number, required: true },
  patch: { type: Number, required: true },
});

const Version = mongoose.model("Version", versionMongooseSchema);

const versionSchema = {
  stringID: Joi.string().required().valid(dosshouseVersionStringID),
  major: Joi.number().required(),
  minor: Joi.number().required(),
  patch: Joi.number().required(),
};

function validateVersion(version) {
  return Joi.object(versionSchema).validate(version);
}

exports.Version = Version;
exports.validateVersion = validateVersion;
exports.dosshouseVersionStringID = dosshouseVersionStringID;
