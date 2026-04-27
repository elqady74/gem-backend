const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Event = require("../models/Event");
const { t } = require("../utils/i18n");

const router = express.Router();

/* =========================
   Get All Events (Public)
========================= */
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error("Events Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Create Event (Admin Only)
========================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: t(req, "access_denied") });
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
    console.error("Events Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Delete Event (Admin Only)
========================= */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: t(req, "access_denied") });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: t(req, "event_deleted") });

  } catch (error) {
    console.error("Events Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

module.exports = router;