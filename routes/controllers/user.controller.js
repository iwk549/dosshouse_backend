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
  deleteUserByID,
} = require("../../utils/users");
const { sendPasswordReset } = require("../../utils/emailing");
const { pickADate } = require("../../utils/allowables");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const crypto = require("crypto");

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
    user?.password,
  );

  if (!matchingPassword) return next({ status: 400, message: message });
  if (user.passwordReset)
    await User.updateOne({ _id: user._id }, { $set: { passwordReset: null } });
  const token = user.generateAuthToken();
  res.send(token);
}

async function getUserInfo(req, res, next) {
  const user = await User.findById(req.user._id);
  if (!user) return next({ status: 409, message: "Account not found" });
  await User.updateOne(
    { _id: req.user._id },
    { $set: { lastActive: new Date() } },
  );
  const token = user.generateAuthToken();
  res.send(token);
}

async function deleteUser(req, res, next) {
  const user = await User.findById(req.user._id);
  if (!user) return res.send("Account Deleted");

  const results = await deleteUserByID(req.user._id);
  if (results.name)
    return next({
      status: 400,
      message: "Something went wrong, account was not deleted. Please try again.",
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
    { returnOriginal: false },
  );

  const token = updatedUser.generateAuthToken();
  res.send(token);
}

async function requestPasswordReset(req, res, next) {
  const email = trimEmail(req.params.email);
  const ex = validateEmail(email);
  if (ex.error) return next({ status: 400, message: "Not a valid email" });

  const user = await User.findOne({ email });
  if (user) {
    const passwordResetToken = crypto.randomBytes(32).toString("hex");
    const emailSentSuccessfully = await sendPasswordReset(
      user,
      passwordResetToken,
    );
    if (!emailSentSuccessfully)
      return next({
        status: 400,
        message:
          "Something went wrong. Reset email was not sent. Please try again.",
      });

    await User.updateOne(
      { email },
      {
        $set: {
          passwordReset: {
            token: passwordResetToken,
            expiration: pickADate(7),
          },
        },
      },
    );
  }
  res.send(
    "An email will be sent to the address if an account is registered under it.",
  );
}

async function updatePassword(req, res, next) {
  const user = await User.findOne({
    email: req.body.email,
    "passwordResetToken.token": req.body.token,
  });
  if (!user)
    return next({ status: 400, message: "Password reset not requested" });
  if (user.passwordReset?.expiration < new Date())
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
    },
  );

  const token = updatedUser.generateAuthToken();
  res.send(token);
}

/*
********************************
  OAuth Logins
********************************
*/
async function oAuthLogin(userFilter, name, email) {
  let token;
  const user = await User.findOne({ ...userFilter });
  if (!user) {
    const userWithSharedEmail = await User.findOne({ email });
    if (userWithSharedEmail) {
      userWithSharedEmail.set({ ...userFilter, lastActive: new Date() });
      await userWithSharedEmail.save();
      token = userWithSharedEmail.generateAuthToken();
    } else {
      const newUser = new User({
        email,
        name,
        password: null,
        lastActive: new Date(),
        ...userFilter,
      });
      await newUser.save();
      token = newUser.generateAuthToken();
    }
  } else {
    user.set({ lastActive: new Date() });
    await user.save();
    token = user.generateAuthToken();
  }

  return token;
}

async function loginWithGoogle(req, res, next) {
  if (!req.body.idToken)
    return next({ status: 400, message: "No token provided" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    const token = await oAuthLogin({ googleId }, name, email);
    res.send(token);
  } catch (error) {
    next({ status: 400, message: error.message });
  }
}

module.exports = {
  createNewAccount,
  login,
  getUserInfo,
  deleteUser,
  updateUser,
  requestPasswordReset,
  updatePassword,
  loginWithGoogle,
};
