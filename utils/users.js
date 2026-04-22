const bcrypt = require("bcrypt");
const config = require("config");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Group } = require("../models/group.model");
const transactions = require("./transactions");

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

module.exports.deleteUserByID = async function (userID) {
  // ! models to delete
  // * predictions
  // * user
  // * groups
  // * pull deleted groups from all other users predictions
  const id = mongoose.Types.ObjectId(userID);
  const thisUserGroupIDs = await Group.distinct("_id", { ownerID: id });

  const queries = {
    user: { collection: "users", query: "deleteOne", data: { _id: id } },
    predictions: {
      collection: "predictions",
      query: "deleteMany",
      data: { userID: id },
    },
    groups: {
      collection: "groups",
      query: "deleteMany",
      data: { _id: { $in: thisUserGroupIDs } },
    },
    groupsFromPredictions: {
      collection: "predictions",
      query: "updateMany",
      data: {
        filter: { groups: { $in: thisUserGroupIDs } },
        update: { $pull: { groups: { $in: thisUserGroupIDs } } },
      },
    },
  };

  return await transactions.executeTransactionRepSet(queries);
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
