const {
  User,
  validateUser,
  validatePassword,
  validateLogin,
  validateEdit,
  validateEmail,
} = require("../models/userModel");
const express = require("express");
const router = express.Router();
const { loginLimiter, lowLimiter } = require("../middleware/rateLimiter");
const {
  saltAndHashPassword,
  trimEmail,
  comparePasswords,
} = require("../utils/users");
const auth = require("../middleware/auth");
const { Prediction } = require("../models/predictionModel");
const mongoose = require("mongoose");
const { sendPasswordReset } = require("../utils/emailing");
const { pickADate } = require("../utils/allowables");
const transactions = require("../utils/transactions");
const { Group } = require("../models/groupModel");

// do not implement rate limiter during testing
const nonTestingRatelimiter =
  process.env.NODE_ENV !== "test" ? [loginLimiter] : [];

router.post("/", nonTestingRatelimiter, async (req, res) => {
  req.body.email = trimEmail(req.body.email);
  delete req.body.role;
  const existingAccount = await User.findOne({ email: req.body.email });
  if (existingAccount)
    return res
      .status(400)
      .send(
        "You already have an account using this email. Please log in with your password."
      );
  const ex = validateUser(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);
  // check password is valid
  const pw = validatePassword(req.body.password);
  if (pw.error) {
    return res
      .status(400)
      .send(
        "Password must contain at least one lower case, one upper case and one number."
      );
  }
  req.body.password = await saltAndHashPassword(req.body.password);
  req.body.lastActive = new Date();
  const user = new User(req.body);
  await user.save();
  const token = user.generateAuthToken();
  res.send(token);
});

router.post("/login", nonTestingRatelimiter, async (req, res) => {
  req.body.email = trimEmail(req.body.email);
  const message = "Invalid email or password";

  const ex = validateLogin({
    email: req.body.email,
    password: req.body.password,
  });
  if (ex.error) return res.status(400).send(message);

  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send(message);
  const matchingPassword = await comparePasswords(
    req.body.password,
    user?.password
  );

  if (!matchingPassword) return res.status(400).send(message);
  const token = user.generateAuthToken();
  res.send(token);
});

router.get("/", [auth], async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(409).send("Account not found");
  await User.updateOne(
    { _id: req.user._id },
    { $set: { lastActive: new Date() } }
  );
  const token = user.generateAuthToken();
  res.send(token);
});

router.delete("/", [auth], async (req, res) => {
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
    return res
      .status(400)
      .send("Something went wrong, account was not deleted. Please try again.");

  res.send(results);
});

router.put("/", [auth], async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(400).send("User account not found");

  const ex = validateEdit(req.body);
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

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
});

router.put("/resetpassword/:email", [lowLimiter], async (req, res) => {
  const email = trimEmail(req.params.email);
  const ex = validateEmail(email);
  if (ex.error) return res.status(400).send("Not a valid email");

  const user = await User.findOne({ email });
  if (user) {
    const now = new Date();
    const passwordResetToken = String(mongoose.Types.ObjectId());
    if (process.env.NODE_ENV !== "test") {
      const emailSentSuccessfully = await sendPasswordReset(
        user,
        passwordResetToken
      );
      if (!emailSentSuccessfully)
        return res
          .status(400)
          .send(
            "Something went wrong. Reset email was not sent. Please try again."
          );
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
});

router.put("/updatepassword", nonTestingRatelimiter, async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
    "passwordResetToken.token": req.body.token,
  });
  if (!user) return res.status(400).send("Password reset not requested");
  if (user.passwordReset?.expiration < pickADate(-1))
    return res
      .status(400)
      .send("Reset token has expired, please request another reset");

  const pw = validatePassword(req.body.password);
  if (pw.error) {
    return res
      .status(400)
      .send(
        "Password must contain at least one lower case, one upper case and one number."
      );
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
});

module.exports = router;
