const axios = require("axios");

const BASE_URL = process.env.TEST_BASE_URL || "https://gem-backend-production.up.railway.app/api";

const testApis = async () => {
    try {
        console.log("🚀 Testing GEM Backend APIs (Railway)...\\n");

        // 1. Test Home/Health
        console.log("Testing Home Route...");
        let response = await axios.get(BASE_URL.replace("/api", ""));
        console.log("✅ Home Route works! Status:", response.status);

        console.log("\\nAPI tests finished successfully.");
    } catch (error) {
        console.error("❌ Test Error:", error.response ? error.response.data : error.message);
    }
};

testApis();
