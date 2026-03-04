require("dotenv").config();
const jwt = require("jsonwebtoken");
const axios = require("axios");

// 1. Generate a mock token for an existing user (or create a simple test token if the middleware allows it)
// We need a valid MongoDB ObjectId for the user. Let's use a dummy one.
const dummyUserId = "60c72b2f9b1d8b00155b4a3a";
const token = jwt.sign({ id: dummyUserId, role: "user" }, process.env.JWT_SECRET || "gem_secret_2024", {
    expiresIn: "30d",
});

async function testApi() {
    try {
        console.log("Testing POST /api/ai/ask...");
        console.log("Using Token:", token);

        // Assumes the server is running on port 5000 locally
        const response = await axios.post(
            "http://localhost:5000/api/ai/ask",
            { question: "من هو كليوباترا؟" },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        console.log("Success Response from API:", response.data);
    } catch (error) {
        if (error.response) {
            console.error("API Error Status:", error.response.status);
            console.error("API Error Data:", error.response.data);
        } else {
            console.error("Connection Error:", error.message);
        }
    }
}

testApi();
