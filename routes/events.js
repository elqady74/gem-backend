const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Event = require("../models/Event");

const router = express.Router();

/* =========================
   Get All Events (Public)
========================= */
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Create Event (Admin Only)
========================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, date, imageUrl } = req.body;

    const event = await Event.create({
      title,
      description,
      date,
      imageUrl
    });

    res.status(201).json(event);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Delete Event (Admin Only)
========================= */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: "Event deleted" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;