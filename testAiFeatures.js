require("dotenv").config();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

/* =========================
   Config
========================= */
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000/api/ai";
const dummyUserId = "60c72b2f9b1d8b00155b4a3a";
const token = jwt.sign(
    { id: dummyUserId, role: "user" },
    process.env.JWT_SECRET || "gem_secret_key",
    { expiresIn: "30d" }
);

const headers = { Authorization: `Bearer ${token}` };

/* =========================
   Test Helpers
========================= */
let passed = 0;
let failed = 0;

async function runTest(name, fn) {
    try {
        const result = await fn();
        passed++;
        console.log(`  ✅ ${name}`);
        if (result) {
            const str = JSON.stringify(result, null, 2);
            const display = str.length > 300 ? str.substring(0, 300) + "\n..." : str;
            console.log(`     →`, display.split("\n").join("\n     → "));
        }
        return result;
    } catch (error) {
        failed++;
        if (error.response) {
            console.log(`  ❌ ${name} — Status: ${error.response.status}`);
            console.log(`     →`, JSON.stringify(error.response.data).substring(0, 200));
        } else {
            console.log(`  ❌ ${name} — ${error.message}`);
        }
        return null;
    }
}

async function expectStatus(name, fn, expectedStatus) {
    try {
        const res = await fn();
        if (res.status === expectedStatus) {
            passed++;
            console.log(`  ✅ ${name} — Got expected ${expectedStatus}: ${(res.data.message || JSON.stringify(res.data)).substring(0, 100)}`);
        } else {
            failed++;
            console.log(`  ❌ ${name} — Expected ${expectedStatus}, got ${res.status}`);
        }
    } catch (error) {
        if (error.response && error.response.status === expectedStatus) {
            passed++;
            console.log(`  ✅ ${name} — Got expected ${expectedStatus}: ${(error.response.data.message || '').substring(0, 100)}`);
        } else if (error.response) {
            failed++;
            console.log(`  ❌ ${name} — Expected ${expectedStatus}, got ${error.response.status}: ${(error.response.data.message || '').substring(0, 100)}`);
        } else {
            failed++;
            console.log(`  ❌ ${name} — Connection error: ${error.message}`);
        }
    }
}

/* =========================
   ENV Validation
========================= */
function validateEnv() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  🔍 Environment Variables Check");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const envVars = {
        // Core
        "MONGO_URI": process.env.MONGO_URI,
        "JWT_SECRET": process.env.JWT_SECRET,
        // Chatbot
        "CHATBOT_HF_SPACE": process.env.CHATBOT_HF_SPACE,
        "HF_TOKEN": process.env.HF_TOKEN,
        "OPENROUTER_API_KEY": process.env.OPENROUTER_API_KEY,
        // Storyteller (Detection + TTS)
        "STORYTELLER_API_URL": process.env.STORYTELLER_API_URL,
        "STORYTELLER_HF_TOKEN": process.env.STORYTELLER_HF_TOKEN,
        "STORYTELLER_OPENROUTER_KEY": process.env.STORYTELLER_OPENROUTER_KEY,
        // Story to Image
        "STORY_IMAGE_HF_SPACE": process.env.STORY_IMAGE_HF_SPACE,
        "STORY_IMAGE_HF_TOKEN": process.env.STORY_IMAGE_HF_TOKEN,
        "STORY_IMAGE_OPENROUTER_KEY": process.env.STORY_IMAGE_OPENROUTER_KEY,
        // Cartouche
        "CARTOUCHE_HF_SPACE": process.env.CARTOUCHE_HF_SPACE,
        "CARTOUCHE_HF_TOKEN": process.env.CARTOUCHE_HF_TOKEN,
        "CARTOUCHE_OPENROUTER_KEY": process.env.CARTOUCHE_OPENROUTER_KEY,
        // Photo to Pharaoh
        "PHOTO_TO_PHARAOH_API_URL": process.env.PHOTO_TO_PHARAOH_API_URL,
        // Cloudinary
        "CLOUDINARY_CLOUD_NAME": process.env.CLOUDINARY_CLOUD_NAME,
        "CLOUDINARY_API_KEY": process.env.CLOUDINARY_API_KEY,
        // Paymob
        "PAYMOB_API_KEY": process.env.PAYMOB_API_KEY,
    };

    let allGood = true;
    for (const [key, value] of Object.entries(envVars)) {
        if (value) {
            console.log(`  ✅ ${key} = ${value.substring(0, 20)}...`);
        } else {
            console.log(`  ⚠️  ${key} = NOT SET`);
            allGood = false;
        }
    }

    console.log(allGood ? "\n  ✅ All environment variables set!\n" : "\n  ⚠️  Some variables are missing\n");
}

/* =========================
   Translation Key Validation
========================= */
function validateTranslations() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  🌍 Translation Keys Validation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const en = require("./locales/en.json");
    const ar = require("./locales/ar.json");

    const enKeys = Object.keys(en);
    const arKeys = Object.keys(ar);

    // Check en keys missing in ar
    const missingInAr = enKeys.filter(k => !arKeys.includes(k));
    // Check ar keys missing in en
    const missingInEn = arKeys.filter(k => !enKeys.includes(k));

    if (missingInAr.length > 0) {
        console.log(`  ⚠️  Keys in en.json but MISSING in ar.json:`);
        missingInAr.forEach(k => console.log(`     - ${k}`));
        failed += missingInAr.length;
    }

    if (missingInEn.length > 0) {
        console.log(`  ⚠️  Keys in ar.json but MISSING in en.json:`);
        missingInEn.forEach(k => console.log(`     - ${k}`));
        failed += missingInEn.length;
    }

    if (missingInAr.length === 0 && missingInEn.length === 0) {
        passed++;
        console.log(`  ✅ All ${enKeys.length} translation keys match between en.json and ar.json`);
    }

    // Check for empty values
    let emptyCount = 0;
    for (const key of enKeys) {
        if (!en[key] || !en[key].trim()) emptyCount++;
    }
    for (const key of arKeys) {
        if (!ar[key] || !ar[key].trim()) emptyCount++;
    }

    if (emptyCount > 0) {
        failed++;
        console.log(`  ⚠️  ${emptyCount} empty translation values found`);
    } else {
        passed++;
        console.log(`  ✅ No empty translation values`);
    }

    // Check that t() keys used in code exist in translation files
    const routeFiles = fs.readdirSync(path.join(__dirname, "routes"));
    const usedKeys = new Set();

    for (const file of routeFiles) {
        const content = fs.readFileSync(path.join(__dirname, "routes", file), "utf-8");
        const matches = content.matchAll(/t\(req,\s*"([^"]+)"/g);
        for (const match of matches) {
            usedKeys.add(match[1]);
        }
    }

    // Also check services
    if (fs.existsSync(path.join(__dirname, "services"))) {
        const serviceFiles = fs.readdirSync(path.join(__dirname, "services"));
        for (const file of serviceFiles) {
            const content = fs.readFileSync(path.join(__dirname, "services", file), "utf-8");
            const matches = content.matchAll(/t\(req,\s*"([^"]+)"/g);
            for (const match of matches) {
                usedKeys.add(match[1]);
            }
        }
    }

    const missingTranslations = [...usedKeys].filter(k => !enKeys.includes(k));
    if (missingTranslations.length > 0) {
        failed++;
        console.log(`  ❌ Translation keys used in code but MISSING from locale files:`);
        missingTranslations.forEach(k => console.log(`     - "${k}"`));
    } else {
        passed++;
        console.log(`  ✅ All ${usedKeys.size} keys used in code exist in locale files`);
    }

    console.log();
}

/* =========================
   API Tests
========================= */
async function testApiEndpoints() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  🧪 API Endpoint Tests");
    console.log(`  Base URL: ${BASE_URL}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Check server is running
    try {
        await axios.get(BASE_URL.replace("/api/ai", "/"), { timeout: 5000 });
        console.log("  ✅ Server is running\n");
        passed++;
    } catch (e) {
        console.log("  ❌ Server is NOT running at " + BASE_URL.replace("/api/ai", "/"));
        console.log("     Start it with: node server.js\n");
        failed++;
        return;
    }

    const testImageBuffer = Buffer.from("fake-image-data-for-testing");

    // ─── 1. Authentication ───
    console.log("  ── 1. Authentication ──\n");

    await expectStatus(
        "Request without auth token → 401",
        () => axios.post(`${BASE_URL}/detect`, {}),
        401
    );

    // ─── 2. Detection (/detect) ───
    console.log("\n  ── 2. Detection (Storyteller /detect) ──\n");

    await expectStatus(
        "Detect without image → 400",
        () => axios.post(`${BASE_URL}/detect`, {}, { headers }),
        400
    );

    // With image — expects connection to HF space
    const detectForm = new FormData();
    detectForm.append("image", testImageBuffer, { filename: "test.jpg", contentType: "image/jpeg" });

    console.log("     Testing real HF detection API (may take ~30s)...");
    await runTest(
        "Detect with image (HuggingFace storyteller)",
        async () => {
            const res = await axios.post(`${BASE_URL}/detect`, detectForm, {
                headers: { ...headers, ...detectForm.getHeaders() },
                timeout: 90000
            });
            return {
                detected: res.data.detected,
                confidence: res.data.confidence,
                hasRawResult: !!res.data.rawResult
            };
        }
    );

    // ─── 3. Story to Image ───
    console.log("\n  ── 3. Story → Image (Gradio pharaonic-ai-generator) ──\n");

    await expectStatus(
        "Story-to-Image without story → 400",
        () => axios.post(`${BASE_URL}/story-to-image`, {}, { headers }),
        400
    );

    await expectStatus(
        "Story-to-Image empty story → 400",
        () => axios.post(`${BASE_URL}/story-to-image`, { story: "" }, { headers }),
        400
    );

    await expectStatus(
        "Story-to-Image whitespace only → 400",
        () => axios.post(`${BASE_URL}/story-to-image`, { story: "   " }, { headers }),
        400
    );

    // Real test (skip if you want fast tests — this takes 2-3 minutes)
    if (process.env.TEST_REAL_AI === "true") {
        console.log("     Testing real story-to-image (may take 2-3 min)...");
        await runTest(
            "Story-to-Image real test",
            async () => {
                const res = await axios.post(
                    `${BASE_URL}/story-to-image`,
                    { story: "An ancient pharaoh walking near the pyramids at sunset" },
                    { headers, timeout: 200000 }
                );
                return { hasImage: !!res.data.image, format: res.data.format };
            }
        );
    } else {
        console.log("     ⏭️  Skipping real story-to-image test (set TEST_REAL_AI=true to enable)\n");
    }

    // ─── 4. Name → Cartouche ───
    console.log("  ── 4. Name → Cartouche ──\n");

    await expectStatus(
        "Cartouche without name → 400",
        () => axios.post(`${BASE_URL}/name-to-cartouche`, {}, { headers }),
        400
    );

    await expectStatus(
        "Cartouche empty name → 400",
        () => axios.post(`${BASE_URL}/name-to-cartouche`, { name: "" }, { headers }),
        400
    );

    // Real test
    console.log("     Testing real cartouche API (may take ~30s)...");
    await runTest(
        "Cartouche with name 'Ahmed'",
        async () => {
            const res = await axios.post(
                `${BASE_URL}/name-to-cartouche`,
                { name: "Ahmed" },
                { headers, timeout: 60000 }
            );
            return { name: res.data.name, hasCartouche: !!res.data.cartouche };
        }
    );

    // ─── 5. Photo → Pharaoh ───
    console.log("\n  ── 5. Photo → Pharaoh ──\n");

    await expectStatus(
        "Pharaoh without image → 400",
        () => axios.post(`${BASE_URL}/photo-to-pharaoh`, {}, { headers }),
        400
    );

    // ─── 6. Text-to-Speech (Storyteller /full_pipeline) ───
    console.log("\n  ── 6. Text-to-Speech (Storyteller /full_pipeline) ──\n");

    await expectStatus(
        "TTS without image → 400",
        () => axios.post(`${BASE_URL}/text-to-speech`, {}, { headers }),
        400
    );

    // With image — real test
    const ttsForm = new FormData();
    ttsForm.append("image", testImageBuffer, { filename: "test.jpg", contentType: "image/jpeg" });
    ttsForm.append("language", "ar");

    console.log("     Testing real TTS pipeline (may take ~60s)...");
    await runTest(
        "TTS with image + language 'ar'",
        async () => {
            const res = await axios.post(`${BASE_URL}/text-to-speech`, ttsForm, {
                headers: { ...headers, ...ttsForm.getHeaders() },
                timeout: 150000
            });
            return {
                hasStory: !!res.data.story,
                hasAudio: !!res.data.audioBase64,
                detected: res.data.detected
            };
        }
    );

    // ─── 7. Image → 3D (Placeholder) ───
    console.log("\n  ── 7. Image → 3D (Placeholder) ──\n");

    const form3d = new FormData();
    form3d.append("image", testImageBuffer, { filename: "test.jpg", contentType: "image/jpeg" });

    await expectStatus(
        "3D model placeholder → 202",
        () => axios.post(`${BASE_URL}/image-to-3d`, form3d, {
            headers: { ...headers, ...form3d.getHeaders() }
        }),
        202
    );

    // ─── 8. History Endpoints ───
    console.log("\n  ── 8. History Endpoints ──\n");

    await runTest(
        "Get detection history",
        async () => {
            const res = await axios.get(`${BASE_URL}/detections`, { headers });
            return { count: res.data.length, status: res.status };
        }
    );

    await runTest(
        "Get chat history",
        async () => {
            const res = await axios.get(`${BASE_URL}/chats`, { headers });
            return { count: res.data.length, status: res.status };
        }
    );

    // ─── 9. Language Header Tests ───
    console.log("\n  ── 9. Language / i18n ──\n");

    // Test Arabic response
    await runTest(
        "Arabic error message (Accept-Language: ar)",
        async () => {
            try {
                await axios.post(`${BASE_URL}/detect`, {}, {
                    headers: { ...headers, "Accept-Language": "ar" }
                });
            } catch (e) {
                return { message: e.response.data.message, isArabic: /[\u0600-\u06FF]/.test(e.response.data.message) };
            }
        }
    );

    // Test English response
    await runTest(
        "English error message (Accept-Language: en)",
        async () => {
            try {
                await axios.post(`${BASE_URL}/detect`, {}, {
                    headers: { ...headers, "Accept-Language": "en" }
                });
            } catch (e) {
                return { message: e.response.data.message, isEnglish: /[a-zA-Z]/.test(e.response.data.message) };
            }
        }
    );
}

/* =========================
   Main
========================= */
async function main() {
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║   GEM Backend — Full Test Suite           ║");
    console.log("╚══════════════════════════════════════════╝\n");

    // Phase 1: ENV check
    validateEnv();

    // Phase 2: Translation validation
    validateTranslations();

    // Phase 3: API tests
    await testApiEndpoints();

    // Summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  📊 Test Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📝 Total:  ${passed + failed}`);
    console.log(`\n  ${failed === 0 ? "🎉 All tests passed!" : "⚠️  Some tests failed — check above for details"}`);
    console.log();
}

main();
