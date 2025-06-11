const { User } = require("../models/user.model");

async function adminCheck(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (user.role.includes("admin")) return next();
  } catch (error) {
    //
  }
  next({ status: 403, message: "Access Denied" });
}

module.exports.adminCheck = adminCheck;
