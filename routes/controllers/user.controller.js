const {
  User,
  validateUser,
  validatePassword,
  validateLogin,
  validateEdit,
  validateEmail,
} = require("../../models/user.model");
const {
  saltAndHashPassword,
  trimEmail,
  comparePasswords,
} = require("../../utils/users");
const mongoose = require("mongoose");
const { sendPasswordReset } = require("../../utils/emailing");
const { pickADate } = require("../../utils/allowables");
const transactions = require("../../utils/transactions");
const { Group } = require("../../models/group.model");

async function createNewAccount(req, res, next) {
  req.body.email = trimEmail(req.body.email);
  delete req.body.role;
  delete req.body.settings;
  const existingAccount = await User.findOne({ email: req.body.email });
  if (existingAccount)
    return next({
      status: 400,
      message:
        "You already have an account using this email. Please log in with your password.",
    });

  const ex = validateUser(req.body);
  if (ex.error)
    return next({ status: 400, message: ex.error.details[0].message });
  // check password is valid
  const pw = validatePassword(req.body.password);
  if (pw.error) {
    return next({
      status: 400,
      message:
        "Password must contain at least one lower case, one upper case and one number.",
    });
  }
  req.body.password = await saltAndHashPassword(req.body.password);
  req.body.lastActive = new Date();
  const user = new User(req.body);
  await user.save();
  const token = user.generateAuthToken();
  res.send(token);
}

async function login(req, res, next) {
  req.body.email = trimEmail(req.body.email);
  const message = "Invalid email or password";

  const ex = validateLogin({
    email: req.body.email,
    password: req.body.password,
  });
  if (ex.error) return next({ status: 400, message: message });

  const user = await User.findOne({ email: req.body.email });
  if (!user) return next({ status: 400, message: message });
  const matchingPassword = await comparePasswords(
    req.body.password,
    user?.password
  );

  if (!matchingPassword) return next({ status: 400, message: message });
  const token = user.generateAuthToken();
  res.send(token);
}

async function getUserInfo(req, res, next) {
  const user = await User.findById(req.user._id);
  if (!user) return next({ status: 409, message: "Account not found" });
  await User.updateOne(
    { _id: req.user._id },
    { $set: { lastActive: new Date() } }
  );
  const token = user.generateAuthToken();
  res.send(token);
}

async function deleteUser(req, res, next) {
  // if the user account is not found we cannot delete anything,
  // but the mission has been accomplished so this is a success route
  const user = await User.findById(req.user._id);
  if (!user) return res.send("Account Deleted");

  // ! models to delete
  // * predictions
  // * user
  // * groups
  // * pull deleted groups from all other users predictions
  const userID = mongoose.Types.ObjectId(req.user._id);
  const thisUserGroupIDs = await (
    await Group.find({ ownerID: userID })
  ).map((g) => g._id);

  const queries = {
    user: {
      collection: "users",
      query: "deleteOne",
      data: { _id: userID },
    },
    predictions: {
      collection: "predictions",
      query: "deleteMany",
      data: { userID },
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

  const results = await transactions.executeTransactionRepSet(queries);
  if (results.name)
    return next({
      status: 400,
      message:
        "Something went wrong, account was not deleted. Please try again.",
    });

  res.send(results);
}

async function updateUser(req, res, next) {
  const user = await User.findById(req.user._id);
  if (!user) return next({ status: 400, message: "User account not found" });

  const ex = validateEdit(req.body);
  if (ex.error)
    return next({ status: 400, message: ex.error.details[0].message });

  const update = {
    name: req.body.name,
  };

  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user._id },
    {
      $set: update,
    },
    { returnOriginal: false }
  );

  const token = updatedUser.generateAuthToken();
  res.send(token);
}

async function requestPasswordReset(req, res, next) {
  const email = trimEmail(req.params.email);
  const ex = validateEmail(email);
  if (ex.error) next({ status: 400, message: "Not a valid email" });

  const user = await User.findOne({ email });
  if (user) {
    const passwordResetToken = String(mongoose.Types.ObjectId());
    if (process.env.NODE_ENV !== "test") {
      const emailSentSuccessfully = await sendPasswordReset(
        user,
        passwordResetToken
      );
      if (!emailSentSuccessfully)
        return next({
          status: 400,
          message:
            "Something went wrong. Reset email was not sent. Please try again.",
        });
    }
    await User.updateOne(
      { email },
      {
        $set: {
          passwordReset: {
            token: passwordResetToken,
            expiration: pickADate(7),
          },
        },
      }
    );
  }
  res.send(
    "An email will be sent to the address if an account is registered under it."
  );
}

async function updatePassword(req, res, next) {
  const user = await User.findOne({
    email: req.body.email,
    "passwordResetToken.token": req.body.token,
  });
  if (!user)
    return next({ status: 400, message: "Password reset not requested" });
  if (user.passwordReset?.expiration < pickADate(-1))
    return next({
      status: 400,
      message: "Reset token has expired, please request another reset",
    });

  const pw = validatePassword(req.body.password);
  if (pw.error) {
    return next({
      status: 400,
      message:
        "Password must contain at least one lower case, one upper case and one number.",
    });
  }

  const shPassword = await saltAndHashPassword(req.body.password);
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
    },
    {
      $set: {
        password: shPassword,
        passwordReset: null,
        lastActive: new Date(),
      },
    }
  );

  const token = updatedUser.generateAuthToken();
  res.send(token);
}

module.exports = {
  createNewAccount,
  login,
  getUserInfo,
  deleteUser,
  updateUser,
  requestPasswordReset,
  updatePassword,
};
