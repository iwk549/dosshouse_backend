const c = require("config");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const validateObjectID = require("../middleware/validateObjectID");
const { Group, validateGroup } = require("../models/groupModel");
const { Prediction } = require("../models/predictionModel");
const { max } = require("../utils/allowables");

router.post("/", [auth], async (req, res) => {
  const thisUserGroups = await Group.find({ ownerID: req.user._id });
  if (thisUserGroups.length >= max.groupsPerUser)
    return res
      .status(400)
      .send(
        `You have already created the maximum number of groups allowed (${max.groupsPerUser})`
      );

  req.body.ownerID = req.user._id;
  const ex = validateGroup(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  const response = await Group.collection.insertOne(req.body);
  res.send(response);
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
  const ex = validateGroup(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  const response = await Group.updateOne(
    { _id: req.params.id },
    { $set: { name: req.body.name, passcode: req.body.passcode } }
  );
  res.send(response);
});

router.delete("/:id", [auth, validateObjectID], async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).send("Group not found");
  if (String(group.ownerID) !== String(req.user._id))
    return res.status(403).send("Only the group owner can edit the group");
});

module.exports = router;
