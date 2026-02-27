const mongoose = require("mongoose");

const detectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  imageName: String,
  detectedArtifact: String
}, { timestamps: true });

module.exports = mongoose.model("Detection", detectionSchema);