const ActivityLog = require("../models/ActivityLog");

/**
 * Log an admin activity.
 *
 * @param {object} params
 * @param {string} params.adminId    - ID of the admin performing the action
 * @param {string} params.action     - e.g. "create_artifact", "delete_user", "update_settings"
 * @param {string} params.targetModel - e.g. "User", "Artifact", "Booking"
 * @param {string} [params.targetId] - ID of the affected document
 * @param {object} [params.details]  - extra info (old values, new values, etc.)
 * @param {string} [params.ipAddress] - request IP
 */
async function logActivity({ adminId, action, targetModel, targetId = null, details = null, ipAddress = null }) {
  try {
    await ActivityLog.create({
      admin: adminId,
      action,
      targetModel,
      targetId,
      details,
      ipAddress
    });
  } catch (error) {
    // Activity logging should never break the main request
    console.error("Activity Log Error:", error.message);
  }
}

module.exports = { logActivity };
