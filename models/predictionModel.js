const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const predictionMongooseSchema = new mongoose.Schema({
  userID: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  name: { type: String, required: true },
  bracketCode: { type: String, required: true },
  groupPredictions: [
    {
      groupName: { type: String, required: true },
      teamOrder: [{ type: String, required: true }],
    },
  ],
  playoffPredictions: [
    {
      matchNumber: { type: Number, required: true },
      homeTeam: { type: String, required: true },
      awayTeam: { type: String, required: true },
    },
  ],
  points: {
    playoff: { type: Number, required: true },
    group: { type: Number, required: true },
    misc: { type: Number, required: true },
  },
});

const Prediction = mongoose.model("Prediction", predictionMongooseSchema);

const predictionSchema = {
  userID: Joi.objectID().required(),
  name: Joi.string().min(3).max(50).required().label("Bracket Name"),
  bracketCode: Joi.string().min(3).max(50).required(),
  groupPredictions: Joi.array()
    .items(
      Joi.object()
        .keys({
          groupName: Joi.string().required(),
          teamOrder: Joi.array().items(Joi.string()).required(),
        })
        .required()
        .allow(null)
    )
    .required(),
  playoffPredictions: Joi.array()
    .items(
      Joi.object().keys({
        matchNumber: Joi.number().integer().required(),
        homeTeam: Joi.string().required(),
        awayTeam: Joi.string().required(),
      })
    )
    .required()
    .allow(null),
  points: Joi.object()
    .keys({
      group: Joi.number().integer().required().default(0),
      playoff: Joi.number().integer().required().default(0),
      misc: Joi.number().integer().required().default(0),
    })
    .optional(),
};

function validatePrediction(prediction) {
  return Joi.object(predictionSchema).validate(prediction);
}

exports.Prediction = Prediction;
exports.validatePrediction = validatePrediction;
