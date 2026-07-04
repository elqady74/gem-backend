const { Client } = require("@gradio/client");

async function inspectSpace(spaceId) {
    try {
        console.log(`Inspecting ${spaceId}...`);
        const client = await Client.connect(spaceId);

        // This is not standard but we can try looking at config or just catch what's there
        console.log(`Successfully connected to ${spaceId}.`);
    } catch (e) {
        console.error(`Error connecting to ${spaceId}: ${e.message}`);
    }
}

async function main() {
    await inspectSpace("s0ad-atef/EgyptianArtGenerator");
    await inspectSpace("s0ad-atef/imgtopharaph");
    await inspectSpace("s0ad-atef/finalseq");
}

main();
