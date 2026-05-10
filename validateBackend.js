// Quick validation script — does NOT need the server running
require("dotenv").config();
const fs = require("fs");
const path = require("path");

let passed = 0;
let failed = 0;

console.log("\n╔══════════════════════════════════════════╗");
console.log("║   GEM Backend — Offline Validation        ║");
console.log("╚══════════════════════════════════════════╝\n");

/* ═══ 1. ENV Variables ═══ */
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  🔍 Environment Variables");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const envGroups = {
    "Core": ["MONGO_URI", "JWT_SECRET", "PORT"],
    "Chatbot": ["CHATBOT_HF_SPACE", "HF_TOKEN", "OPENROUTER_API_KEY"],
    "Storyteller (Detection + TTS)": ["STORYTELLER_API_URL", "STORYTELLER_HF_TOKEN", "STORYTELLER_OPENROUTER_KEY"],
    "Story to Image": ["STORY_IMAGE_HF_SPACE", "STORY_IMAGE_HF_TOKEN", "STORY_IMAGE_OPENROUTER_KEY"],
    "Cartouche": ["CARTOUCHE_HF_SPACE", "CARTOUCHE_HF_TOKEN", "CARTOUCHE_OPENROUTER_KEY"],
    "Photo to Pharaoh": ["PHOTO_TO_PHARAOH_API_URL"],
    "Cloudinary": ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    "Paymob": ["PAYMOB_API_KEY", "PAYMOB_SECRET_KEY", "PAYMOB_PUBLIC_KEY"],
};

// Check for OLD env vars that should no longer exist
const deprecatedVars = ["DETECTION_API_URL", "STORY_TO_IMAGE_API_URL", "TTS_HF_SPACE", "TTS_HF_TOKEN", "TTS_OPENROUTER_KEY"];

for (const [group, vars] of Object.entries(envGroups)) {
    console.log(`  📁 ${group}`);
    for (const v of vars) {
        if (process.env[v]) {
            passed++;
            const val = process.env[v];
            console.log(`     ✅ ${v} = ${val.substring(0, 30)}${val.length > 30 ? '...' : ''}`);
        } else {
            failed++;
            console.log(`     ❌ ${v} = NOT SET`);
        }
    }
    console.log();
}

// Check deprecated
console.log("  📁 Deprecated (should NOT exist)");
for (const v of deprecatedVars) {
    if (process.env[v]) {
        console.log(`     ⚠️  ${v} is still set — should be removed`);
    } else {
        passed++;
        console.log(`     ✅ ${v} correctly removed`);
    }
}
console.log();

/* ═══ 2. Translation Validation ═══ */
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  🌍 Translation Keys Validation");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const en = require("./locales/en.json");
const ar = require("./locales/ar.json");
const enKeys = Object.keys(en);
const arKeys = Object.keys(ar);

// Symmetry check
const missingInAr = enKeys.filter(k => !arKeys.includes(k));
const missingInEn = arKeys.filter(k => !enKeys.includes(k));

if (missingInAr.length > 0) {
    failed++;
    console.log("  ❌ Keys in en.json but MISSING in ar.json:");
    missingInAr.forEach(k => console.log(`     - ${k}`));
} else {
    passed++;
    console.log(`  ✅ All ${enKeys.length} EN keys exist in AR`);
}

if (missingInEn.length > 0) {
    failed++;
    console.log("  ❌ Keys in ar.json but MISSING in en.json:");
    missingInEn.forEach(k => console.log(`     - ${k}`));
} else {
    passed++;
    console.log(`  ✅ All ${arKeys.length} AR keys exist in EN`);
}

// Empty value check
let emptyKeys = [];
for (const k of enKeys) {
    if (!en[k] || !en[k].trim()) emptyKeys.push(`en:${k}`);
}
for (const k of arKeys) {
    if (!ar[k] || !ar[k].trim()) emptyKeys.push(`ar:${k}`);
}
if (emptyKeys.length > 0) {
    failed++;
    console.log(`  ❌ Empty translation values: ${emptyKeys.join(", ")}`);
} else {
    passed++;
    console.log("  ✅ No empty translation values");
}

// Code usage check — scan all route files for t(req, "key") and verify keys exist
const usedKeys = new Set();
const dirs = ["routes", "services", "middleware"];
for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
        if (!file.endsWith(".js")) continue;
        const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
        for (const match of content.matchAll(/t\(req,\s*"([^"]+)"/g)) {
            usedKeys.add(match[1]);
        }
    }
}

const missingFromLocales = [...usedKeys].filter(k => !enKeys.includes(k));
if (missingFromLocales.length > 0) {
    failed++;
    console.log(`  ❌ Keys used in code but MISSING from locale files:`);
    missingFromLocales.forEach(k => console.log(`     - "${k}"`));
} else {
    passed++;
    console.log(`  ✅ All ${usedKeys.size} keys used in code exist in locale files`);
}

// Unused keys check
const unusedKeys = enKeys.filter(k => !usedKeys.has(k));
if (unusedKeys.length > 0) {
    console.log(`  ℹ️  ${unusedKeys.length} locale keys not directly used in code (may be used dynamically):`);
    unusedKeys.forEach(k => console.log(`     - "${k}"`));
} else {
    console.log("  ✅ All locale keys are used in code");
}

console.log();

/* ═══ 3. Route File Syntax Check ═══ */
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  📄 Route Files Validation");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const routeFiles = fs.readdirSync(path.join(__dirname, "routes")).filter(f => f.endsWith(".js"));

for (const file of routeFiles) {
    try {
        require(`./routes/${file}`);
        passed++;
        console.log(`  ✅ routes/${file} — loads successfully`);
    } catch (e) {
        failed++;
        console.log(`  ❌ routes/${file} — ${e.message}`);
    }
}

// Check ai.js specific endpoints
const aiContent = fs.readFileSync(path.join(__dirname, "routes", "ai.js"), "utf-8");
const expectedEndpoints = ["/ask", "/chats", "/detect", "/detections", "/story-to-image", "/name-to-cartouche", "/photo-to-pharaoh", "/text-to-speech", "/image-to-3d"];

console.log();
for (const ep of expectedEndpoints) {
    if (aiContent.includes(`"${ep}"`)) {
        passed++;
        console.log(`  ✅ Endpoint ${ep} — defined in ai.js`);
    } else {
        failed++;
        console.log(`  ❌ Endpoint ${ep} — NOT FOUND in ai.js`);
    }
}

// Check ai.js uses correct env vars (not old ones)
console.log();
const oldPatterns = [
    { pattern: "DETECTION_API_URL", desc: "Old detection URL" },
    { pattern: "STORY_TO_IMAGE_API_URL", desc: "Old story-to-image URL" },
    { pattern: "TTS_HF_SPACE", desc: "Old TTS space" },
    { pattern: "TTS_HF_TOKEN", desc: "Old TTS token" },
    { pattern: "TTS_OPENROUTER_KEY", desc: "Old TTS openrouter key" },
];

for (const { pattern, desc } of oldPatterns) {
    if (aiContent.includes(`process.env.${pattern}`)) {
        failed++;
        console.log(`  ❌ ai.js still references deprecated ${pattern} (${desc})`);
    } else {
        passed++;
        console.log(`  ✅ ai.js does NOT reference deprecated ${pattern}`);
    }
}

// Check new env vars are used
const newPatterns = [
    { pattern: "STORYTELLER_API_URL", desc: "Storyteller API URL" },
    { pattern: "STORYTELLER_HF_TOKEN", desc: "Storyteller HF token" },
    { pattern: "STORY_IMAGE_HF_SPACE", desc: "Story image HF space" },
    { pattern: "STORY_IMAGE_HF_TOKEN", desc: "Story image HF token" },
];

console.log();
for (const { pattern, desc } of newPatterns) {
    if (aiContent.includes(`process.env.${pattern}`)) {
        passed++;
        console.log(`  ✅ ai.js uses new ${pattern} (${desc})`);
    } else {
        failed++;
        console.log(`  ❌ ai.js does NOT use new ${pattern} (${desc})`);
    }
}

console.log();

/* ═══ 4. Model Files Check ═══ */
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  📦 Models & Middleware");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const modelFiles = fs.readdirSync(path.join(__dirname, "models")).filter(f => f.endsWith(".js"));
for (const file of modelFiles) {
    try {
        require(`./models/${file}`);
        passed++;
        console.log(`  ✅ models/${file}`);
    } catch (e) {
        failed++;
        console.log(`  ❌ models/${file} — ${e.message}`);
    }
}

const mwFiles = fs.readdirSync(path.join(__dirname, "middleware")).filter(f => f.endsWith(".js"));
for (const file of mwFiles) {
    try {
        require(`./middleware/${file}`);
        passed++;
        console.log(`  ✅ middleware/${file}`);
    } catch (e) {
        failed++;
        console.log(`  ❌ middleware/${file} — ${e.message}`);
    }
}

console.log();

/* ═══ Summary ═══ */
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  📊 Validation Summary");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📝 Total:  ${passed + failed}`);
console.log(`\n  ${failed === 0 ? "🎉 All validations passed!" : "⚠️  Some validations failed — check above"}\n`);
