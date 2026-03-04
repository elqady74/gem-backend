const mongoose = require("mongoose");

const artifactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  era: String,
  imageUrl: String,

  model3DUrl: String,   // 👈 3D model
  audioUrl: String,     // 👈 voice over
  videoUrl: String,     // 👈 video 

}, { timestamps: true });

module.exports = mongoose.model("Artifact", artifactSchema);