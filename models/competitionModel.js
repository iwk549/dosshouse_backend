const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const competitionMongooseSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  submissionDeadline: { type: Date, required: false },
  competitionStart: { type: Date, required: false },
  competitionEnd: { type: Date, required: false },
  groupPicks: { tyep: Boolean, required: false },
  maxSubmissions: { type: Number, required: true },
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
});

const Competition = mongoose.model("Competition", competitionMongooseSchema);

exports.Competition = Competition;
