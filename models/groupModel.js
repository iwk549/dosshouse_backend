const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const groupMongooseSchema = new mongoose.Schema({
  ownerID: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  name: { type: String, required: true, unique: true },
  passcode: { type: String, required: true },
  // competitionID: {
  //   type: mongoose.Types.ObjectId,
  //   required: true,
  //   ref: "Competition",
  // },
});

const Group = mongoose.model("Group", groupMongooseSchema);

const groupSchema = {
  ownerID: Joi.objectID().required(),
  name: Joi.string().required().min(3).max(50),
  passcode: Joi.string().required().min(8).max(50),
  // competitionID: Joi.objectID().required(),
};

function validateGroup(group) {
  return Joi.object(groupSchema).validate(group);
}

exports.Group = Group;
exports.validateGroup = validateGroup;
