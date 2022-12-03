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
      required: false,
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

const resultSchema = {
  code: Joi.string().required(),
  group: Joi.array()
    .optional()
    .items(
      Joi.object().keys({
        groupName: Joi.string().required(),
        teamOrder: Joi.array().items(Joi.string()).required(),
      })
    ),
  playoff: Joi.array()
    .required()
    .items(
      Joi.object().keys({
        round: Joi.number().integer().required(),
        teams: Joi.array().required().items(Joi.string()),
        points: Joi.number().integer().required(),
      })
    ),
  misc: Joi.object(),
};

function validateResult(result) {
  return Joi.object(resultSchema).validate(result);
}

exports.Result = Result;
exports.validateResult = validateResult;
