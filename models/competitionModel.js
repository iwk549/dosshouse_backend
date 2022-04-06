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
  miscPicks: [
    {
      type: Object,
      keys: {
        winner: { type: String, required: true },
        thirdPlace: { type: String, required: false },
        discipline: { type: String, required: false },
        topScorer: { type: String, required: false },
      },
      required: true,
    },
  ],
});

const Competition = mongoose.model("Competition", competitionMongooseSchema);

exports.Competition = Competition;