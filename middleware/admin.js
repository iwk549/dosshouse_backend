const { User } = require("../models/userModel");

async function adminCheck(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (user.role.includes("admin")) return next();
  } catch (error) {
    //
  }
  res.status(403).send("Access Denied");
}

module.exports.adminCheck = adminCheck;
