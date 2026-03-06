const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  imageName: String,
  detectedArtifact: String,
  confidence: {
    type: Number,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Detection", detectionSchema);