const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: false   // 👈 نخليها مش إجبارية علشان Google
  },

  avatar: {
    type: String,
    default: ""
  },

  googleId: {
    type: String,
    default: null
  },

  resetPasswordToken: {
    type: String,
    default: null
  },

  resetPasswordExpire: {
    type: Date,
    default: null
  },

  language: {
    type: String,
    enum: ["en", "ar"],
    default: "en"
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);