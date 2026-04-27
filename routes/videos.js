const express = require("express");
const Video = require("../models/Video");
const { t } = require("../utils/i18n");
const router = express.Router();

router.post("/add", async (req, res) => {
  try {
    const { title, public_id, url, duration } = req.body;

    const video = await Video.create({
      title,
      public_id,
      url,
      duration
    });

    res.json(video);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

router.get("/", async (req, res) => {
  const videos = await Video.find();
  res.json(videos);
});

module.exports = router;