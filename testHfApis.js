const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testApis() {
    try {
        // Test 1: Egyptian-Art-API
        console.log("Testing Egyptian-Art-API...");
        const res1 = await axios.post('https://ahmedelqady88-egyptian-art-api.hf.space/ai/generate', {
            prompt: "A beautiful pharaoh queen",
            steps: 5,
            guidance_scale: 7.5
        });
        console.log("Art API Response keys:", Object.keys(res1.data));
        console.log("Art API Response type:", typeof res1.data);
    } catch(e) {
        console.error("Art API Error:", e.message);
    }
}

testApis();
