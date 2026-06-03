const PDFDocument = require("pdfkit");
const fs = require("fs");

const BASE = "https://gem-backend-production-1ea2.up.railway.app";
const doc = new PDFDocument({ margin: 50, size: "A4" });
const out = fs.createWriteStream("GEM_API_Documentation.pdf");
doc.pipe(out);

const C = { brand: "#1a1a2e", accent: "#e94560", green: "#27ae60", blue: "#2980b9", orange: "#e67e22", grey: "#555", white: "#fff" };

function mc(m) { return { GET: C.green, POST: C.blue, PUT: C.orange, DELETE: C.accent }[m] || C.grey; }

function section(title) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 70).fill(C.brand);
  doc.fillColor(C.white).fontSize(20).font("Helvetica-Bold").text(title, 50, 22);
  doc.moveDown(3);
}

function ep(method, path, title, auth, desc, body, resp) {
  if (doc.y > doc.page.height - 160) doc.addPage();
  const y = doc.y;
  doc.roundedRect(50, y, 50, 18, 3).fill(mc(method));
  doc.fillColor(C.white).fontSize(8).font("Helvetica-Bold").text(method, 50, y + 4, { width: 50, align: "center" });
  doc.fillColor(C.brand).fontSize(10).font("Helvetica-Bold").text(path, 110, y + 3);
  doc.moveDown(0.3);
  doc.fillColor(C.grey).fontSize(9).font("Helvetica-Bold").text("  " + title + (auth ? "  🔒" : ""));
  if (desc) { doc.fillColor(C.grey).fontSize(8).font("Helvetica").text("  " + desc, { width: doc.page.width - 100 }); }
  doc.moveDown(0.2);
  if (body) {
    doc.fillColor(C.brand).fontSize(8).font("Helvetica-Bold").text("  Body:");
    body.forEach(([f, t, r]) => {
      doc.fillColor(C.grey).fontSize(7).font("Courier").text("    " + f + " (" + t + ") " + (r ? "[required]" : "[optional]"));
    });
    doc.moveDown(0.2);
  }
  if (resp) {
    doc.fillColor(C.brand).fontSize(8).font("Helvetica-Bold").text("  Response:");
    resp.forEach(([code, msg]) => {
      const col = String(code).startsWith("2") ? C.green : C.accent;
      doc.fillColor(col).fontSize(7).font("Helvetica-Bold").text("    " + code, { continued: true });
      doc.fillColor(C.grey).font("Helvetica").text("  " + msg);
    });
  }
  doc.moveDown(0.3);
  doc.strokeColor("#ddd").lineWidth(0.5).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(0.5);
}

// ═══ COVER ═══
doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.brand);
doc.fillColor(C.accent).fontSize(48).font("Helvetica-Bold").text("GEM", 0, 200, { align: "center" });
doc.fillColor(C.white).fontSize(20).font("Helvetica").text("Backend API Documentation", 0, 260, { align: "center" });
doc.fillColor("#aaa").fontSize(11).text("Grand Egyptian Museum — Mobile App", 0, 295, { align: "center" });
doc.moveDown(4);
doc.fillColor(C.white).fontSize(11).font("Helvetica-Bold").text("Base URL:", 0, 380, { align: "center" });
doc.fillColor(C.accent).fontSize(10).font("Courier").text(BASE, 0, 400, { align: "center" });
doc.fillColor("#aaa").fontSize(9).text("Generated: " + new Date().toLocaleDateString("en-GB"), 0, doc.page.height - 60, { align: "center" });

// ═══ NOTES ═══
doc.addPage();
doc.rect(0, 0, doc.page.width, 50).fill(C.brand);
doc.fillColor(C.white).fontSize(16).font("Helvetica-Bold").text("General Notes", 50, 15);
doc.moveDown(3);
const notes = [
  ["Auth Header", "Authorization: Bearer <token>"],
  ["Language", "Accept-Language: ar  OR  ?lang=ar"],
  ["Content-Type", "application/json  OR  multipart/form-data (files)"],
  ["Errors", '{ "message": "Error description" }'],
];
notes.forEach(([t, b]) => {
  doc.fillColor(C.brand).fontSize(10).font("Helvetica-Bold").text("▶ " + t);
  doc.fillColor(C.grey).fontSize(9).font("Courier").text("  " + b);
  doc.moveDown(0.5);
});

// ═══════════════════════════════════════════════
// 1. AUTH
// ═══════════════════════════════════════════════
section("🔐 1. Authentication  /api/auth");

ep("POST", "/api/auth/register", "Register", false, "Create new account",
  [["name","String",true],["email","String",true],["password","String",true]],
  [[201,'{ "message": "User registered" }'],[400,"User already exists"]]);

ep("POST", "/api/auth/login", "Login", false, "Returns JWT token (7 days)",
  [["email","String",true],["password","String",true]],
  [[200,'{ "token": "eyJ..." }'],[400,"Invalid credentials"]]);

ep("POST", "/api/auth/google", "Google OAuth Login", false, "Login with Google ID token",
  [["tokenId","String",true]],
  [[200,'{ "token": "eyJ..." }'],[401,"Invalid token"]]);

ep("POST", "/api/auth/forgot-password", "Forgot Password", false, "Sends 6-digit OTP to email (expires 30 min)",
  [["email","String",true]],
  [[200,'{ "message": "Reset code sent" }'],[404,"No user with email"]]);

ep("POST", "/api/auth/verify-reset-code", "Verify OTP", false, "Verify the 6-digit code",
  [["email","String",true],["code","String",true]],
  [[200,'{ "message": "Code verified" }'],[400,"Invalid/expired code"]]);

ep("POST", "/api/auth/reset-password", "Reset Password", false, "Set new password with OTP",
  [["email","String",true],["code","String",true],["newPassword","String",true]],
  [[200,'{ "message": "Password updated" }']]);

ep("GET", "/api/auth/me", "Get Current User", true, "Returns user profile (no password)",
  null,
  [[200,'{ _id, name, email, avatar, language, role }']]);

ep("PUT", "/api/auth/me", "Update Profile", true, "Update name, avatar, language, password. Also accepts multipart/form-data with avatar file",
  [["name","String",false],["avatar","String/File",false],["language","String",false],["oldPassword","String",false],["newPassword","String",false]],
  [[200,'{ "message": "Profile updated", "user": {...} }']]);

ep("POST", "/api/auth/me/avatar", "Upload Avatar (Cloudinary)", true, "multipart/form-data — max 5MB. Stored permanently on Cloudinary",
  [["avatar","File (image)",true]],
  [[200,'{ "message", "avatarUrl": "https://res.cloudinary.com/...", "user" }']]);

ep("PUT", "/api/auth/make-admin/:id", "Make Admin", true, "Admin only — promote user to admin",
  null, [[200,"Updated user object"]]);

// ═══════════════════════════════════════════════
// 2. ARTIFACTS
// ═══════════════════════════════════════════════
section("🏺 2. Artifacts  /api/artifacts");

ep("GET", "/api/artifacts", "Get All Artifacts", false, "Returns full list of artifacts", null, [[200,"Array of artifacts"]]);

ep("GET", "/api/artifacts/:id", "Get Single Artifact", false, "Get artifact by MongoDB ID", null,
  [[200,"Artifact object"],[404,"Not found"]]);

ep("POST", "/api/artifacts", "Create (Admin)", true, "Add new artifact",
  [["name","String",true],["description","String",true],["era","String",false],["imageUrl","String",false],["model3DUrl","String",false],["audioUrl","String",false],["videoUrl","String",false]],
  [[201,"Created artifact"]]);

ep("PUT", "/api/artifacts/:id", "Update (Admin)", true, "Update artifact by ID",
  [["name","String",false],["description","String",false],["imageUrl","String",false]], [[200,"Updated artifact"]]);

ep("DELETE", "/api/artifacts/:id", "Delete (Admin)", true, "Delete artifact by ID", null, [[200,'{ "message" }']]);

// ═══════════════════════════════════════════════
// 3. FAVORITES
// ═══════════════════════════════════════════════
section("❤️ 3. Favorites  /api/favorites");

ep("POST", "/api/favorites/:itemId", "Add to Favorites", true, "itemId can be MongoDB ObjectId or static string. type defaults to Artifact",
  [["type","String",false]], [[201,"Favorite object"],[400,"Already in favorites"]]);

ep("POST", "/api/favorites/toggle/:itemId", "Toggle Favorite", true, "Add or remove in one call. type: Artifact (default) or Event",
  [["type","String",false]], [[200,'{ "isFavorited": true/false, "message" }']]);

ep("GET", "/api/favorites/my", "My Favorites", true, "Get favorites (populated). Query: ?type=Artifact or ?type=Event",
  null, [[200,"Array of favorites (populated with item data)"]]);

ep("GET", "/api/favorites/count", "Favorites Count", true, "Query: ?type=Artifact (optional)",
  null, [[200,'{ "count": 5 }']]);

ep("GET", "/api/favorites/check/:itemId", "Check if Favorited", true, "Query: ?type=Artifact",
  null, [[200,'{ "isFavorited": true/false }']]);

ep("DELETE", "/api/favorites/:itemId", "Remove from Favorites", true, "Query: ?type=Artifact",
  null, [[200,'{ "message" }'],[404,"Not found"]]);

// ═══════════════════════════════════════════════
// 4. EVENTS
// ═══════════════════════════════════════════════
section("🎭 4. Events  /api/events");

ep("GET", "/api/events", "Get All Events", false, "Sorted by date ascending", null, [[200,"Array of events"]]);

ep("POST", "/api/events", "Create Event (Admin)", true, null,
  [["title","String",true],["description","String",true],["date","Date (ISO)",true],["imageUrl","String",false],["location","String",false]],
  [[201,"Created event"],[403,"Access denied"]]);

ep("PUT", "/api/events/:id", "Update Event (Admin)", true, "Partial update — only send changed fields",
  [["title","String",false],["description","String",false],["date","Date (ISO)",false],["imageUrl","String",false],["location","String",false]],
  [[200,"Updated event"],[404,"Event not found"]]);

ep("DELETE", "/api/events/:id", "Delete Event (Admin)", true, null, null, [[200,'{ "message" }']]);

// ═══════════════════════════════════════════════
// 5. BOOKINGS
// ═══════════════════════════════════════════════
section("🎫 5. Bookings & Payments  /api/bookings");

doc.fillColor(C.grey).fontSize(8).font("Helvetica").text("Prices loaded dynamically from Settings. Tax rate defaults to 14%. Payment via Paymob gateway.");
doc.moveDown(0.5);

ep("POST", "/api/bookings/checkout", "Create Checkout", true, "Creates booking + Paymob payment URL",
  [["visitDate","String (ISO)",true],["nationalityType","String",true],["tickets","Array [{category, quantity}]",true],["billingData","Object",false]],
  [[200,'{ bookingId, subtotal, tax, total, checkoutUrl }']]);

ep("POST", "/api/bookings/verify-payment", "Verify Payment", true, "Call after user returns from Paymob",
  [["orderId","String",true],["transactionId","String",false]],
  [[200,'{ "message": "Payment successful", "booking" }']]);

ep("POST", "/api/bookings/webhook", "Paymob Webhook", false, "Auto-called by Paymob with HMAC verification — do NOT call manually", null, [[200,'{ "message" }']]);

ep("GET", "/api/bookings/my-bookings", "My Bookings", true, "User's bookings (newest first)", null, [[200,"Array of bookings"]]);

ep("GET", "/api/bookings/:id", "Booking Details", true, "Get single booking by ID", null, [[200,"Booking object"],[404,"Not found"]]);

ep("GET", "/api/bookings", "All Bookings (Admin)", true, "With user info populated", null, [[200,"Array of all bookings"]]);

// ═══════════════════════════════════════════════
// 6. AI
// ═══════════════════════════════════════════════
section("🤖 6. AI Features  /api/ai");

doc.fillColor(C.grey).fontSize(8).font("Helvetica").text("Detection + TTS powered by HuggingFace (egyptian-museum-storyteller). Story-to-Image by Gradio (pharaonic-ai-generator).");
doc.moveDown(0.5);

ep("POST", "/api/ai/ask", "AI Chatbot", true, "Ask about Egyptian history/artifacts",
  [["question","String",true]], [[200,'{ "answer": "..." }']]);

ep("GET", "/api/ai/chats", "Chat History", true, null, null, [[200,"Array of {question, answer}"]]);

ep("POST", "/api/ai/detect", "Artifact Detection", true, "multipart/form-data — upload artifact photo. Uses HuggingFace storyteller /detect",
  [["image","File",true]], [[200,'{ detected, confidence, artifact, rawResult }'],[503,"API not configured / offline"]]);

ep("GET", "/api/ai/detections", "Detection History", true, null, null, [[200,"Array of detections"]]);

ep("POST", "/api/ai/story-to-image", "Story to Image", true, "Generate pharaonic image from story text (Gradio space). Takes 1-3 min.",
  [["story","String",true]], [[200,'{ "image": "url", "format": "url", "rawResult" }'],[500,"Generation failed"]]);

ep("POST", "/api/ai/name-to-cartouche", "Name to Cartouche", true, "Convert name to hieroglyphic cartouche",
  [["name","String",true]], [[200,'{ "name", "cartouche": "image_url", "rawResult" }']]);

ep("POST", "/api/ai/photo-to-pharaoh", "Photo to Pharaoh", true, "multipart/form-data — transform selfie to pharaoh",
  [["image","File",true]], [[200,'{ "pharaohImage": "data:image/...;base64,...", "format": "base64" }'],[503,"API offline"]]);

ep("POST", "/api/ai/text-to-speech", "Full Pipeline (Detect + Story + Audio)", true, "multipart/form-data — upload artifact photo. detect + generate story + audio (MP3)",
  [["image","File",true],["language","String ('ar'|'en')",false]], [[200,'{ story, audioBase64, detected, rawResult }'],[503,"API offline"]]);

ep("POST", "/api/ai/image-to-3d", "Image to 3D (Coming Soon)", true, "multipart/form-data — placeholder",
  [["image","File",true]], [[202,'{ "message": "Coming soon", "status": "placeholder" }']]);

// ═══════════════════════════════════════════════
// 7. UPLOAD & VIDEOS
// ═══════════════════════════════════════════════
section("📤 7. Upload & 🎬 Videos");

ep("POST", "/api/upload/video", "Upload Video", false, "multipart/form-data — max 100MB",
  [["video","File",true],["title","String",false]], [[200,'{ title, public_id, url, duration }']]);

ep("GET", "/api/videos", "Get All Videos", false, null, null, [[200,"Array of videos"]]);

ep("POST", "/api/videos/add", "Add Video Record", false, null,
  [["title","String",true],["public_id","String",true],["url","String",true],["duration","Number",false]], [[200,"Video object"]]);

// ═══════════════════════════════════════════════
// 8. LANG
// ═══════════════════════════════════════════════
section("🌐 8. Language  /api/lang");

ep("GET", "/api/lang", "Get Translations (auto)", false, "Based on Accept-Language header", null, [[200,'{ lang, translations }']]);
ep("GET", "/api/lang/:locale", "Get by Locale", false, "e.g. /api/lang/ar", null, [[200,'{ lang, translations }']]);
ep("GET", "/api/lang/all/translations", "Get All Languages", false, null, null, [[200,'{ supported, translations: {en:{...}, ar:{...}} }']]);

// ═══════════════════════════════════════════════
// 9. SETTINGS (Public)
// ═══════════════════════════════════════════════
section("⚙️ 9. Public Settings  /api/settings");

ep("GET", "/api/settings", "Get Settings", false, "Public museum global settings (ticket prices, add-ons, hours, tax rate)", null, [[200,"Settings object"]]);

// ═══════════════════════════════════════════════
// 10. ADMIN DASHBOARD
// ═══════════════════════════════════════════════
section("🛡️ 10. Admin Dashboard  /api/admin");

doc.fillColor(C.accent).fontSize(9).font("Helvetica-Bold").text("⚠️  All endpoints below require Admin Token");
doc.moveDown(0.8);

// --- Stats ---
doc.fillColor(C.brand).fontSize(12).font("Helvetica-Bold").text("📊 Dashboard Stats");
doc.moveDown(0.3);

ep("GET", "/api/admin/stats", "Dashboard Statistics", true, "Users, bookings, revenue, artifacts, events, AI, videos, favorites — all in one call", null, [[200,"Full stats object"]]);

// --- Users ---
doc.fillColor(C.brand).fontSize(12).font("Helvetica-Bold").text("👥 User Management");
doc.moveDown(0.3);

ep("GET", "/api/admin/users", "List All Users", true, "Paginated. Query: ?page, limit, search, role, banned", null, [[200,"Paginated users"]]);

ep("GET", "/api/admin/users/:id", "Get Single User", true, null, null, [[200,"User object"],[404,"Not found"]]);

ep("PUT", "/api/admin/users/:id", "Update User", true, null,
  [["name","String",false],["role","String (user|admin)",false]], [[200,'{ "message", "user" }']]);

ep("DELETE", "/api/admin/users/:id", "Delete User", true, "Cannot delete yourself", null, [[200,'{ "message" }']]);

ep("PUT", "/api/admin/users/:id/ban", "Ban / Unban User", true, "Toggles ban status. Cannot ban yourself", null, [[200,'{ "message", "isBanned" }']]);

ep("GET", "/api/admin/users/:id/activity", "Get User Activity", true, "Returns bookings, chats, detections, favorites for a user", null, [[200,'{ user, activity: { bookings, chats, detections, favorites } }']]);

// --- Bookings ---
doc.fillColor(C.brand).fontSize(12).font("Helvetica-Bold").text("🎫 Booking Management");
doc.moveDown(0.3);

ep("GET", "/api/admin/bookings", "List All Bookings", true, "Paginated. Query: ?page, limit, status, nationality, dateFrom, dateTo", null, [[200,"Paginated bookings with user info"]]);

ep("GET", "/api/admin/bookings/:id", "Get Single Booking", true, "With user avatar populated", null, [[200,"Booking object"],[404,"Not found"]]);

ep("PUT", "/api/admin/bookings/:id/status", "Update Booking Status", true, null,
  [["status","String (pending|paid|cancelled|failed)",true]], [[200,'{ "message", "booking" }']]);

ep("GET", "/api/admin/bookings-revenue", "Revenue Report", true, "Query: ?period=daily|weekly|monthly — defaults to monthly",
  null, [[200,'{ period, totalRevenue, totalBookings, currency, breakdown }']]);

// --- AI ---
doc.fillColor(C.brand).fontSize(12).font("Helvetica-Bold").text("🤖 AI Management");
doc.moveDown(0.3);

ep("GET", "/api/admin/ai/chats", "List All Chats", true, "Paginated. Query: ?page, limit, search, userId", null, [[200,"Paginated chats with user info"]]);

ep("GET", "/api/admin/ai/detections", "List All Detections", true, "Paginated. Query: ?page, limit, artifact, userId", null, [[200,"Paginated detections"]]);

ep("DELETE", "/api/admin/ai/chats/:id", "Delete Chat", true, null, null, [[200,'{ "message" }']]);

// --- Logs ---
doc.fillColor(C.brand).fontSize(12).font("Helvetica-Bold").text("📋 Activity Logs");
doc.moveDown(0.3);

ep("GET", "/api/admin/logs", "View Activity Logs", true, "Paginated. Query: ?page, limit, action, adminId, targetModel, dateFrom, dateTo", null, [[200,"Paginated activity logs"]]);

// --- Settings ---
doc.fillColor(C.brand).fontSize(12).font("Helvetica-Bold").text("⚙️ Settings");
doc.moveDown(0.3);

ep("GET", "/api/admin/settings", "Get Settings", true, null, null, [[200,"Settings object"]]);

ep("PUT", "/api/admin/settings", "Update Settings", true, "Only allowed fields are applied",
  [["ticketPrices","Object",false],["addons","Object",false],["taxRate","Number",false],["maxBookingsPerDay","Number",false],["maintenanceMode","Boolean",false],["museumOpenTime","String",false],["museumCloseTime","String",false]],
  [[200,'{ "message", "settings" }']]);

// --- Notifications ---
doc.fillColor(C.brand).fontSize(12).font("Helvetica-Bold").text("🔔 Notifications");
doc.moveDown(0.3);

ep("POST", "/api/admin/notifications/send", "Send Notification", true, "If recipientId is provided, sends to specific user. Otherwise broadcasts to all.",
  [["title","String",true],["message","String",true],["type","String (info|warning|promo|system)",false],["recipientId","ObjectId",false]],
  [[201,'{ "message", "notification" }']]);

ep("GET", "/api/admin/notifications", "Get Sent Notifications", true, "Paginated. Query: ?page, limit, type, broadcast=true", null, [[200,"Paginated notifications"]]);


// ═══ SUMMARY PAGE ═══
section("📊 Summary — 64 Total Endpoints");

const summary = [
  ["Auth & Users", "/api/auth", "10"],
  ["Artifacts", "/api/artifacts", "5"],
  ["Favorites", "/api/favorites", "6"],
  ["Events", "/api/events", "4"],
  ["Bookings & Payments", "/api/bookings", "6"],
  ["AI Features", "/api/ai", "9"],
  ["Upload", "/api/upload", "1"],
  ["Videos", "/api/videos", "2"],
  ["Language", "/api/lang", "3"],
  ["Public Settings", "/api/settings", "1"],
  ["Admin Dashboard", "/api/admin", "17"],
];

// Table header
const tableX = 60;
doc.fillColor(C.brand).fontSize(10).font("Helvetica-Bold");
doc.text("Section", tableX, doc.y, { width: 200 });
doc.text("Mount Point", tableX + 200, doc.y - 14, { width: 150 });
doc.text("Endpoints", tableX + 370, doc.y - 14, { width: 80 });
doc.moveDown(0.5);
doc.strokeColor("#ddd").lineWidth(1).moveTo(tableX, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
doc.moveDown(0.3);

summary.forEach(([name, mount, count]) => {
  doc.fillColor(C.grey).fontSize(9).font("Helvetica");
  doc.text(name, tableX, doc.y, { width: 200 });
  doc.fillColor(C.blue).font("Courier").text(mount, tableX + 200, doc.y - 12, { width: 150 });
  doc.fillColor(C.brand).font("Helvetica-Bold").text(count, tableX + 400, doc.y - 12, { width: 50 });
  doc.moveDown(0.3);
});

doc.moveDown(0.5);
doc.strokeColor("#ddd").lineWidth(1).moveTo(tableX, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
doc.moveDown(0.3);
doc.fillColor(C.brand).fontSize(11).font("Helvetica-Bold").text("Total: 64 Endpoints", tableX, doc.y);


// ═══ PAGE NUMBERS ═══
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(pages.start + i);
  doc.fillColor("#aaa").fontSize(7).font("Helvetica")
     .text("Page " + (i+1) + "/" + pages.count + "  |  GEM API", 50, doc.page.height - 30, { align: "center", width: doc.page.width - 100 });
}

doc.end();
out.on("finish", () => console.log("Done! => GEM_API_Documentation.pdf"));
