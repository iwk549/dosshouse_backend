const express = require("express");
const router = express.Router();
const { loginLimiter, lowLimiter } = require("../../middleware/rateLimiter");
const auth = require("../../middleware/auth");
const {
  createNewAccount,
  login,
  getUserInfo,
  deleteUser,
  updateUser,
  requestPasswordReset,
  updatePassword,
} = require("../controllers/user.controller");

// do not implement rate limiter during testing
const nonTestingRatelimiter =
  process.env.NODE_ENV !== "test" ? [loginLimiter] : [];

router.post("/", nonTestingRatelimiter, createNewAccount);
router.post("/login", nonTestingRatelimiter, login);
router.get("/", [auth], getUserInfo);
router.delete("/", [auth], deleteUser);
router.put("/", [auth], updateUser);
router.put("/resetpassword/:email", [lowLimiter], requestPasswordReset);
router.put("/updatepassword", nonTestingRatelimiter, updatePassword);

module.exports = router;
