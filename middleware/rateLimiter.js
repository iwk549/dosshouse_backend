const rateLimit = require("express-rate-limit");

const exceededMessage = `Request limit exceeded. This limit is in place to prevent the server being overloaded by unauthorized users.
  If you believe you have received this message in error please contact accounts@dosshouse.us`;

// this limiter is to prevent the database from being overloaded
// 50 requests in 15 minutes (3.33 per minute)
const lowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // number of requests allowed in timeframe
  statusCode: 429,
  message: exceededMessage,
  handler: function (req, res) {
    res.status(429).send(exceededMessage);
  },
});

// this limiter is to prevent DDOS attacks on unprotected routes
// 500 requests in 15 minutes (33.33 per minute, 0.55 per second)
const highLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // number of requests allowed in timeframe
  statusCode: 429,
  message: exceededMessage,
  handler: function (req, res) {
    res.status(429).send(exceededMessage);
  },
});

// this limiter is to prevent too many signin requests
// 5 requests in 15 minutes (1 per minute)
const tooManyAttemptsMessage = `Too many failed login attempts. Please wait one minute and try again.`;
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // number of requests allowed in timeframe
  statusCode: 429,
  message: tooManyAttemptsMessage,
  handler: function (req, res) {
    res.status(429).send(tooManyAttemptsMessage);
  },
});

exports.lowLimiter = lowLimiter;
exports.highLimiter = highLimiter;
exports.loginLimiter = loginLimiter;
