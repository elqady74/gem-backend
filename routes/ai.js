const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const { generateAIResponse } = require("../services/aiService");
const authMiddleware = require("../middleware/authMiddleware");
const Chat = require("../models/Chat");
const Artifact = require("../models/Artifact");
const Detection = require("../models/Detection");
const { t } = require("../utils/i18n");

const router = express.Router();

/* =========================
   Multer Setup
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

/* =========================
   Ngrok helper — skips browser warning
========================= */
function ngrokHeaders() {
  return { "ngrok-skip-browser-warning": "true" };
}

/* ============================================================
   1. AI Chat Endpoint (existing)
============================================================ */
router.post("/ask", authMiddleware, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: t(req, "question_required") });
    }

    const answer = await generateAIResponse(question);

    await Chat.create({
      user: req.user.id,
      question,
      answer,
    });

    res.json({ answer });

  } catch (error) {
    console.error("AI Route Error:", error);

    if (error.message && error.message.includes("401")) {
      return res.status(401).json({
        answer: `❌ Error: ${error.message}`
      });
    }

    if (error.message && error.message.includes("فشل")) {
      return res.status(500).json({
        answer: `❌ Error: ${error.message}`
      });
    }

    res.status(500).json({ answer: `❌ ${t(req, "server_error")}` });
  }
});

/* ============================================================
   2. Get My Chat History (existing)
============================================================ */
router.get("/chats", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(chats);
  } catch (error) {
    console.error("AI Route Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ============================================================
   3. Artifact Detection (camera / upload)
      Sends image to detection model API (ngrok)
============================================================ */
router.post(
  "/detect",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: t(req, "image_required") });
      }

      const detectionApiUrl = process.env.DETECTION_API_URL;

      if (!detectionApiUrl || detectionApiUrl === "YOUR_NGROK_DETECTION_URL") {
        return res.status(503).json({
          message: t(req, "detection_api_not_configured")
        });
      }

      // Send image to detection model
      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      const apiResponse = await axios.post(
        `${detectionApiUrl}/predict`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            ...ngrokHeaders()
          },
          timeout: 30000
        }
      );

      const result = apiResponse.data;

      // Try to find artifact info from DB
      const detectedName = result.name || result.label || result.prediction || "Unknown";
      const confidence = result.confidence || result.score || null;

      const artifact = await Artifact.findOne({
        name: { $regex: new RegExp(detectedName, "i") }
      });

      // Save detection record
      await Detection.create({
        user: req.user.id,
        imageName: req.file.originalname,
        detectedArtifact: detectedName,
        confidence,
        details: result
      });

      res.json({
        detected: detectedName,
        confidence,
        artifact: artifact || null,
        rawResult: result
      });

    } catch (error) {
      console.error("Detection Error:", error.response?.data || error.message);

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return res.status(503).json({
          message: t(req, "detection_api_offline")
        });
      }

      res.status(500).json({ message: t(req, "detection_failed"), details: error.message });
    }
  }
);

/* ============================================================
   4. Get My Detection History (existing)
============================================================ */
router.get("/detections", authMiddleware, async (req, res) => {
  try {
    const detections = await Detection.find({ user: req.user.id })
      .sort({ createdAt: -1 });
    res.json(detections);
  } catch (error) {
    console.error("AI Route Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ============================================================
   5. Story → Image
      Sends story text to ngrok FastAPI → returns generated image
============================================================ */
router.post("/story-to-image", authMiddleware, async (req, res) => {
  try {
    const { story } = req.body;

    if (!story || !story.trim()) {
      return res.status(400).json({ message: t(req, "story_required") });
    }

    const apiUrl = process.env.STORY_TO_IMAGE_API_URL;

    if (!apiUrl || apiUrl === "YOUR_NGROK_STORY_TO_IMAGE_URL") {
      return res.status(503).json({
        message: t(req, "story_api_not_configured")
      });
    }

    const apiResponse = await axios.post(
      `${apiUrl}/generate`,
      { story: story, prompt: story, text: story },
      {
        headers: {
          "Content-Type": "application/json",
          ...ngrokHeaders()
        },
        timeout: 120000, // 2 minutes — image generation is slow
        responseType: "arraybuffer" // may return binary image
      }
    );

    // Check if response is JSON or binary image
    const contentType = apiResponse.headers["content-type"];

    if (contentType && contentType.includes("image")) {
      const base64Image = Buffer.from(apiResponse.data).toString("base64");
      const mimeType = contentType.split(";")[0];

      return res.json({
        image: `data:${mimeType};base64,${base64Image}`,
        format: "base64"
      });
    }

    // JSON response
    const result = typeof apiResponse.data === "string"
      ? JSON.parse(apiResponse.data)
      : apiResponse.data;

    res.json({
      image: result.image || result.url || result.result || null,
      format: result.format || "url",
      rawResult: result
    });

  } catch (error) {
    console.error("Story-to-Image Error:", error.response?.data || error.message);

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        message: t(req, "story_api_offline")
      });
    }

    res.status(500).json({ message: t(req, "image_generation_failed"), details: error.message });
  }
});

/* ============================================================
   6. Name → Egyptian Cartouche
      Uses HuggingFace Gradio space: samaelgendy/gem_cartouche
============================================================ */
router.post("/name-to-cartouche", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: t(req, "name_required") });
    }

    const hfSpace = process.env.CARTOUCHE_HF_SPACE || "samaelgendy/gem_cartouche";
    const hfToken = process.env.CARTOUCHE_HF_TOKEN;
    const openrouterKey = process.env.CARTOUCHE_OPENROUTER_KEY;

    // Dynamically import ES Module
    const { Client } = await import("@gradio/client");

    // Timeout helper to prevent hanging
    const withTimeout = (promise, ms, errorMsg) => {
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMsg)), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
    };

    // Connect with 20s timeout
    const client = await withTimeout(
      Client.connect(hfSpace, { hf_token: hfToken }),
      20000,
      "HuggingFace Space connection timed out (Space might be sleeping or Token invalid)"
    );

    // Predict with 30s timeout
    const result = await withTimeout(
      client.predict("/generate_cartouche", [
        name,
        openrouterKey
      ]),
      30000,
      "Cartouche generation timed out (OpenRouter API Key might be invalid)"
    );

    // Gradio returns data in result.data
    const data = result.data;

    // Handle different possible response formats
    let cartoucheImage = null;

    if (data && Array.isArray(data) && data.length > 0) {
      // Could be a file object { path, url, ... } or base64 string
      const firstResult = data[0];

      if (typeof firstResult === "string") {
        cartoucheImage = firstResult;
      } else if (firstResult && firstResult.url) {
        cartoucheImage = firstResult.url;
      } else if (firstResult && firstResult.path) {
        cartoucheImage = firstResult.path;
      } else {
        cartoucheImage = firstResult;
      }
    } else if (data && typeof data === "string") {
      cartoucheImage = data;
    }

    res.json({
      name,
      cartouche: cartoucheImage,
      rawResult: data
    });

  } catch (error) {
    console.error("Cartouche Error:", error.message);
    res.status(500).json({ message: t(req, "cartouche_failed"), details: error.message });
  }
});

/* ============================================================
   7. Photo → Pharaoh / Queen
      Sends user photo to ngrok FastAPI → returns transformed image
============================================================ */
router.post(
  "/photo-to-pharaoh",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: t(req, "image_required") });
      }

      const apiUrl = process.env.PHOTO_TO_PHARAOH_API_URL;

      if (!apiUrl || apiUrl === "YOUR_NGROK_PHOTO_TO_PHARAOH_URL") {
        return res.status(503).json({
          message: t(req, "pharaoh_api_not_configured")
        });
      }

      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      const apiResponse = await axios.post(
        `${apiUrl}/transform`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            ...ngrokHeaders()
          },
          timeout: 120000,
          responseType: "arraybuffer"
        }
      );

      const contentType = apiResponse.headers["content-type"];

      if (contentType && contentType.includes("image")) {
        const base64Image = Buffer.from(apiResponse.data).toString("base64");
        const mimeType = contentType.split(";")[0];

        return res.json({
          pharaohImage: `data:${mimeType};base64,${base64Image}`,
          format: "base64"
        });
      }

      const result = typeof apiResponse.data === "string"
        ? JSON.parse(apiResponse.data)
        : apiResponse.data;

      res.json({
        pharaohImage: result.image || result.url || result.result || null,
        format: result.format || "url",
        rawResult: result
      });

    } catch (error) {
      console.error("Photo-to-Pharaoh Error:", error.response?.data || error.message);

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return res.status(503).json({
          message: t(req, "pharaoh_api_offline")
        });
      }

      res.status(500).json({ message: t(req, "pharaoh_failed"), details: error.message });
    }
  }
);

/* ============================================================
   8. Text-to-Speech (Samaelgendy Tts1)
      Inputs: statueId (Number/String), language ('ar' or 'en')
============================================================ */
router.post("/text-to-speech", authMiddleware, async (req, res) => {
  try {
    const { statueId, language } = req.body;

    if (!statueId) {
      return res.status(400).json({ message: t(req, "statue_id_required") });
    }

    const ttsSpace = process.env.TTS_HF_SPACE || "samaelgendy/Tts1";
    const ttsToken = process.env.TTS_HF_TOKEN;
    const openrouterKey = process.env.TTS_OPENROUTER_KEY;

    // language mapping ("ar" -> "🇪🇬 عربي", "en" -> "🇬🇧 English")
    const langFormatted = (language === "en") ? "🇬🇧 English" : "🇪🇬 عربي";
    const statueFormatted = `[${statueId}]`;

    // Dynamically import ES Module
    const { Client } = await import("@gradio/client");

    const withTimeout = (promise, ms, errorMsg) => {
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMsg)), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
    };

    // Connect
    const client = await withTimeout(
      Client.connect(ttsSpace, { hf_token: ttsToken }),
      20000,
      "TTS HuggingFace Space connection timed out"
    );

    // Predict: /play_statue takes [statue_label, language]
    const result = await withTimeout(
      client.predict("/play_statue", [
        statueFormatted,
        langFormatted
      ]),
      30000,
      "TTS generation timed out"
    );

    const data = result.data;

    // Gradio returns: [info_text, text, audio_path]
    // The audio_path could be a file object { path, url }
    if (!data || data.length < 3) {
      return res.status(500).json({ message: t(req, "tts_invalid_response"), data });
    }

    const infoText = data[0];
    const scriptText = data[1];
    let audioOutput = data[2];

    if (infoText && infoText.includes("ارفع ملف الإكسيل")) {
      return res.status(400).json({
        message: t(req, "tts_excel_required"),
        rawError: infoText
      });
    }

    if (typeof audioOutput === "object" && audioOutput?.url) {
      audioOutput = audioOutput.url;
    } else if (typeof audioOutput === "object" && audioOutput?.path) {
      audioOutput = audioOutput.path;
    }

    res.json({
      info: infoText,
      text: scriptText,
      audioUrl: audioOutput
    });

  } catch (error) {
    console.error("TTS Error:", error.message);
    res.status(500).json({ message: t(req, "tts_failed"), details: error.message });
  }
});

/* ============================================================
   9. Image → 3D Model (Placeholder)
============================================================ */
router.post(
  "/image-to-3d",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      // Placeholder — will be connected to 3D model later
      res.status(202).json({
        message: t(req, "image_to_3d_coming_soon"),
        status: "placeholder"
      });

    } catch (error) {
      res.status(500).json({ message: t(req, "server_error") });
    }
  }
);

module.exports = router;