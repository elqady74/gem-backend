const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "itemType"
  },
  itemType: {
    type: String,
    required: true,
    enum: ["Artifact", "Event"]
  }
}, { timestamps: true });

// Compound unique index — prevents duplicate favorites at DB level
favoriteSchema.index({ user: 1, itemId: 1, itemType: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);