const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const auth = require("../middleware/auth");
const validateObjectID = require("../middleware/validateObjectID");
const { Group, validateGroup } = require("../models/groupModel");
const { max } = require("../utils/allowables");
const transactions = require("../utils/transactions");

router.post("/", [auth], async (req, res) => {
  const thisUserGroups = await Group.find({ ownerID: req.user._id });
  if (thisUserGroups.length >= max.groupsPerUser)
    return res
      .status(400)
      .send(
        `You have already created the maximum number of groups allowed (${max.groupsPerUser})`
      );
  const ownerID = mongoose.Types.ObjectId(req.user._id);
  req.body.ownerID = String(ownerID);
  const ex = validateGroup(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);
  req.body.ownerID = ownerID;
  try {
    const response = await Group.collection.insertOne(req.body);
    res.send(response);
  } catch (ex) {
    return res.status(400).send("Group names must be unique");
  }
});

// this route to return all groups created by the user
router.get("/", [auth], async (req, res) => {
  const groups = await Group.find({ ownerID: req.user._id }).select(
    "userID name"
  );
  res.send(groups);
});

router.put("/:id", [auth, validateObjectID], async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).send("Group not found");
  if (String(group.ownerID) !== String(req.user._id))
    return res.status(403).send("Only the group owner can edit the group");

  req.body.ownerID = req.user._id;
  // req.body.competitionID = String(group.competitionID);
  const ex = validateGroup(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  try {
    const response = await Group.updateOne(
      { _id: req.params.id },
      { $set: { name: req.body.name, passcode: req.body.passcode } }
    );
    res.send(response);
  } catch (ex) {
    return res.status(400).send("Group names must be unique");
  }
});

// this route needs to also remove the groups from all predictions
router.delete("/:id", [auth, validateObjectID], async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).send("Group not found");
  if (String(group.ownerID) !== String(req.user._id))
    return res.status(403).send("Only the group owner can delete the group");

  const groupID = mongoose.Types.ObjectId(req.params.id);
  const queries = {
    groups: {
      collection: "groups",
      query: "deleteOne",
      data: { _id: groupID },
    },
    predictions: {
      collection: "predictions",
      query: "updateMany",
      data: {
        filter: { groups: groupID },
        update: { $pull: { groups: groupID } },
      },
    },
  };

  const results = await transactions.executeTransactionRepSet(queries);
  if (results.name)
    return res
      .status(400)
      .send("Something went wrong, group was not deleted. Please try again.");

  res.send(results);
});

module.exports = router;
