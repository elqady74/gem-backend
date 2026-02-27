const express = require("express");
const multer = require("multer");

const { generateAIResponse } = require("../services/aiService");
const authMiddleware = require("../middleware/authMiddleware");
const Chat = require("../models/Chat");
const Artifact = require("../models/Artifact");
const Detection = require("../models/Detection");

const router = express.Router();

/* =========================
   Multer Setup
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
});

/* =========================
   AI Chat Endpoint
========================= */
router.post("/ask", authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const answer = await generateAIResponse(question);

    await Chat.create({
      user: req.user.id,
      question,
      answer,
    });

    res.json({ answer });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Get My Chat History
========================= */
router.get("/chats", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(chats);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Image Detection
========================= */
router.post(
  "/detect",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      // مؤقتًا لحد ما نربط AI حقيقي
      const detectedArtifactName = "Statue of Ramses II";

      const artifact = await Artifact.findOne({
        name: detectedArtifactName,
      });

      if (!artifact) {
        return res.status(404).json({ message: "Artifact not found" });
      }

      await Detection.create({
        user: req.user.id,
        imageName: req.file.originalname,
        detectedArtifact: detectedArtifactName,
      });

      res.json({
        detected: detectedArtifactName,
        artifact,
      });

    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================
   Get My Detection History
========================= */
router.get("/detections", authMiddleware, async (req, res) => {
  try {
    const detections = await Detection.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(detections);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;