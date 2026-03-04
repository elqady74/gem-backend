require("dotenv").config();
const { generateAIResponse } = require("./services/aiService");

async function test() {
    try {
        console.log("Testing AI Service with new key...");
        const response = await generateAIResponse("من هو رمسيس الثاني؟");
        console.log("Model response:", response);
    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

test();
