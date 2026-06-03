const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { t } = require("../utils/i18n");

module.exports = async function (req, res, next) {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: t(req, "no_token") });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Check if user is banned
    const user = await User.findById(decoded.id).select("isBanned");
    if (user && user.isBanned) {
      return res.status(403).json({ message: t(req, "account_banned") });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: t(req, "token_invalid") });
  }
};