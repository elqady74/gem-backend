const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings");

// @route   GET /api/settings
// @desc    Get public museum settings and prices
// @access  Public
router.get("/", async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
