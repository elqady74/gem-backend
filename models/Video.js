const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: String,
  public_id: String,
  url: String,
  duration: Number
}, { timestamps: true });

module.exports = mongoose.model("Video", videoSchema);