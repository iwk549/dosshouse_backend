const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

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
      group: {
        type: Object,
        keys: {
          perTeam: { type: Number, required: true },
          bonus: { type: Number, required: true },
        },
        required: false,
      },
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
  prize: {
    type: Object,
    required: false,
    keys: { text: { type: String }, link: { type: String } },
  },
});

const Competition = mongoose.model("Competition", competitionMongooseSchema);

exports.Competition = Competition;
