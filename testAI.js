const axios = require('axios');
const FormData = require('form-data');

// 1x1 transparent PNG
const pixelBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const pixelBuffer = Buffer.from(pixelBase64, 'base64');

async function testAI() {
  console.log("=== Testing AI Models ===");

  // 1. Egyptian Art API (story to image)
  console.log("\n1. Testing Egyptian-Art-API (/ai/generate)...");
  try {
    const artRes = await axios.post("https://ahmedelqady88-egyptian-art-api.hf.space/ai/generate", {
      prompt: "A magical glowing scarab beetle in a dark temple",
      steps: 10, // low steps for fast generation
      guidance_scale: 7.5
    }, { timeout: 60000, responseType: "arraybuffer" });
    
    console.log("-> Success! Received", artRes.data.length, "bytes.");
    console.log("-> Content-Type:", artRes.headers["content-type"]);
  } catch(e) {
    console.error("-> Failed:", e.message);
  }

  // 2. Pharaoh Face Swap API (photo to pharaoh)
  console.log("\n2. Testing Pharaoh-AI-API (/api/ai/transform)...");
  try {
    const form = new FormData();
    form.append("file", pixelBuffer, { filename: "test.png", contentType: "image/png" });
    form.append("character", "pharaoh");
    form.append("num_steps", "10"); // fast
    form.append("scale", "0.8");

    const pharaohRes = await axios.post("https://ahmedelqady88-pharaoh-ai-api.hf.space/api/ai/transform", form, {
      headers: form.getHeaders(),
      timeout: 60000,
      responseType: "arraybuffer"
    });
    console.log("-> Success! Received", pharaohRes.data.length, "bytes.");
    console.log("-> Content-Type:", pharaohRes.headers["content-type"]);
  } catch(e) {
    console.error("-> Failed:", e.message);
  }

  // 3. Egyptian Museum API (detection + story + audio + 3d)
  console.log("\n3. Testing Egyptian-Museum-API (/ai/detect)...");
  try {
    const form2 = new FormData();
    form2.append("image", pixelBuffer, { filename: "test.png", contentType: "image/png" });
    form2.append("language", "en");
    form2.append("with_3d", "false"); // no 3D to keep it fast

    const detectRes = await axios.post("https://ahmedelqady88-egyptian-museum-api.hf.space/ai/detect", form2, {
      headers: form2.getHeaders(),
      timeout: 60000
    });
    
    const data = detectRes.data;
    console.log("-> Success! Response JSON keys:", Object.keys(data));
    console.log("-> Detected Name:", data.name || data.detected || "None");
    console.log("-> Story Preview:", (data.story || data.description || "").substring(0, 50) + "...");
    console.log("-> Audio generated?", !!data.audio_base64 || !!data.audio_url);
  } catch(e) {
    console.error("-> Failed:", e.message);
  }

  console.log("\n=== Testing Complete ===");
}

testAI();
