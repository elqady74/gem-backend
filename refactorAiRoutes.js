const fs = require('fs');

const filePath = 'C:\\Users\\mosta\\Desktop\\gem-backend\\routes\\ai.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace Story to Image
const storyToImageOld = `/* ============================================================
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
});`;

const storyToImageNew = `/* ============================================================
   5. Story → Image
      Uses HuggingFace FastAPI space: ahmedelqady88/Egyptian-Art-API
      Endpoint: /ai/generate
============================================================ */
router.post("/story-to-image", authMiddleware, async (req, res) => {
  try {
    const { story } = req.body;

    if (!story || !story.trim()) {
      return res.status(400).json({ message: t(req, "story_required") });
    }

    const apiUrl = process.env.STORY_IMAGE_API_URL || "https://ahmedelqady88-egyptian-art-api.hf.space/ai/generate";

    const response = await axios.post(apiUrl, {
      prompt: story,
      steps: 30,
      guidance_scale: 7.5
    }, {
      timeout: 180000, // 3 minutes
      responseType: "arraybuffer"
    });

    const contentType = response.headers["content-type"];
    let imageOutput = null;

    if (contentType && contentType.includes("image")) {
      const base64Image = Buffer.from(response.data).toString("base64");
      const mimeType = contentType.split(";")[0];
      imageOutput = \`data:\${mimeType};base64,\${base64Image}\`;
    } else {
      const dataStr = Buffer.from(response.data).toString("utf-8");
      try {
        const result = JSON.parse(dataStr);
        imageOutput = result.image || result.url || result.result || null;
      } catch (e) {
        // Not JSON
        imageOutput = null;
      }
    }

    res.json({
      image: imageOutput,
      format: "base64",
      rawResult: null
    });

  } catch (error) {
    console.error("Story-to-Image Error:", error.message);
    res.status(500).json({ message: t(req, "image_generation_failed"), details: error.message });
  }
});`;

content = content.replace(storyToImageOld, storyToImageNew);

// Replace Photo to Pharaoh
const pharaohOld = `/* ============================================================
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
        \`\${apiUrl}/transform\`,
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
          pharaohImage: \`data:\${mimeType};base64,\${base64Image}\`,
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
);`;

const pharaohNew = `/* ============================================================
   7. Photo → Pharaoh / Queen
      Sends user photo to HuggingFace FastAPI space: ahmedelqady88/pharaoh-ai-api
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

      const apiUrl = process.env.PHOTO_TO_PHARAOH_API_URL || "https://ahmedelqady88-pharaoh-ai-api.hf.space/api/ai/transform";

      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      form.append("character", "pharaoh");
      form.append("num_steps", "40");
      form.append("scale", "0.8");

      const apiResponse = await axios.post(
        apiUrl,
        form,
        {
          headers: {
            ...form.getHeaders()
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
          pharaohImage: \`data:\${mimeType};base64,\${base64Image}\`,
          format: "base64"
        });
      }

      let result;
      try {
        result = typeof apiResponse.data === "string"
          ? JSON.parse(apiResponse.data)
          : JSON.parse(Buffer.from(apiResponse.data).toString("utf-8"));
      } catch (e) {
        result = {};
      }

      res.json({
        pharaohImage: result.image || result.url || result.result || null,
        format: result.format || "url",
        rawResult: result
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
);`;

content = content.replace(pharaohOld, pharaohNew);

// Replace Detect and related endpoints
const detectOld = `/* ============================================================
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
      // data[0] = markdown string: "### artifact_name\\n\\n**Confidence:** 95.3%\\n\\nstory..."
      // data[1] = audio file object
      // data[2] = button state (ignored)

      const markdownText = data[0] || "";

      // Parse markdown to extract detection info
      const nameMatch = markdownText.match(/^###\\s*(.+)$/m);
      const confMatch = markdownText.match(/\\*\\*Confidence:\\*\\*\\s*([\\d.]+)%/);
      const detectedName = nameMatch ? nameMatch[1].trim() : "Unknown";
      const confidence = confMatch ? parseFloat(confMatch[1]) / 100 : null;

      // Extract story text (everything after the confidence line)
      const storyMatch = markdownText.split(/\\*\\*Confidence:\\*\\*.*\\n\\n?/);
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
);`;

const detectNew = `/* ============================================================
   3. Artifact Detection (camera / upload)
      Uses HuggingFace FastAPI space: ahmedelqady88/egyptian-museum-api
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

      const apiUrl = process.env.ARTIFACT_LENS_API_URL || "https://ahmedelqady88-egyptian-museum-api.hf.space/ai/detect";
      const language = req.body.language || "ar";

      const form = new FormData();
      form.append("image", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      form.append("language", language);
      form.append("with_3d", "false");

      const apiResponse = await axios.post(
        apiUrl,
        form,
        {
          headers: {
            ...form.getHeaders()
          },
          timeout: 120000
        }
      );

      const data = apiResponse.data;
      const detectedName = data.name || data.detected || "Unknown";
      const confidence = data.confidence || null;
      const storyText = data.story || data.description || "";
      const audioBase64 = data.audio_base64 || null;
      const audioUrl = data.audio_url || null;

      const artifact = await Artifact.findOne({
        name: { $regex: new RegExp(detectedName, "i") }
      });

      await Detection.create({
        user: req.user.id,
        imageName: req.file.originalname,
        detectedArtifact: detectedName,
        confidence,
        details: { story: storyText, source: "egyptian-museum-api" }
      });

      res.json({
        detected: detectedName,
        confidence,
        artifact: artifact || null,
        story: storyText,
        audioBase64,
        audioUrl,
        rawResult: data
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
);`;

content = content.replace(detectOld, detectNew);

// Now replacing /text-to-speech, /image-to-3d, and /full-analysis with similar logic calling museum API
const combinedNewRoutes = `/* ============================================================
   8. Text-to-Speech
      Uses HuggingFace FastAPI space: ahmedelqady88/egyptian-museum-api
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

      const apiUrl = process.env.ARTIFACT_LENS_API_URL || "https://ahmedelqady88-egyptian-museum-api.hf.space/ai/detect";
      const language = req.body.language || "ar";

      const form = new FormData();
      form.append("image", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      form.append("language", language);
      form.append("with_3d", "false");

      const apiResponse = await axios.post(apiUrl, form, {
        headers: { ...form.getHeaders() },
        timeout: 120000
      });

      const data = apiResponse.data;
      
      res.json({
        story: data.story || data.description || "",
        audioBase64: data.audio_base64 || null,
        audioUrl: data.audio_url || null,
        detected: data.name || data.detected || "Unknown",
        rawResult: data
      });

    } catch (error) {
      console.error("TTS/Pipeline Error:", error.message);
      res.status(500).json({ message: t(req, "tts_failed"), details: error.message });
    }
  }
);

/* ============================================================
   9. Image → 3D Model
      Uses HuggingFace FastAPI space: ahmedelqady88/egyptian-museum-api
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

      const apiUrl = process.env.ARTIFACT_LENS_API_URL || "https://ahmedelqady88-egyptian-museum-api.hf.space/ai/detect";
      const language = req.body.language || "en";

      const form = new FormData();
      form.append("image", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      form.append("language", language);
      form.append("with_3d", "true");

      const apiResponse = await axios.post(apiUrl, form, {
        headers: { ...form.getHeaders() },
        timeout: 300000 // 5 minutes for 3D
      });

      const data = apiResponse.data;

      res.json({
        detected: data.name || data.detected || "Unknown",
        model3d: data.model_3d_url || data.model3d_url || null,
        format: "glb",
        rawResult: data
      });

    } catch (error) {
      console.error("Image-to-3D Error:", error.message);
      res.status(500).json({ message: t(req, "model_3d_failed"), details: error.message });
    }
  }
);

/* ============================================================
   10. Full Analysis (detect → story → audio → 3D) — ALL IN ONE
       Uses HuggingFace FastAPI space: ahmedelqady88/egyptian-museum-api
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

      const apiUrl = process.env.ARTIFACT_LENS_API_URL || "https://ahmedelqady88-egyptian-museum-api.hf.space/ai/detect";
      const language = req.body.language || "ar";

      const form = new FormData();
      form.append("image", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      form.append("language", language);
      form.append("with_3d", "true");

      const apiResponse = await axios.post(apiUrl, form, {
        headers: { ...form.getHeaders() },
        timeout: 300000 // 5 minutes
      });

      const data = apiResponse.data;
      const detectedName = data.name || data.detected || "Unknown";
      const confidence = data.confidence || null;
      const storyText = data.story || data.description || "";
      const model3dUrl = data.model_3d_url || data.model3d_url || null;

      const artifact = await Artifact.findOne({
        name: { $regex: new RegExp(detectedName, "i") }
      });

      await Detection.create({
        user: req.user.id,
        imageName: req.file.originalname,
        detectedArtifact: detectedName,
        confidence,
        details: {
          story: storyText,
          has3dModel: !!model3dUrl,
          source: "egyptian-museum-api-full"
        }
      });

      res.json({
        detected: detectedName,
        confidence,
        artifact: artifact || null,
        story: storyText,
        audioBase64: data.audio_base64 || null,
        audioUrl: data.audio_url || null,
        model3d: model3dUrl,
        model3dFormat: model3dUrl ? "glb" : null,
        rawResult: data
      });

    } catch (error) {
      console.error("Full Analysis Error:", error.message);
      res.status(500).json({ message: t(req, "full_analysis_failed"), details: error.message });
    }
  }
);

module.exports = router;
`;

const startIndex = content.indexOf('/* ============================================================\\n   8. Text-to-Speech');
const startIndexFallback = content.indexOf('/* ============================================================\\r\\n   8. Text-to-Speech');

let idx = startIndex !== -1 ? startIndex : startIndexFallback;
if (idx === -1) {
  // Try finding just '8. Text-to-Speech'
  idx = content.indexOf('8. Text-to-Speech');
  // Backtrack to '/*'
  if (idx !== -1) {
    idx = content.lastIndexOf('/* ', idx);
  }
}

if (idx !== -1) {
  content = content.substring(0, idx) + combinedNewRoutes;
} else {
  console.log("Could not find Text-to-Speech block to replace!");
}

fs.writeFileSync(filePath, content);
console.log("Successfully refactored ai.js routes.");
