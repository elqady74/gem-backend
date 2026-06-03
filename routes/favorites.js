const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Favorite = require("../models/Favorite");
const { t } = require("../utils/i18n");

const router = express.Router();

// Valid item types
const VALID_TYPES = ["Artifact", "Event"];

function normalizeType(type) {
  if (!type) return null;
  const lower = type.toLowerCase();
  if (lower === "artifact") return "Artifact";
  if (lower === "event") return "Event";
  return null;
}

/* =========================
   Add to Favorites
========================= */
router.post("/:itemId", authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    const itemType = normalizeType(req.body.type || req.query.type) || "Artifact";

    if (!VALID_TYPES.includes(itemType)) {
      return res.status(400).json({ message: t(req, "invalid_favorite_type") });
    }

    const existing = await Favorite.findOne({
      user: req.user.id,
      itemId,
      itemType
    });

    if (existing) {
      return res.status(400).json({ message: t(req, "already_in_favorites") });
    }

    const favorite = await Favorite.create({
      user: req.user.id,
      itemId,
      itemType
    });

    res.status(201).json(favorite);

  } catch (error) {
    console.error("Favorites Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Get My Favorites
   ?type=Artifact | Event  (optional — omit for all)
========================= */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const filter = { user: req.user.id };
    const itemType = normalizeType(req.query.type);

    if (itemType) {
      filter.itemType = itemType;
    }

    const mongoose = require("mongoose");
    const Artifact = require("../models/Artifact");
    const Event = require("../models/Event");

    let favorites = await Favorite.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate to safely handle static frontend string IDs
    for (let fav of favorites) {
      if (mongoose.Types.ObjectId.isValid(fav.itemId)) {
        if (fav.itemType === "Artifact") {
          const item = await Artifact.findById(fav.itemId).lean();
          if (item) fav.itemId = item;
        } else if (fav.itemType === "Event") {
          const item = await Event.findById(fav.itemId).lean();
          if (item) fav.itemId = item;
        }
      }
    }

    res.json(favorites);

  } catch (error) {
    console.error("Favorites Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Get Favorites Count
   ?type=Artifact | Event  (optional — omit for all)
========================= */
router.get("/count", authMiddleware, async (req, res) => {
  try {
    const filter = { user: req.user.id };
    const itemType = normalizeType(req.query.type);

    if (itemType) {
      filter.itemType = itemType;
    }

    const count = await Favorite.countDocuments(filter);
    res.json({ count });
  } catch (error) {
    console.error("Favorites Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Check if Item is Favorited
   ?type=Artifact | Event  (default: Artifact)
========================= */
router.get("/check/:itemId", authMiddleware, async (req, res) => {
  try {
    const itemType = normalizeType(req.query.type) || "Artifact";

    const existing = await Favorite.findOne({
      user: req.user.id,
      itemId: req.params.itemId,
      itemType
    });

    res.json({ isFavorited: !!existing });

  } catch (error) {
    console.error("Favorites Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Toggle Favorite (Add/Remove)
   body: { type: "Artifact" | "Event" }  (default: Artifact)
========================= */
router.post("/toggle/:itemId", authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    const itemType = normalizeType(req.body.type || req.query.type) || "Artifact";

    if (!VALID_TYPES.includes(itemType)) {
      return res.status(400).json({ message: t(req, "invalid_favorite_type") });
    }

    const existing = await Favorite.findOne({
      user: req.user.id,
      itemId,
      itemType
    });

    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      return res.json({ isFavorited: false, message: t(req, "removed_from_favorites") });
    }

    await Favorite.create({
      user: req.user.id,
      itemId,
      itemType
    });

    res.json({ isFavorited: true, message: t(req, "added_to_favorites") });

  } catch (error) {
    console.error("Favorites Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Remove from Favorites
   ?type=Artifact | Event  (default: Artifact)
========================= */
router.delete("/:itemId", authMiddleware, async (req, res) => {
  try {
    const itemType = normalizeType(req.query.type) || "Artifact";

    const deleted = await Favorite.findOneAndDelete({
      user: req.user.id,
      itemId: req.params.itemId,
      itemType
    });

    if (!deleted) {
      return res.status(404).json({ message: t(req, "favorite_not_found") });
    }

    res.json({ message: t(req, "removed_from_favorites") });

  } catch (error) {
    console.error("Favorites Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

module.exports = router;