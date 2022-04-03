const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const matchMongooseSchema = new mongoose.Schema({
  dateTime: { type: Date, required: false },
  homeTeamName: { type: String, required: true },
  homeTeamLogo: { type: String, required: false },
  homeTeamGoals: { type: Number, required: false },
  homeTeamPKs: { type: Number, required: false },
  homeTeamAbbreviation: { type: String, required: false },
  awayTeamName: { type: String, required: true },
  awayTeamGoals: { type: Number, required: false },
  awayTeamLogo: { type: String, required: false },
  awayTeamPKs: { type: Number, required: false },
  awayTeamAbbreviation: { type: String, required: false },
  matchComplete: { type: Number, required: true },
  location: { type: String, required: false },
  type: { type: String, required: true },
  groupName: { type: String, required: false },
  round: { type: Number, required: false },
  matchNumber: { type: Number, required: false },
  sport: { type: String, required: true },
  bracketCode: { type: String, required: true },
  locked: { type: Boolean, required: false },
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
});

const Match = mongoose.model("Match", matchMongooseSchema);

exports.Match = Match;
