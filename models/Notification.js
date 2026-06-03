const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null  // null = broadcast to all users
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  message: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["info", "warning", "promo", "system"],
    default: "info"
  },

  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

// Index for efficient user notification queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
