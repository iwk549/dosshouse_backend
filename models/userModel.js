const config = require("config");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");

const userMongooseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, minLength: 5, maxLength: 255 },
  password: { type: String, required: true, minLength: 8, maxLength: 1024 },
});

userMongooseSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email,
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const User = mongoose.model("User", userMongooseSchema);

const userSchema = {
  _id: Joi.objectID(),
  name: Joi.string().min(3).max(100).required(),
  email: Joi.string().min(5).max(255).required().email(),
  password: Joi.string().min(8).max(50).required(),
};

function validateUser(user) {
  return Joi.object(userSchema).validate(user);
}

exports.validateUser = validateUser;
exports.User = User;
