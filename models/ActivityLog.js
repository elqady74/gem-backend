const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  action: {
    type: String,
    required: true
  },

  targetModel: {
    type: String,
    required: true,
    enum: ["User", "Artifact", "Booking", "Event", "Settings", "Chat", "Detection", "Video", "Notification"]
  },

  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  ipAddress: {
    type: String,
    default: null
  }

}, { timestamps: true });

// Index for efficient querying
activityLogSchema.index({ admin: 1, createdAt: -1 });
activityLogSchema.index({ targetModel: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
