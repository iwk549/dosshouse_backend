const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const predictionMongooseSchema = new mongoose.Schema({
  userID: { type: mongoose.Types.ObjectId, required: true },
  bracketCode: { type: String, required: true },
  groupPredictions: { type: Object, required: true },
  playoffPredictions: [{ type: Object, required: true }],
});

const Prediction = mongoose.model("Prediction", predictionMongooseSchema);

const predictionSchema = {
  userID: Joi.objectID().required(),
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
        roundNumber: Joi.number().integer().required(),
        winnerPicked: Joi.string().required(),
      })
    )
    .required()
    .allow(null),
};

function validatePrediction(prediction) {
  return Joi.object(predictionSchema).validate(prediction);
}

exports.Prediction = Prediction;
exports.validatePrediction = validatePrediction;
