const { Client } = require('@gradio/client');

async function main() {
    try {
        const client = await Client.connect('s0ad-atef/EgyptianArtGenerator');
        const apiInfo = await client.view_api();
        console.log("API Info:");
        console.log(JSON.stringify(apiInfo, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
