const User = require("../models/User");
const { t } = require("../utils/i18n");

module.exports = async function (req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: t(req, "access_denied_admin") });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: t(req, "server_error") });
  }
};