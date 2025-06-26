const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const { max } = require("../utils/allowables");

const { miscKeys } = require("../utils/allowables");

const predictionMongooseSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  name: { type: String, required: true },
  competitionID: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Competition",
    index: true,
  },
  isSecondChance: { type: Boolean, required: false },
  groupPredictions: [
    {
      type: Object,
      keys: {
        groupName: { type: String, required: true },
        teamOrder: [{ type: String, required: true }],
      },
    },
  ],
  playoffPredictions: [
    {
      type: Object,
      key: {
        matchNumber: { type: Number, required: true },
        homeTeam: { type: String, required: true },
        awayTeam: { type: String, required: true },
        round: { type: Number, required: true },
      },
    },
  ],
  misc: miscKeys,
  points: {
    type: Object,
    keys: {
      playoff: {
        type: Object,
        keys: {
          points: { type: Number, required: true },
          correctPicks: { type: Number, required: true },
        },
        required: true,
      },
      group: {
        type: Object,
        keys: {
          points: { type: Number, required: true },
          correctPicks: { type: Number, required: true },
          bonus: { type: Number, required: true },
        },
        required: true,
      },
      champion: {
        type: Object,
        keys: {
          points: { type: Number, required: true },
          correctPicks: { type: Number, required: true },
        },
        required: true,
      },
      misc: {
        type: Object,
        keys: {
          points: { type: Number, required: true },
          correctPicks: { type: Number, required: true },
        },
        required: true,
      },
    },
  },
  totalPoints: { type: Number, required: true },
  totalPicks: { type: Number, required: true },
  ranking: { type: Number, required: false },
  potentialPoints: {
    type: Object,
    required: false,
    keys: {
      maximum: { type: Number, required: false },
      realistic: { type: Number, required: false },
    },
  },
  groups: [
    {
      type: mongoose.Types.ObjectId,
      required: false,
      ref: "Group",
      validate: [
        (val) => val.length <= max.groupsPerPrediction,
        `{PATH} exceeds the limit of ${max.groupsPerPrediction}`,
      ],
    },
  ],
});

const Prediction = mongoose.model("Prediction", predictionMongooseSchema);

const pointsKeys = {
  points: Joi.number().integer().required(),
  correctPicks: Joi.number().integer().required(),
};

const predictionSchema = {
  userID: Joi.objectID().required(),
  name: Joi.string().min(3).max(50).required().label("Bracket Name"),
  competitionID: Joi.objectID().required(),
  isSecondChance: Joi.boolean().optional(),
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
        round: Joi.number().required(),
      })
    )
    .required()
    .allow(null),
  misc: Joi.object()
    .keys({
      winner: Joi.string().required().allow(""),
      thirdPlace: Joi.string().optional().allow(""),
      discipline: Joi.string().optional().allow(""),
      topScorer: Joi.string().optional().allow(""),
    })
    .required(),
  points: Joi.object()
    .keys({
      group: Joi.object().keys({
        ...pointsKeys,
        bonus: Joi.number().integer().required(),
      }),
      playoff: Joi.object().keys(pointsKeys),
      champion: Joi.object().keys(pointsKeys),
      misc: Joi.object().keys(pointsKeys),
    })
    .optional(),
  totalPoints: Joi.number().required().default(0),
  totalPicks: Joi.number().required().default(0),
  ranking: Joi.number().optional().allow(null),
  potentialPoints: Joi.object().optional().keys({
    maximum: Joi.number().integer(),
    realistic: Joi.number().integer(),
  }),
  groups: Joi.array()
    .items(Joi.objectID())
    .unique()
    .optional()
    .allow(null)
    .max(max.groupsPerPrediction),
};

function validatePrediction(prediction) {
  return Joi.object(predictionSchema).validate(prediction);
}

exports.Prediction = Prediction;
exports.validatePrediction = validatePrediction;
exports.miscKeys = miscKeys;
