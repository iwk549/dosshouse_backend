const config = require("config");
const jwt = require("jsonwebtoken");
const { decodeJwt } = require("../utils/users");

async function auth(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("Access denied. No token provided.");
  const { status, message, decoded } = decodeJwt(token);
  if (status === 200) {
    req.user = decoded;
    next();
  } else return res.status(400).send(message);
}

module.exports = auth;
