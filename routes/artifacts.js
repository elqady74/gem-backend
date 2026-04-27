const express = require("express");
const Artifact = require("../models/Artifact");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { t } = require("../utils/i18n");

const router = express.Router();

/* =========================
   Create Artifact (Admin)
========================= */
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const newArtifact = new Artifact(req.body);
    await newArtifact.save();
    res.status(201).json(newArtifact);
  } catch (error) {
    console.error("Artifacts Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Get All Artifacts
========================= */
router.get("/", async (req, res) => {
  try {
    const artifacts = await Artifact.find();
    res.json(artifacts);
  } catch (error) {
    console.error("Artifacts Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Get Single Artifact
========================= */
router.get("/:id", async (req, res) => {
  try {
    const artifact = await Artifact.findById(req.params.id);

    if (!artifact) {
      return res.status(404).json({ message: t(req, "artifact_not_found") });
    }

    res.json(artifact);
  } catch (error) {
    console.error("Artifacts Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Update Artifact (Admin)
========================= */
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updatedArtifact = await Artifact.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedArtifact) {
      return res.status(404).json({ message: t(req, "artifact_not_found") });
    }

    res.json(updatedArtifact);

  } catch (error) {
    console.error("Artifacts Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Delete Artifact (Admin)
========================= */
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deletedArtifact = await Artifact.findByIdAndDelete(req.params.id);

    if (!deletedArtifact) {
      return res.status(404).json({ message: t(req, "artifact_not_found") });
    }

    res.json({ message: t(req, "artifact_deleted") });

  } catch (error) {
    console.error("Artifacts Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

module.exports = router;