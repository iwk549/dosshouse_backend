const mongoose = require("mongoose");
const { Competition } = require("../../models/competition.model");
const { Group, validateGroup } = require("../../models/group.model");
const { User } = require("../../models/user.model");
const { max, reservedGroupNames, url } = require("../../utils/allowables");
const transactions = require("../../utils/transactions");

const groupNameIsReserved = (groupName) => {
  if (reservedGroupNames.includes(groupName.toLowerCase())) return true;
};

function createGroupLink(group, competitionID) {
  return (
    url +
    "/predictions?type=groupLink&groupID=" +
    group._id +
    "&groupPasscode=" +
    group.passcode +
    "&groupName=" +
    group.name.replaceAll(" ", "%20") +
    "&competitionID=" +
    competitionID
  );
}

async function createNewGroup(req, res, next) {
  const thisUserGroups = await Group.find({ ownerID: req.user._id });
  // find user to see if they have special settings which would allow for extra groups to be created
  const user = await User.findById(req.user._id);
  const maxGroups = user?.settings?.max?.groupsPerUser || max.groupsPerUser;

  if (thisUserGroups.length >= maxGroups)
    return next({
      status: 400,
      message: `You have already created the maximum number of groups allowed (${maxGroups})`,
    });

  const ownerID = mongoose.Types.ObjectId(req.user._id);
  req.body.ownerID = String(ownerID);
  req.body.lowercaseName = req.body.name?.toLowerCase();
  const ex = validateGroup(req.body);
  if (ex.error)
    return next({ status: 400, message: ex.error.details[0].message });

  if (groupNameIsReserved(req.body.name))
    return next({ status: 400, message: "That group name is reserved" });

  if (req.body.passcode.includes(" "))
    return next({
      status: 400,
      message: "Group passcode cannot contain a space",
    });

  req.body.ownerID = ownerID;
  try {
    const response = await Group.collection.insertOne(req.body);
    res.send(response);
  } catch (ex) {
    return next({ status: 400, message: "Group names must be unique" });
  }
}

async function getUsersGroups(req, res) {
  const groups = await Group.find({ ownerID: req.user._id }).select(
    "userID name"
  );
  res.send(groups);
}

async function getGroupJoinLink(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.competitionID))
    return next({ status: 400, message: "Invalid Competition ID" });

  const group = await Group.findOne({
    ownerID: req.user._id,
    _id: req.params.id,
  });
  if (!group) return next({ status: 404, message: "Group not found" });

  const competition = await Competition.findById(req.params.competitionID);
  if (!competition)
    return next({ status: 404, message: "Competition not found" });

  const link = createGroupLink(group, req.params.competitionID);
  res.send({ link });
}

async function updateGroup(req, res, next) {
  const group = await Group.findById(req.params.id);
  if (!group) return next({ status: 404, message: "Group not found" });
  if (String(group.ownerID) !== String(req.user._id))
    return next({
      status: 403,
      message: "Only the group owner can edit the group",
    });

  // add ownerID to request for validation
  req.body.ownerID = req.user._id;
  req.body.lowercaseName = req.body.name?.toLowerCase();
  const ex = validateGroup(req.body);
  if (ex.error)
    return next({ status: 400, message: ex.error.details[0].message });

  if (groupNameIsReserved(req.body.name))
    return next({ status: 400, message: "That group name is reserved" });

  if (req.body.passcode.includes(" "))
    return next({
      status: 400,
      message: "Your group passcode cannot contain a space",
    });
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
    return next({ status: 400, message: "Group names must be unique" });
  }
}

async function deleteGroup(req, res, next) {
  // must also remove the group from all predictions
  const group = await Group.findById(req.params.id);
  if (!group) return next({ status: 404, message: "Group not found" });
  if (String(group.ownerID) !== String(req.user._id))
    return next({
      status: 403,
      message: "Only the group owner can delete the group",
    });

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
    return next({
      status: 400,
      message: "Something went wrong, group was not deleted. Please try again.",
    });

  res.send(results);
}

module.exports = {
  createNewGroup,
  getUsersGroups,
  getGroupJoinLink,
  updateGroup,
  deleteGroup,
};
