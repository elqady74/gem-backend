const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const Video = require("../models/Video");
const { t } = require("../utils/i18n");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

router.post("/video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: t(req, "no_file_uploaded") });
    }

    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: "gema_videos"
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload();

    const video = await Video.create({
      title: req.body.title,
      public_id: result.public_id,
      url: result.secure_url,
      duration: result.duration
    });

    res.json(video);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: t(req, "upload_failed") });
  }
});

module.exports = router;