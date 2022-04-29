const config = require("config");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
Joi.objectID = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const passwordComplexity = require("joi-password-complexity");
const { pwComplexityOptions } = require("../utils/allowables");
const { string } = require("joi");

const userMongooseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    minLength: 5,
    maxLength: 255,
  },
  password: { type: String, required: true, minLength: 8, maxLength: 1024 },
  role: { type: String, required: false },
  lastActive: { type: Date, required: false },
  passwordReset: {
    type: Object,
    keys: {
      token: { type: String, required: false },
      expiration: { type: Date, required: false },
    },
    required: false,
  },
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
  role: Joi.string().optional().allow(""),
  lastActive: Joi.date().optional().allow("", null),
  passwordResetToken: Joi.object()
    .keys({
      token: Joi.objectID().optional().allow(null),
    })
    .optional()
    .allow(null),
};

function validateUser(user) {
  return Joi.object(userSchema).validate(user);
}

function validatePassword(password) {
  return passwordComplexity(pwComplexityOptions, "Password").validate(password);
}

function validateLogin(login) {
  return Joi.object({
    email: userSchema.email,
    password: userSchema.password,
  }).validate(login);
}

function validateEdit(info) {
  return Joi.object({
    name: userSchema.name,
  }).validate(info);
}

function validateEmail(email) {
  return Joi.object({ email: userSchema.email }).validate({ email });
}

exports.validateUser = validateUser;
exports.validatePassword = validatePassword;
exports.validateLogin = validateLogin;
exports.validateEdit = validateEdit;
exports.validateEmail = validateEmail;
exports.User = User;
