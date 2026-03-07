const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const doc = new PDFDocument({ margin: 50 });
const outputPath = path.join(__dirname, "GEM_Full_Project_Guide.pdf");
doc.pipe(fs.createWriteStream(outputPath));

function addTitle(text) {
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#212529").text(text);
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).strokeColor("#dee2e6").stroke();
    doc.moveDown(1.5);
}

function addSubtitle(text) {
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#495057").text(text);
    doc.moveDown(0.5);
}

function addText(text) {
    doc.font("Helvetica").fontSize(11).fillColor("#000000").text(text, { align: "justify" });
    doc.moveDown(0.5);
}

function addApi(method, url, authRequired, bodyText) {
    if (doc.y > 600) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text(`Method: `, { continued: true });
    doc.font("Helvetica").fillColor(method === "GET" ? "#0dcaf0" : (method === "POST" ? "#198754" : "#ffc107")).text(method);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text(`Endpoint: `, { continued: true });
    doc.font("Courier-Oblique").fillColor("#d63384").text(url);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text(`Auth Required: `, { continued: true });
    doc.font("Helvetica").fillColor(authRequired ? "#dc3545" : "#198754").text(authRequired ? "Yes (Bearer Token)" : "No");

    if (bodyText) {
        doc.moveDown(0.2);
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("Payload / Parameters:");
        doc.font("Courier").fontSize(9).fillColor("#333333").text(bodyText, { indent: 15 });
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#f8f9fa").stroke();
    doc.moveDown(1);
}

doc.fontSize(28).font("Helvetica-Bold").fillColor("#0d6efd").text("GEM Backend", { align: "center" });
doc.fontSize(16).font("Helvetica").fillColor("#6c757d").text("Complete Deployment & API Developer Guide", { align: "center" });
doc.moveDown(3);

addTitle("1. Railway Deployment Guide");
addText("When deploying this application to Railway, you must add the following Environment Variables in the Railway Dashboard. The application will not work correctly without them.");
addSubtitle("Essential Variables");
addText("PORT=5000 (Or let Railway assign it)");
addText("MONGO_URI=<Your MongoDB Atlas Connection String>");
addText("JWT_SECRET=<Your Secret Key for Authentication>");
addText("FRONTEND_URL=<Your Frontend Domain for CORS>");
addSubtitle("Payment Integration (Paymob)");
addText("PAYMOB_API_KEY=<Your Paymob API Key>");
addText("PAYMOB_HMAC_SECRET=<Your Paymob HMAC Secret>");
addText("PAYMOB_INTEGRATION_ID=<Your Paymob Card Integration ID>");
addText("PAYMOB_PUBLIC_KEY=<Your Paymob Public Key>");
addText("PAYMOB_SECRET_KEY=<Your Paymob Secret Key>");
addSubtitle("AI Features & HuggingFace");
addText("HF_TOKEN=<Your HuggingFace Access Token>");
addText("OPENROUTER_API_KEY=<Your OpenRouter API Key>");
addText("CARTOUCHE_HF_TOKEN=<Same as HF_TOKEN>");
addText("CARTOUCHE_OPENROUTER_KEY=<Same as OPENROUTER_API_KEY>");
addText("CARTOUCHE_HF_SPACE=samaelgendy/gem_cartouche");
addText("TTS_HF_SPACE=samaelgendy/Tts1");
addText("TTS_HF_TOKEN=<Your HuggingFace Access Token>");
addText("TTS_OPENROUTER_KEY=<Your OpenRouter API Key>");
addSubtitle("ngrok API Tunnels");
addText("DETECTION_API_URL=<ngrok url>");
addText("STORY_TO_IMAGE_API_URL=<ngrok url>");
addText("PHOTO_TO_PHARAOH_API_URL=<ngrok url>");

doc.addPage();
addTitle("2. Authentication APIs");
addText("Base URL: /api/auth");
addApi("POST", "/api/auth/register", false, "{\n  \"name\": \"John\",\n  \"email\": \"user@example.com\",\n  \"password\": \"123456\"\n}");
addApi("POST", "/api/auth/login", false, "{\n  \"email\": \"user@example.com\",\n  \"password\": \"123456\"\n}");
addApi("GET", "/api/auth/me", true, "Returns current user details based on token.");

addTitle("3. Bookings & Payments");
addText("Base URL: /api/bookings");
addApi("GET", "/api/bookings/my-bookings", true, "Returns all tickets/bookings for the logged-in user.");
addApi("POST", "/api/bookings/checkout", true, "{\n  \"items\": [{ \"unitId\": \"123\", \"quantity\": 2 }]\n}");

if (doc.y > 600) doc.addPage();
addTitle("4. AI Features");
addText("Base URL: /api/ai");
addApi("POST", "/api/ai/detect", true, "form-data: { image: <File> }");
addApi("POST", "/api/ai/story-to-image", true, "{\n  \"story\": \"An epic battle in ancient Egypt\"\n}");
addApi("POST", "/api/ai/name-to-cartouche", true, "{\n  \"name\": \"Alex\"\n}");
addApi("POST", "/api/ai/photo-to-pharaoh", true, "form-data: { image: <File> }");
addApi("POST", "/api/ai/ask", true, "{\n  \"question\": \"Who built the Pyramids?\"\n}");
addApi("POST", "/api/ai/text-to-speech", true, "{\n  \"statueId\": 4,\n  \"language\": \"ar\"\n}\n// Important: Excel Dataframe must be loaded globally in HF Space.");
addApi("GET", "/api/ai/chats", true, "Returns user's chat history.");

if (doc.y > 600) doc.addPage();
addTitle("5. Core Application Resources");
addSubtitle("Artifacts");
addText("Base URL: /api/artifacts");
addApi("GET", "/api/artifacts", false, "Returns all museum artifacts.");
addApi("GET", "/api/artifacts/:id", false, "Returns a single artifact by ID.");

doc.end();

console.log(`PDF generated successfully at: ${outputPath}`);
