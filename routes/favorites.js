const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Favorite = require("../models/Favorite");

const router = express.Router();

/* =========================
   Add to Favorites
========================= */
router.post("/:artifactId", authMiddleware, async (req, res) => {
  try {
    const { artifactId } = req.params;

    const existing = await Favorite.findOne({
      user: req.user.id,
      artifact: artifactId
    });

    if (existing) {
      return res.status(400).json({ message: "Already in favorites" });
    }

    const favorite = await Favorite.create({
      user: req.user.id,
      artifact: artifactId
    });

    res.status(201).json(favorite);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Get My Favorites
========================= */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .populate("artifact");

    res.json(favorites);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Remove from Favorites
========================= */
router.delete("/:artifactId", authMiddleware, async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      user: req.user.id,
      artifact: req.params.artifactId
    });

    res.json({ message: "Removed from favorites" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;