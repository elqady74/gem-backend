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
      Sends image to HuggingFace storyteller API /detect
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

      const storytellerUrl = process.env.STORYTELLER_API_URL;
      const hfToken = process.env.STORYTELLER_HF_TOKEN;

      if (!storytellerUrl) {
        return res.status(503).json({
          message: t(req, "detection_api_not_configured")
        });
      }

      // Send image to HuggingFace storyteller /detect endpoint
      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

      const apiResponse = await axios.post(
        `${storytellerUrl}/detect`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {})
          },
          timeout: 60000
        }
      );

      const result = apiResponse.data;

      // Try to find artifact info from DB
      const detectedName = result.name || result.class || result.label || result.prediction || "Unknown";
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
      Uses HuggingFace Gradio space: soadatef199/pharaonic-ai-generator
      Endpoint: /infer
============================================================ */
router.post("/story-to-image", authMiddleware, async (req, res) => {
  try {
    const { story } = req.body;

    if (!story || !story.trim()) {
      return res.status(400).json({ message: t(req, "story_required") });
    }

    const hfSpace = process.env.STORY_IMAGE_HF_SPACE || "soadatef199/pharaonic-ai-generator";
    const hfToken = process.env.STORY_IMAGE_HF_TOKEN;

    // Dynamically import ES Module
    const { Client } = await import("@gradio/client");

    // Timeout helper
    const withTimeout = (promise, ms, errorMsg) => {
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMsg)), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
    };

    // Connect to Gradio space
    const client = await withTimeout(
      Client.connect(hfSpace, { hf_token: hfToken }),
      30000,
      "Story-to-Image HuggingFace Space connection timed out (Space might be sleeping)"
    );

    // Call /infer with the story as prompt
    const result = await withTimeout(
      client.predict("/infer", {
        prompt: story,
        negative_prompt: "blurry, low quality, distorted, deformed",
        seed: 0,
        randomize_seed: true,
        width: 1024,
        height: 1024,
        guidance_scale: 7.5,
        num_inference_steps: 30
      }),
      180000, // 3 minutes — image generation can be slow
      "Image generation timed out"
    );

    const data = result.data;

    // Gradio returns [image_file_object, seed]
    let imageOutput = null;

    if (data && Array.isArray(data) && data.length > 0) {
      const firstResult = data[0];

      if (typeof firstResult === "string") {
        imageOutput = firstResult;
      } else if (firstResult && firstResult.url) {
        imageOutput = firstResult.url;
      } else if (firstResult && firstResult.path) {
        imageOutput = firstResult.path;
      } else {
        imageOutput = firstResult;
      }
    } else if (data && typeof data === "string") {
      imageOutput = data;
    }

    res.json({
      image: imageOutput,
      format: "url",
      rawResult: data
    });

  } catch (error) {
    console.error("Story-to-Image Error:", error.message);
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
   8. Text-to-Speech (merged into storyteller /full_pipeline)
      Sends image → gets story text + audio (base64 MP3)
      Inputs: image file, language ('ar' or 'en')
============================================================ */
router.post(
  "/text-to-speech",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: t(req, "image_required") });
      }

      const storytellerUrl = process.env.STORYTELLER_API_URL;
      const hfToken = process.env.STORYTELLER_HF_TOKEN;
      const language = req.body.language || "ar";

      if (!storytellerUrl) {
        return res.status(503).json({
          message: t(req, "tts_api_not_configured")
        });
      }

      // Send image + language to /full_pipeline
      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      form.append("language", language);

      const apiResponse = await axios.post(
        `${storytellerUrl}/full_pipeline`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {})
          },
          timeout: 120000 // 2 minutes — generation can be slow
        }
      );

      const result = apiResponse.data;

      // Response contains: story text + base64 MP3 audio
      res.json({
        story: result.story || result.text || null,
        audioBase64: result.audio || result.audio_base64 || null,
        detected: result.name || result.class || result.detected || null,
        rawResult: result
      });

    } catch (error) {
      console.error("TTS/Pipeline Error:", error.response?.data || error.message);

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return res.status(503).json({
          message: t(req, "tts_api_offline")
        });
      }

      res.status(500).json({ message: t(req, "tts_failed"), details: error.message });
    }
  }
);

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