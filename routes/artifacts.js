const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const Artifact = require("../models/Artifact");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { t } = require("../utils/i18n");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes("excel") || 
      file.mimetype.includes("spreadsheetml") ||
      file.originalname.endsWith(".xls") ||
      file.originalname.endsWith(".xlsx")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Please upload an Excel file"), false);
    }
  }
});

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
   Bulk Upload Artifacts (Admin)
========================= */
router.post("/bulk-upload", authMiddleware, adminMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Read the file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ message: "File is empty" });
    }

    // Map rows to Artifact model
    const artifactsToInsert = data.map(row => ({
      name: row.name || row.Name || row.NAME || row["اسم الاثر"] || row["اسم الأثر"] || row["الاسم"],
      description: row.description || row.Description || row.DESCRIPTION || row["الوصف"] || row["وصف"],
      era: row.era || row.Era || row.ERA || row["الحقبة"] || row["العصر"] || row["الفترة"],
      imageUrl: row.imageUrl || row.ImageUrl || row.IMAGEURL || row.image_url || row["الصورة"],
      model3DUrl: row.model3DUrl || row.Model3DUrl || row.model_3d_url || row["المجسم"],
      audioUrl: row.audioUrl || row.AudioUrl || row.audio_url || row["الصوت"],
      videoUrl: row.videoUrl || row.VideoUrl || row.video_url || row["الفيديو"]
    })).filter(a => a.name && a.description); // Required fields

    if (artifactsToInsert.length === 0) {
      return res.status(400).json({ message: "No valid artifacts found in the file. Make sure 'name' and 'description' columns exist." });
    }

    // Insert to DB
    const result = await Artifact.insertMany(artifactsToInsert);

    res.status(201).json({ 
      message: `${result.length} artifacts uploaded successfully`,
      insertedCount: result.length
    });

  } catch (error) {
    console.error("Bulk Upload Error:", error);
    res.status(500).json({ message: t(req, "server_error"), error: error.message });
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