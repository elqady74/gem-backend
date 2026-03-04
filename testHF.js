const { Client } = require("@gradio/client");

async function checkApi() {
    try {
        const client = await Client.connect("rana589/chat-bot");
        const appInfo = await client.view_api();
        console.log(JSON.stringify(appInfo, null, 2));
    } catch (error) {
        console.error("Error connecting to space:", error.message);
    }
}

checkApi();
