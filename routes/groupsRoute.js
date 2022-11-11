const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const auth = require("../middleware/auth");
const validateObjectID = require("../middleware/validateObjectID");
const { Competition } = require("../models/competitionModel");
const { Group, validateGroup } = require("../models/groupModel");
const { max, reservedGroupNames, url } = require("../utils/allowables");
const transactions = require("../utils/transactions");

const groupNameIsReserved = (groupName) => {
  if (reservedGroupNames.includes(groupName.toLowerCase())) return true;
};

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
  req.body.lowercaseName = req.body.name?.toLowerCase();
  const ex = validateGroup(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  if (groupNameIsReserved(req.body.name))
    return res.status(400).send("That group name is reserved");

  if (req.body.passcode.includes(" "))
    return res.status(400).send("Group passcode cannot contain a space");

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

function createGroupLink(group, competitionID) {
  return (
    url +
    "/predictions?type=groupLink&groupID=" +
    group._id +
    "&groupPasscode=" +
    group.passcode +
    "&groupName=" +
    group.name.replace(" ", "%20") +
    "&competitionID=" +
    competitionID
  );
}

router.get(
  "/link/:id/:competitionID",
  [auth, validateObjectID],
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.competitionID))
      return res.status(400).send("Invalid Competition ID");

    const group = await Group.findOne({
      ownerID: req.user._id,
      _id: req.params.id,
    });
    if (!group) return res.status(404).send("Group not found");

    const competition = await Competition.findById(req.params.competitionID);
    if (!competition) return res.status(404).send("Competition not found");

    const link = createGroupLink(group, req.params.competitionID);
    res.send({ link });
  }
);

router.put("/:id", [auth, validateObjectID], async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).send("Group not found");
  if (String(group.ownerID) !== String(req.user._id))
    return res.status(403).send("Only the group owner can edit the group");

  // add ownerID to request for validation
  req.body.ownerID = req.user._id;
  req.body.lowercaseName = req.body.name?.toLowerCase();
  const ex = validateGroup(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  if (groupNameIsReserved(req.body.name))
    return res.status(400).send("That group name is reserved");

  if (req.body.passcode.includes(" "))
    return res.status(400).send("Your group passcode cannot contain a space");
  try {
    const response = await Group.updateOne(
      { _id: req.params.id },
      {
        $set: {
          name: req.body.name || group.name,
          passcode: req.body.passcode || group.passcode,
          lowercaseName: req.body.lowercaseName || group.lowercaseName,
        },
      }
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
