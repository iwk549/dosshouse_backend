const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const { miscKeys } = require("../utils/allowables");

const resultMongooseSchema = new mongoose.Schema({
  code: { type: String, required: true },
  group: [
    {
      type: Object,
      keys: {
        groupName: { type: String, required: true },
        teamOrder: { type: String, required: true },
      },
      required: true,
    },
  ],
  playoff: [
    {
      type: Object,
      keys: {
        round: { type: Number, required: true },
        teams: [{ type: String, required: true }],
        points: { type: Number, required: true },
      },
    },
  ],
  misc: miscKeys,
});

const Result = mongoose.model("Result", resultMongooseSchema);

exports.Result = Result;
