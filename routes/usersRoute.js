const {
  User,
  validateUser,
  validatePassword,
  validateLogin,
  validateEdit,
} = require("../models/userModel");
const express = require("express");
const router = express.Router();
const { loginLimiter } = require("../middleware/rateLimiter");
const {
  saltAndHashPassword,
  trimEmail,
  comparePasswords,
} = require("../utils/users");
const auth = require("../middleware/auth");
const { Prediction } = require("../models/predictionModel");

router.post("/", [loginLimiter], async (req, res) => {
  req.body.email = trimEmail(req.body.email);
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
  const user = new User(req.body);
  await user.save();
  const token = user.generateAuthToken();
  res.send(token);
});

router.post("/login", [loginLimiter], async (req, res) => {
  req.body.email = trimEmail(req.body.email);
  const ex = validateLogin({
    email: req.body.email,
    password: req.body.password,
  });
  if (ex.error) return res.status(400).send(ex.error.details[0].message);

  const user = await User.findOne({ email: req.body.email });
  const validPassword = comparePasswords(req.body.password, user?.password);
  if (!validPassword || !user)
    return res.status(400).send("Invalid email or password");
  const token = user.generateAuthToken();
  res.send(token);
});

router.get("/", [auth], async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(409).send("Account not found");
  const token = user.generateAuthToken();
  res.send(token);
});

router.delete("/", [auth], async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(400).send("User account not found");

  // ! models to delete (have not implemented transactions yet)
  // predictions
  // user
  await Prediction.deleteMany({ userID: req.user._id });
  const result = await User.deleteOne({ _id: req.user._id });
  res.send(result);
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

module.exports = router;
