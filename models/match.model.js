const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const matchMongooseSchema = new mongoose.Schema({
  bracketCode: { type: String, required: true, index: true },
  dateTime: { type: Date, required: false },
  homeTeamName: { type: String, required: true },
  homeTeamGoals: { type: Number, required: false },
  homeTeamPKs: { type: Number, required: false },
  homeTeamAbbreviation: { type: String, required: false },
  awayTeamName: { type: String, required: true },
  awayTeamGoals: { type: Number, required: false },
  awayTeamPKs: { type: Number, required: false },
  awayTeamAbbreviation: { type: String, required: false },
  matchAccepted: { type: Boolean, required: true },
  location: { type: String, required: false },
  type: { type: String, required: true },
  groupName: { type: String, required: false },
  round: { type: Number, required: false },
  matchNumber: { type: Number, required: false },
  sport: { type: String, required: true },
  getTeamsFrom: {
    home: {
      position: { type: Number, required: false },
      groupName: { type: String, required: false },
      matchNumber: { type: Number, required: false },
    },
    away: {
      position: { type: Number, required: false },
      groupName: { type: String, required: false },
      matchNumber: { type: Number, required: false },
    },
  },
  metadata: { type: Object, required: false },
});

const getTeamsFromSchema = Joi.object().required().keys({
  position: Joi.number().optional(),
  groupName: Joi.string().optional(),
  matchNumber: Joi.number().optional(),
});
const matchSchema = {
  dateTime: Joi.date().optional(),
  homeTeamName: Joi.string().required(),
  homeTeamGoals: Joi.number().optional(),
  homeTeamPKs: Joi.number().optional(),
  homeTeamAbbreviation: Joi.string().optional(),
  awayTeamName: Joi.string().required(),
  awayTeamGoals: Joi.number().optional(),
  awayTeamPKs: Joi.number().optional(),
  awayTeamAbbreviation: Joi.string().optional(),
  matchAccepted: Joi.boolean().required(),
  location: Joi.string().optional(),
  type: Joi.string().required(),
  groupName: Joi.string().optional(),
  round: Joi.number().required(),
  matchNumber: Joi.number().required(),
  sport: Joi.string().required(),
  bracketCode: Joi.string().required(),
  getTeamsFrom: Joi.object().optional().keys({
    home: getTeamsFromSchema,
    away: getTeamsFromSchema,
  }),
  metadata: Joi.object().optional(),
};

function validateMatch(match) {
  return Joi.object(matchSchema).validate(match);
}

const Match = mongoose.model("Match", matchMongooseSchema);

exports.Match = Match;
exports.validateMatch = validateMatch;
