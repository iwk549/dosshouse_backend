const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const groupScoringSchema = {
  type: Object,
  keys: {
    perTeam: { type: Number, required: true },
    bonus: { type: Number, required: true },
  },
  required: false,
};
const competitionMongooseSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  submissionDeadline: { type: Date, required: false },
  competitionStart: { type: Date, required: false },
  competitionEnd: { type: Date, required: false },
  maxSubmissions: { type: Number, required: true },
  scoring: {
    type: Object,
    keys: {
      group: groupScoringSchema,
      playoff: [
        {
          type: Object,
          keys: {
            roundName: { type: String, required: true },
            roundNumber: { type: Number, required: true },
            points: { type: Number, required: true },
          },
          required: true,
        },
      ],
      champion: { type: Number, required: true },
    },
    required: true,
  },
  miscPicks: [
    {
      type: Object,
      keys: {
        name: { type: String, required: true },
        label: { type: String, required: true },
        description: { type: String, required: true },
        points: { type: Number, required: false },
        info: { type: Object, required: false },
      },
      required: true,
    },
  ],
  groupMatrix: [
    {
      type: Object,
      required: false,
      keys: {
        name: { type: String, required: true },
        description: { type: String, required: true },
        positionInGroup: { type: Number, required: true },
        teamsToIncludeInBracket: { type: Number, required: true },
        scoring: groupScoringSchema,
        matrix: {
          type: Map,
          of: new mongoose.Schema({
            type: Map,
            of: new mongoose.Schema({
              groupName: { type: String, required: true },
              position: { type: Number, required: true },
            }),
          }),
        },
      },
    },
  ],
  prize: {
    type: Object,
    required: false,
    keys: { text: { type: String }, link: { type: String } },
  },
});

const Competition = mongoose.model("Competition", competitionMongooseSchema);

exports.Competition = Competition;
