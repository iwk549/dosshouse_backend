const bcrypt = require("bcrypt");
const config = require("config");
const jwt = require("jsonwebtoken");

module.exports.saltAndHashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

module.exports.trimEmail = function (email) {
  if (!email) return "";
  return email.trim().toLowerCase();
};

module.exports.comparePasswords = async function (sent, db) {
  return await bcrypt.compare(sent, db);
};

module.exports.decodeJwt = function (token) {
  try {
    return {
      status: 200,
      decoded: jwt.verify(token, config.get("jwtPrivateKey")),
    };
  } catch (error) {
    return { status: 400, message: "Invalid Token" };
  }
};
