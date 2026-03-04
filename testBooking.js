require("dotenv").config();
const axios = require("axios");
const jwt = require("jsonwebtoken");

const dummyUserId = "60c72b2f9b1d8b00155b4a3a";
const token = jwt.sign({ id: dummyUserId, role: "user" }, process.env.JWT_SECRET || "gem_secret_2024", {
    expiresIn: "30d",
});

async function testApi() {
    try {
        console.log("Testing POST /api/bookings/checkout...");

        const response = await axios.post(
            "http://localhost:5000/api/bookings/checkout",
            {
                visitDate: "2026-06-01",
                nationalityType: "egyptian",
                tickets: [
                    { category: "adult", quantity: 2 },
                    { category: "student", quantity: 1 }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        console.log("Success:", response.data);
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
