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
      Uses HuggingFace Gradio space: tutora-artifact-lens
      API: run_analyze → returns markdown + audio + button state
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

      const hfSpace = process.env.ARTIFACT_LENS_HF_SPACE || "s0ad-atef/tutora-artifact-lens";
      const hfToken = process.env.ARTIFACT_LENS_HF_TOKEN;

      if (!hfSpace) {
        return res.status(503).json({
          message: t(req, "detection_api_not_configured")
        });
      }

      const language = req.body.language || "ar";
      const langChoice = language === "en" ? "English" : "Arabic / عربي";

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
        "Artifact Lens HuggingFace Space connection timed out (Space might be sleeping)"
      );

      // Convert buffer to Blob for Gradio
      const imageBlob = new Blob([req.file.buffer], { type: req.file.mimetype });

      // Call run_analyze
      const result = await withTimeout(
        client.predict("/run_analyze", [imageBlob, langChoice]),
        120000,
        "Artifact detection timed out"
      );

      const data = result.data;
      // data[0] = markdown string: "### artifact_name\n\n**Confidence:** 95.3%\n\nstory..."
      // data[1] = audio file object
      // data[2] = button state (ignored)

      const markdownText = data[0] || "";

      // Parse markdown to extract detection info
      const nameMatch = markdownText.match(/^###\s*(.+)$/m);
      const confMatch = markdownText.match(/\*\*Confidence:\*\*\s*([\d.]+)%/);
      const detectedName = nameMatch ? nameMatch[1].trim() : "Unknown";
      const confidence = confMatch ? parseFloat(confMatch[1]) / 100 : null;

      // Extract story text (everything after the confidence line)
      const storyMatch = markdownText.split(/\*\*Confidence:\*\*.*\n\n?/);
      const storyText = storyMatch.length > 1 ? storyMatch[1].trim() : "";

      // Try to find artifact info from DB
      const artifact = await Artifact.findOne({
        name: { $regex: new RegExp(detectedName, "i") }
      });

      // Save detection record
      await Detection.create({
        user: req.user.id,
        imageName: req.file.originalname,
        detectedArtifact: detectedName,
        confidence,
        details: { story: storyText, source: "artifact-lens" }
      });

      res.json({
        detected: detectedName,
        confidence,
        artifact: artifact || null,
        story: storyText,
        rawResult: markdownText
      });

    } catch (error) {
      console.error("Detection Error:", error.message);

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
   8. Text-to-Speech
      Uses HuggingFace Gradio space: tutora-artifact-lens
      API: run_analyze → returns markdown + audio
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

      const hfSpace = process.env.ARTIFACT_LENS_HF_SPACE || "s0ad-atef/tutora-artifact-lens";
      const hfToken = process.env.ARTIFACT_LENS_HF_TOKEN;
      const language = req.body.language || "ar";
      const langChoice = language === "en" ? "English" : "Arabic / عربي";

      if (!hfSpace) {
        return res.status(503).json({
          message: t(req, "tts_api_not_configured")
        });
      }

      // Dynamically import ES Module
      const { Client } = await import("@gradio/client");

      const withTimeout = (promise, ms, errorMsg) => {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(errorMsg)), ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
      };

      const client = await withTimeout(
        Client.connect(hfSpace, { hf_token: hfToken }),
        30000,
        "Artifact Lens Space connection timed out (Space might be sleeping)"
      );

      const imageBlob = new Blob([req.file.buffer], { type: req.file.mimetype });

      const result = await withTimeout(
        client.predict("/run_analyze", [imageBlob, langChoice]),
        120000,
        "Story + TTS generation timed out"
      );

      const data = result.data;
      const markdownText = data[0] || "";
      const audioFile = data[1]; // audio file object { url, path, ... }

      // Parse markdown
      const nameMatch = markdownText.match(/^###\s*(.+)$/m);
      const confMatch = markdownText.match(/\*\*Confidence:\*\*\s*([\d.]+)%/);
      const detectedName = nameMatch ? nameMatch[1].trim() : "Unknown";

      // Extract story text
      const storyMatch = markdownText.split(/\*\*Confidence:\*\*.*\n\n?/);
      const storyText = storyMatch.length > 1 ? storyMatch[1].trim() : "";

      // Get audio URL from Gradio response
      let audioUrl = null;
      if (audioFile) {
        if (typeof audioFile === "string") {
          audioUrl = audioFile;
        } else if (audioFile.url) {
          audioUrl = audioFile.url;
        } else if (audioFile.path) {
          audioUrl = audioFile.path;
        }
      }

      // Download audio and convert to base64
      let audioBase64 = null;
      if (audioUrl) {
        try {
          const audioResponse = await axios.get(audioUrl, {
            responseType: "arraybuffer",
            timeout: 30000
          });
          audioBase64 = `data:audio/mpeg;base64,${Buffer.from(audioResponse.data).toString("base64")}`;
        } catch (audioErr) {
          console.error("Audio download failed:", audioErr.message);
          // Still return the URL if download fails
          audioBase64 = audioUrl;
        }
      }

      res.json({
        story: storyText,
        audioBase64,
        audioUrl,
        detected: detectedName,
        rawResult: markdownText
      });

    } catch (error) {
      console.error("TTS/Pipeline Error:", error.message);

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
   9. Image → 3D Model
      Uses HuggingFace Gradio space: tutora-artifact-lens
      Flow: run_analyze (to detect + set 3D prompt) → run_3d
============================================================ */
router.post(
  "/image-to-3d",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: t(req, "image_required") });
      }

      const hfSpace = process.env.ARTIFACT_LENS_HF_SPACE || "s0ad-atef/tutora-artifact-lens";
      const hfToken = process.env.ARTIFACT_LENS_HF_TOKEN;

      if (!hfSpace) {
        return res.status(503).json({
          message: t(req, "model_3d_api_not_configured")
        });
      }

      const language = req.body.language || "en";
      const langChoice = language === "en" ? "English" : "Arabic / عربي";

      const { Client } = await import("@gradio/client");

      const withTimeout = (promise, ms, errorMsg) => {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(errorMsg)), ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
      };

      const client = await withTimeout(
        Client.connect(hfSpace, { hf_token: hfToken }),
        30000,
        "Artifact Lens Space connection timed out (Space might be sleeping)"
      );

      const imageBlob = new Blob([req.file.buffer], { type: req.file.mimetype });

      // Step 1: Analyze (detect artifact + set internal 3D prompt)
      console.log("Image-to-3D: Step 1 — Analyzing artifact...");
      const analyzeResult = await withTimeout(
        client.predict("/run_analyze", [imageBlob, langChoice]),
        120000,
        "Artifact analysis timed out"
      );

      const markdownText = analyzeResult.data[0] || "";
      const nameMatch = markdownText.match(/^###\s*(.+)$/m);
      const detectedName = nameMatch ? nameMatch[1].trim() : "Unknown";

      // Step 2: Generate 3D model (uses the prompt set by step 1)
      console.log("Image-to-3D: Step 2 — Generating 3D model for:", detectedName);
      const model3dResult = await withTimeout(
        client.predict("/run_3d", []),
        300000, // 5 minutes — 3D generation is slow (Shap-E)
        "3D model generation timed out (Shap-E can take up to 5 minutes)"
      );

      const model3dFile = model3dResult.data[0];

      // Get 3D model URL
      let model3dUrl = null;
      if (model3dFile) {
        if (typeof model3dFile === "string") {
          model3dUrl = model3dFile;
        } else if (model3dFile.url) {
          model3dUrl = model3dFile.url;
        } else if (model3dFile.path) {
          model3dUrl = model3dFile.path;
        }
      }

      res.json({
        detected: detectedName,
        model3d: model3dUrl,
        format: "glb",
        rawResult: model3dFile
      });

    } catch (error) {
      console.error("Image-to-3D Error:", error.message);

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return res.status(503).json({
          message: t(req, "model_3d_api_offline")
        });
      }

      res.status(500).json({ message: t(req, "model_3d_failed"), details: error.message });
    }
  }
);

/* ============================================================
   10. Full Analysis (detect → story → audio → 3D) — ALL IN ONE
       Uses HuggingFace Gradio space: tutora-artifact-lens
       Calls run_analyze then run_3d sequentially
============================================================ */
router.post(
  "/full-analysis",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: t(req, "image_required") });
      }

      const hfSpace = process.env.ARTIFACT_LENS_HF_SPACE || "s0ad-atef/tutora-artifact-lens";
      const hfToken = process.env.ARTIFACT_LENS_HF_TOKEN;

      if (!hfSpace) {
        return res.status(503).json({
          message: t(req, "model_3d_api_not_configured")
        });
      }

      const language = req.body.language || "ar";
      const langChoice = language === "en" ? "English" : "Arabic / عربي";

      const { Client } = await import("@gradio/client");

      const withTimeout = (promise, ms, errorMsg) => {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(errorMsg)), ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
      };

      const client = await withTimeout(
        Client.connect(hfSpace, { hf_token: hfToken }),
        30000,
        "Artifact Lens Space connection timed out (Space might be sleeping)"
      );

      const imageBlob = new Blob([req.file.buffer], { type: req.file.mimetype });

      // ── Step 1: Analyze (detect + story + TTS) ─────────────
      console.log("Full Analysis: Step 1 — Analyzing artifact...");
      const analyzeResult = await withTimeout(
        client.predict("/run_analyze", [imageBlob, langChoice]),
        120000,
        "Artifact analysis timed out"
      );

      const data = analyzeResult.data;
      const markdownText = data[0] || "";
      const audioFile = data[1];

      // Parse detection info from markdown
      const nameMatch = markdownText.match(/^###\s*(.+)$/m);
      const confMatch = markdownText.match(/\*\*Confidence:\*\*\s*([\d.]+)%/);
      const detectedName = nameMatch ? nameMatch[1].trim() : "Unknown";
      const confidence = confMatch ? parseFloat(confMatch[1]) / 100 : null;

      // Extract story text
      const storyMatch = markdownText.split(/\*\*Confidence:\*\*.*\n\n?/);
      const storyText = storyMatch.length > 1 ? storyMatch[1].trim() : "";

      // Get audio URL
      let audioUrl = null;
      if (audioFile) {
        if (typeof audioFile === "string") {
          audioUrl = audioFile;
        } else if (audioFile.url) {
          audioUrl = audioFile.url;
        } else if (audioFile.path) {
          audioUrl = audioFile.path;
        }
      }

      // Download audio → base64
      let audioBase64 = null;
      if (audioUrl) {
        try {
          const audioResponse = await axios.get(audioUrl, {
            responseType: "arraybuffer",
            timeout: 30000
          });
          audioBase64 = `data:audio/mpeg;base64,${Buffer.from(audioResponse.data).toString("base64")}`;
        } catch (audioErr) {
          console.error("Audio download failed:", audioErr.message);
          audioBase64 = audioUrl;
        }
      }

      // ── Step 2: Generate 3D Model ──────────────────────────
      console.log("Full Analysis: Step 2 — Generating 3D model for:", detectedName);
      let model3dUrl = null;
      try {
        const model3dResult = await withTimeout(
          client.predict("/run_3d", []),
          300000, // 5 minutes
          "3D model generation timed out"
        );

        const model3dFile = model3dResult.data[0];
        if (model3dFile) {
          if (typeof model3dFile === "string") {
            model3dUrl = model3dFile;
          } else if (model3dFile.url) {
            model3dUrl = model3dFile.url;
          } else if (model3dFile.path) {
            model3dUrl = model3dFile.path;
          }
        }
      } catch (err3d) {
        console.error("3D generation failed (non-fatal):", err3d.message);
        // Don't fail the entire request — return what we have
      }

      // Try to find artifact info from DB
      const artifact = await Artifact.findOne({
        name: { $regex: new RegExp(detectedName, "i") }
      });

      // Save detection record
      await Detection.create({
        user: req.user.id,
        imageName: req.file.originalname,
        detectedArtifact: detectedName,
        confidence,
        details: {
          story: storyText,
          has3dModel: !!model3dUrl,
          source: "artifact-lens-full"
        }
      });

      res.json({
        detected: detectedName,
        confidence,
        artifact: artifact || null,
        story: storyText,
        audioBase64,
        audioUrl,
        model3d: model3dUrl,
        model3dFormat: model3dUrl ? "glb" : null,
        rawMarkdown: markdownText
      });

    } catch (error) {
      console.error("Full Analysis Error:", error.message);

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return res.status(503).json({
          message: t(req, "model_3d_api_offline")
        });
      }

      res.status(500).json({ message: t(req, "full_analysis_failed"), details: error.message });
    }
  }
);

module.exports = router;