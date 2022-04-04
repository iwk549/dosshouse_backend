const bcrypt = require("bcrypt");

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
