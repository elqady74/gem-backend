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
   Shared Helpers
========================= */

/** Timeout wrapper for promises */
function withTimeout(promise, ms, errorMsg) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Call the finalseq Gradio space (detect + story + audio + optional 3D).
 * Returns { infoLine, story, audioData, glbData }.
 *
 * Gradio fn `run_pipeline(image, language, want_3d)`:
 *   inputs:  [PIL Image, "ar"|"en", bool]
 *   outputs: [info_line: str, story: str, audio: file|null, glb: file|null]
 */
async function callFinalseq(imageBuffer, mimetype, language, want3d) {
  const { Client, handle_file } = await import("@gradio/client");

  const hfSpace = process.env.FINALSEQ_HF_SPACE || "s0ad-atef/finalseq";
  const hfToken = process.env.FINALSEQ_HF_TOKEN || process.env.HF_TOKEN;

  // Connect using token to avoid IP-based ZeroGPU quota limits
  const client = await withTimeout(
    Client.connect(hfSpace, hfToken ? { token: hfToken } : {}),
    60000,
    "Finalseq Space connection timed out (Space might be sleeping)"
  );

  const fileRef = handle_file(imageBuffer);

  const result = await withTimeout(
    client.predict("/run_pipeline", [fileRef, language, want3d]),
    300000, // 5 min — 3D can be slow
    "Artifact analysis timed out"
  );

  let data = result.data;

  // Auto-retry once if 3D was requested but returned null due to HF Space ZeroGPU timeout/errors
  if (want3d && !data[3]) {
    console.warn("[Finalseq] 3D model returned null. Retrying one more time...");
    try {
      const retryResult = await withTimeout(
        client.predict("/run_pipeline", [fileRef, language, want3d]),
        300000,
        "Artifact analysis timed out on retry"
      );
      if (retryResult && retryResult.data && retryResult.data[3]) {
        console.log("[Finalseq] Retry successful! 3D model generated.");
        data = retryResult.data;
      } else {
        console.warn("[Finalseq] Retry also failed to generate 3D model.");
      }
    } catch (retryErr) {
      console.error("[Finalseq] Retry error:", retryErr.message);
    }
  }
  // data[0] = info_line string: "التصنيف: {name}  |  الثقة: {conf}%"
  // data[1] = story string
  // data[2] = audio file object or null
  // data[3] = glb file object or null

  // Debug logging
  console.log("[Finalseq] Raw response data length:", data?.length);
  console.log("[Finalseq] data[0] (info):", typeof data[0], data[0]);
  console.log("[Finalseq] data[1] (story):", typeof data[1], String(data[1]).substring(0, 100));
  console.log("[Finalseq] data[2] (audio):", typeof data[2], JSON.stringify(data[2])?.substring(0, 200));
  console.log("[Finalseq] data[3] (3D):", typeof data[3], JSON.stringify(data[3])?.substring(0, 200));

  const infoLine = data[0] || "";
  const story = data[1] || "";

  // Parse info_line to extract name and confidence
  let detectedName = "Unknown";
  let confidence = null;
  // Arabic format: "التصنيف: NAME  |  الثقة: 95.3%"
  const nameMatch = infoLine.match(/التصنيف:\s*(.+?)\s*\|/);
  const confMatch = infoLine.match(/الثقة:\s*([\d.]+)%/);
  if (nameMatch) detectedName = nameMatch[1].trim();
  if (confMatch) confidence = parseFloat(confMatch[1]) / 100;

  // Audio: Gradio returns a file object with .url property
  let audioUrl = null;
  if (data[2]) {
    if (typeof data[2] === "string") {
      audioUrl = data[2];
    } else if (data[2].url) {
      audioUrl = data[2].url;
    } else if (data[2].path) {
      audioUrl = data[2].path;
    }
  }

  // 3D model: Gradio returns a file object with .url property
  let glbUrl = null;
  if (data[3]) {
    if (typeof data[3] === "string") {
      glbUrl = data[3];
    } else if (data[3].url) {
      glbUrl = data[3].url;
    } else if (data[3].path) {
      glbUrl = data[3].path;
    }
  }

  return { infoLine, detectedName, confidence, story, audioUrl, glbUrl };
}

/**
 * Download a remote file and convert to base64 data URI.
 */
async function downloadAsBase64(url, mimeType) {
  if (!url) return null;
  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
    const actualMime = response.headers["content-type"] || mimeType;
    const base64 = Buffer.from(response.data).toString("base64");
    return `data:${actualMime};base64,${base64}`;
  } catch (e) {
    console.error("Download failed:", e.message);
    return url; // Return the URL itself as fallback
  }
}


// -------------------------------------------------------------
// TEMPORARY DEBUG ENDPOINT
// -------------------------------------------------------------
router.get("/test-gradio", async (req, res) => {
  try {
    const { Client } = await import("@gradio/client");
    const hfSpace = process.env.FINALSEQ_HF_SPACE || "s0ad-atef/finalseq";
    const hfToken = process.env.FINALSEQ_HF_TOKEN || process.env.HF_TOKEN;

    const client = await Client.connect(hfSpace, hfToken ? { token: hfToken } : {});
    
    // Create a dummy image
    const dummyImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const imageBlob = new Blob([dummyImage], { type: "image/png" });

    const result = await client.predict("/run_pipeline", [imageBlob, "ar", true]);
    
    res.json({ success: true, raw_data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

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
      Uses Gradio space: s0ad-atef/finalseq
      Calls run_pipeline(image, language, want_3d=false)
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

      const language = req.body.language || "ar";

      const { detectedName, confidence, story, audioUrl } =
        await callFinalseq(req.file.buffer, req.file.mimetype, language, false);

      // Download audio and convert to base64 data URI for browser playback
      const audioDataUri = await downloadAsBase64(audioUrl, "audio/mpeg");

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
        details: { story, source: "finalseq" }
      });

      res.json({
        detected: detectedName,
        confidence,
        artifact: artifact || null,
        story,
        audio: audioDataUri,
        audioUrl: audioUrl,
      });

    } catch (error) {
      console.error("Detection Error:", error.message);

      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        return res.status(503).json({
          message: `${t(req, "detection_api_offline")}: ${error.message}`
        });
      }

      res.status(500).json({ message: `${t(req, "detection_failed")}: ${error.message}`, details: error.message });
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
      Uses HuggingFace Gradio space: s0ad-atef/EgyptianArtGenerator
      Endpoint: /generate_image
============================================================ */
router.post("/story-to-image", authMiddleware, async (req, res) => {
  try {
    const { story } = req.body;

    if (!story || !story.trim()) {
      return res.status(400).json({ message: t(req, "story_required") });
    }

    const { Client } = await import("@gradio/client");

    const hfSpace = process.env.STORY_IMAGE_HF_SPACE || "s0ad-atef/EgyptianArtGenerator";
    const hfToken = process.env.STORY_IMAGE_HF_TOKEN || process.env.HF_TOKEN;

    const client = await withTimeout(
      Client.connect(hfSpace, hfToken ? { token: hfToken } : {}),
      60000,
      "EgyptianArtGenerator Space connection timed out"
    );

    // predict("/generate_image", [prompt, negative_prompt, steps, guidance, seed, use_style])
    const result = await withTimeout(
      client.predict("/generate_image", [
        story,
        "",   // negative_prompt
        30,   // steps
        7.5,  // guidance
        -1,   // seed
        true  // use_style
      ]),
      300000, // 5 minutes
      "Image generation timed out"
    );

    const data = result.data;
    let imageOutput = null;

    if (data && Array.isArray(data) && data.length > 0) {
      const imgResult = data[0];
      if (typeof imgResult === "string") {
        imageOutput = imgResult;
      } else if (imgResult && imgResult.url) {
        imageOutput = imgResult.url;
      } else if (imgResult && imgResult.path) {
        imageOutput = imgResult.path;
      }
    } else if (data && typeof data === "object" && data.url) {
      imageOutput = data.url;
    } else if (typeof data === "string") {
      imageOutput = data;
    }

    if (imageOutput && (imageOutput.startsWith("http") || !imageOutput.startsWith("data:"))) {
      imageOutput = await downloadAsBase64(imageOutput, "image/jpeg");
    }

    res.json({
      image: imageOutput,
      format: imageOutput && imageOutput.startsWith("data:") ? "base64" : "url",
      rawResult: null
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

    const { Client } = await import("@gradio/client");

    const client = await withTimeout(
      Client.connect(hfSpace, { hf_token: hfToken }),
      20000,
      "HuggingFace Space connection timed out (Space might be sleeping or Token invalid)"
    );

    const result = await withTimeout(
      client.predict("/generate_cartouche", [
        name,
        openrouterKey
      ]),
      30000,
      "Cartouche generation timed out (OpenRouter API Key might be invalid)"
    );

    const data = result.data;

    let cartoucheImage = null;

    if (data && Array.isArray(data) && data.length > 0) {
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
      Uses Gradio space: s0ad-atef/imgtopharaph
      Calls transform_face(image, character, steps, scale, frame)
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

      const { Client, handle_file } = await import("@gradio/client");

      const hfSpace = process.env.PHARAOH_SWAP_HF_SPACE || "s0ad-atef/imgtopharaph";
      const hfToken = process.env.PHARAOH_SWAP_HF_TOKEN || process.env.HF_TOKEN;

      const client = await withTimeout(
        Client.connect(hfSpace, hfToken ? { token: hfToken } : {}),
        60000,
        "Pharaoh Swap Space connection timed out (Space might be sleeping)"
      );

      const fileRef = handle_file(req.file.buffer);

      const character = req.body.character || "pharaoh";
      const numSteps = parseInt(req.body.num_steps) || 40;
      const scale = parseFloat(req.body.scale) || 0.8;
      const addFrame = req.body.add_frame !== "false"; // default true

      const result = await withTimeout(
        client.predict("/transform_face", [
          fileRef,
          character,
          numSteps,
          scale,
          addFrame
        ]),
        180000, // 3 minutes — GPU generation
        "Pharaoh transformation timed out"
      );

      const data = result.data;

      // Gradio returns an image — could be file object with .url or base64
      let pharaohImage = null;

      if (data && Array.isArray(data) && data.length > 0) {
        const imgResult = data[0];
        if (typeof imgResult === "string") {
          pharaohImage = imgResult;
        } else if (imgResult && imgResult.url) {
          pharaohImage = imgResult.url;
        } else if (imgResult && imgResult.path) {
          pharaohImage = imgResult.path;
        }
      } else if (data && typeof data === "object" && data.url) {
        pharaohImage = data.url;
      } else if (typeof data === "string") {
        pharaohImage = data;
      }

      // Download and convert to base64 if it's a URL
      if (pharaohImage && pharaohImage.startsWith("http")) {
        pharaohImage = await downloadAsBase64(pharaohImage, "image/png");
      }

      res.json({
        pharaohImage,
        format: pharaohImage && pharaohImage.startsWith("data:") ? "base64" : "url",
      });

    } catch (error) {
      console.error("Photo-to-Pharaoh Error:", error.message);

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
      Uses Gradio space: s0ad-atef/finalseq
      Calls run_pipeline(image, language, want_3d=false)
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

      const language = req.body.language || "ar";

      const { detectedName, story, audioUrl } =
        await callFinalseq(req.file.buffer, req.file.mimetype, language, false);

      const audioDataUri = await downloadAsBase64(audioUrl, "audio/mpeg");

      res.json({
        story,
        audio: audioDataUri,
        audioUrl: audioUrl,
        detected: detectedName,
      });

    } catch (error) {
      console.error("TTS/Pipeline Error:", error.message);
      res.status(500).json({ message: `${t(req, "tts_failed")}: ${error.message}`, details: error.message });
    }
  }
);

/* ============================================================
   9. Image → 3D Model
      Uses Gradio space: s0ad-atef/finalseq
      Calls /generate_3d (Dedicated 3D API)
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

      const { Client, handle_file } = await import("@gradio/client");

      const hfSpace = process.env.FINALSEQ_HF_SPACE || "s0ad-atef/finalseq";
      const hfToken = process.env.FINALSEQ_HF_TOKEN || process.env.HF_TOKEN;

      const client = await withTimeout(
        Client.connect(hfSpace, hfToken ? { token: hfToken } : {}),
        60000,
        "Finalseq Space connection timed out"
      );

      const fileRef = handle_file(req.file.buffer);

      let glbUrl = null;
      let errorStory = "";

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await withTimeout(
            client.predict("/generate_3d", { image: fileRef }),
            300000, // 5 min
            "3D generation timed out"
          );
          
          const data = result.data;
          
          if (data && Array.isArray(data) && data.length > 0) {
            const fileObj = data[0];
            if (typeof fileObj === "string") glbUrl = fileObj;
            else if (fileObj && fileObj.url) glbUrl = fileObj.url;
            else if (fileObj && fileObj.path) glbUrl = fileObj.path;
            else glbUrl = fileObj;
          } else if (data && typeof data === "object" && data.url) {
            glbUrl = data.url;
          }

          if (glbUrl) break;
          else if (attempt < 2) console.warn("[Finalseq 3D] /generate_3d returned null, retrying...");
        } catch (e) {
          console.error(`[Finalseq 3D] Attempt ${attempt} error:`, e.message);
          errorStory = e.message;
          if (attempt === 2) throw e;
        }
      }

      if (!glbUrl) {
        return res.status(500).json({ 
          message: `فشل توليد الـ 3D من الموديل. تفاصيل الخطأ: ${errorStory || "No URL returned"}`,
          details: errorStory
        });
      }

      res.json({
        detected: "Unknown", // The dedicated 3D endpoint doesn't return the name
        model3d: glbUrl,
        model3d_url: glbUrl, // Added for frontend compatibility
        format: "glb",
        debug_story: "Generated via /generate_3d endpoint"
      });

    } catch (error) {
      console.error("Image-to-3D Error:", error.message);
      res.status(500).json({ message: t(req, "model_3d_failed"), details: error.message });
    }
  }
);

/* ============================================================
   10. Full Analysis (detect → story → audio → 3D) — ALL IN ONE
       Uses Gradio space: s0ad-atef/finalseq
       Calls run_pipeline(image, language, want_3d=true)
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

      const language = req.body.language || "ar";

      const { detectedName, confidence, story, audioUrl, glbUrl } =
        await callFinalseq(req.file.buffer, req.file.mimetype, language, true);

      const audioDataUri = await downloadAsBase64(audioUrl, "audio/mpeg");

      const artifact = await Artifact.findOne({
        name: { $regex: new RegExp(detectedName, "i") }
      });

      await Detection.create({
        user: req.user.id,
        imageName: req.file.originalname,
        detectedArtifact: detectedName,
        confidence,
        details: {
          story,
          has3dModel: !!glbUrl,
          source: "finalseq-full"
        }
      });

      res.json({
        detected: detectedName,
        confidence,
        artifact: artifact || null,
        story,
        audio: audioDataUri,
        audioUrl: audioUrl,
        model3d: glbUrl,
        model3dFormat: glbUrl ? "glb" : null,
      });

    } catch (error) {
      console.error("Full Analysis Error:", error.message);
      res.status(500).json({ message: `${t(req, "full_analysis_failed")}: ${error.message}`, details: error.message });
    }
  }
);

module.exports = router;
