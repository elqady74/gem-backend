require("dotenv").config();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

/* =========================
   Config
========================= */
const BASE_URL = "http://localhost:5000/api/ai";
const dummyUserId = "60c72b2f9b1d8b00155b4a3a";
const token = jwt.sign(
    { id: dummyUserId, role: "user" },
    process.env.JWT_SECRET || "gem_secret_key",
    { expiresIn: "30d" }
);

const headers = { Authorization: `Bearer ${token}` };

/* =========================
   Test Runner
========================= */
async function runTest(name, fn) {
    try {
        const result = await fn();
        console.log(`✅ ${name}`);
        if (result) {
            const str = JSON.stringify(result, null, 2);
            // Truncate long output
            const display = str.length > 300 ? str.substring(0, 300) + "\n..." : str;
            console.log(`   →`, display.split("\n").join("\n   → "));
        }
        return result;
    } catch (error) {
        if (error.response) {
            console.log(`❌ ${name} — Status: ${error.response.status}`);
            console.log(`   →`, JSON.stringify(error.response.data));
        } else {
            console.log(`❌ ${name} — ${error.message}`);
        }
        return null;
    }
}

async function expectStatus(name, fn, expectedStatus) {
    try {
        const res = await fn();
        if (res.status === expectedStatus) {
            console.log(`✅ ${name} — Got expected ${expectedStatus}: ${res.data.message || JSON.stringify(res.data)}`);
        } else {
            console.log(`❌ ${name} — Expected ${expectedStatus}, got ${res.status}`);
        }
    } catch (error) {
        if (error.response && error.response.status === expectedStatus) {
            console.log(`✅ ${name} — Got expected ${expectedStatus}: ${error.response.data.message}`);
        } else if (error.response) {
            console.log(`❌ ${name} — Expected ${expectedStatus}, got ${error.response.status}: ${error.response.data.message}`);
        } else {
            console.log(`❌ ${name} — Connection error: ${error.message}`);
        }
    }
}

/* =========================
   Tests
========================= */
async function testAll() {
    console.log("\n====================================");
    console.log("  AI Features API Tests");
    console.log("====================================\n");

    // --- 1. Detection ---
    console.log("--- 1. Detection ---\n");

    await expectStatus(
        "Detect without image",
        () => axios.post(`${BASE_URL}/detect`, {}, { headers }),
        400
    );

    await expectStatus(
        "Detect without auth",
        () => axios.post(`${BASE_URL}/detect`, {}),
        401
    );

    // Detection with image (will return 503 if API URL not set)
    const testImageBuffer = Buffer.from("fake-image-data-for-testing");
    const detectForm = new FormData();
    detectForm.append("image", testImageBuffer, { filename: "test.jpg", contentType: "image/jpeg" });

    await expectStatus(
        "Detect with image (expect 503 — API not configured)",
        () => axios.post(`${BASE_URL}/detect`, detectForm, {
            headers: { ...headers, ...detectForm.getHeaders() }
        }),
        503
    );

    // --- 2. Story to Image ---
    console.log("\n--- 2. Story → Image ---\n");

    await expectStatus(
        "Story-to-Image without story text",
        () => axios.post(`${BASE_URL}/story-to-image`, {}, { headers }),
        400
    );

    await expectStatus(
        "Story-to-Image with empty story",
        () => axios.post(`${BASE_URL}/story-to-image`, { story: "" }, { headers }),
        400
    );

    await expectStatus(
        "Story-to-Image (expect 503 — API not configured)",
        () => axios.post(`${BASE_URL}/story-to-image`, { story: "A pharaoh walking in the desert" }, { headers }),
        503
    );

    // --- 3. Name to Cartouche ---
    console.log("\n--- 3. Name → Cartouche ---\n");

    await expectStatus(
        "Cartouche without name",
        () => axios.post(`${BASE_URL}/name-to-cartouche`, {}, { headers }),
        400
    );

    await expectStatus(
        "Cartouche with empty name",
        () => axios.post(`${BASE_URL}/name-to-cartouche`, { name: "" }, { headers }),
        400
    );

    // Real test with HuggingFace (this should work!)
    console.log("\n   Testing HuggingFace cartouche API (may take ~30s)...");
    await runTest(
        "Cartouche with real name 'Ahmed'",
        async () => {
            const res = await axios.post(
                `${BASE_URL}/name-to-cartouche`,
                { name: "Ahmed" },
                { headers, timeout: 60000 }
            );
            return { name: res.data.name, hasCartouche: !!res.data.cartouche };
        }
    );

    // --- 4. Photo to Pharaoh ---
    console.log("\n--- 4. Photo → Pharaoh ---\n");

    await expectStatus(
        "Pharaoh without image",
        () => axios.post(`${BASE_URL}/photo-to-pharaoh`, {}, { headers }),
        400
    );

    const pharaohForm = new FormData();
    pharaohForm.append("image", testImageBuffer, { filename: "test.jpg", contentType: "image/jpeg" });

    await expectStatus(
        "Pharaoh with image (expect 503 — API not configured)",
        () => axios.post(`${BASE_URL}/photo-to-pharaoh`, pharaohForm, {
            headers: { ...headers, ...pharaohForm.getHeaders() }
        }),
        503
    );

    // --- 5. TTS Placeholder ---
    console.log("\n--- 5. Text-to-Speech (Placeholder) ---\n");

    await expectStatus(
        "TTS without text",
        () => axios.post(`${BASE_URL}/text-to-speech`, {}, { headers }),
        400
    );

    await expectStatus(
        "TTS placeholder response",
        () => axios.post(`${BASE_URL}/text-to-speech`, { text: "Hello World" }, { headers }),
        202
    );

    // --- 6. 3D Model Placeholder ---
    console.log("\n--- 6. Image → 3D (Placeholder) ---\n");

    const form3d = new FormData();
    form3d.append("image", testImageBuffer, { filename: "test.jpg", contentType: "image/jpeg" });

    await expectStatus(
        "3D model placeholder response",
        () => axios.post(`${BASE_URL}/image-to-3d`, form3d, {
            headers: { ...headers, ...form3d.getHeaders() }
        }),
        202
    );

    // --- 7. History endpoints ---
    console.log("\n--- 7. History Endpoints ---\n");

    await runTest(
        "Get detection history",
        async () => {
            const res = await axios.get(`${BASE_URL}/detections`, { headers });
            return { count: res.data.length };
        }
    );

    await runTest(
        "Get chat history",
        async () => {
            const res = await axios.get(`${BASE_URL}/chats`, { headers });
            return { count: res.data.length };
        }
    );

    console.log("\n====================================");
    console.log("  Tests Complete!");
    console.log("====================================\n");
}

testAll();
