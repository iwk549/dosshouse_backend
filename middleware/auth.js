const { decodeJwt } = require("../utils/users");

async function auth(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token)
    return next({ status: 401, message: "Access denied. No token provided." });
  const { status, message, decoded } = decodeJwt(token);
  if (status === 200) {
    req.user = decoded;
    next();
  } else return next({ status: 400, message });
}

module.exports = auth;
