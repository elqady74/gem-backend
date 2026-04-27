const fs = require('fs');
const PDFDocument = require('pdfkit');

const doc = new PDFDocument({ margin: 50, size: 'A4' });
doc.pipe(fs.createWriteStream('FRONTEND_API_GUIDE.pdf'));

const BASE_URL = 'https://gem-backend-production-cb6d.up.railway.app';

// ====== HELPER FUNCTIONS ======
function title(text) {
    doc.addPage();
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#B8860B')
        .text(text, { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#B8860B').lineWidth(2)
        .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
    doc.fillColor('#000000');
}

function sectionTitle(text) {
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#B8860B').text(text);
    doc.fillColor('#000000');
    doc.moveDown(0.3);
}

function endpoint(method, path, auth, desc) {
    const methodColors = {
        'GET': '#27ae60',
        'POST': '#2980b9',
        'PUT': '#f39c12',
        'DELETE': '#e74c3c'
    };
    const color = methodColors[method] || '#333333';

    doc.fontSize(12).font('Helvetica-Bold').fillColor(color).text(`[${method}]`, { continued: true });
    doc.fillColor('#000000').text(` ${path}`);
    doc.fontSize(10).font('Helvetica').text(`Auth: ${auth} — ${desc}`);
    doc.moveDown(0.3);
}

function bodyExample(json) {
    doc.fontSize(9).font('Courier').fillColor('#444444').text(`Body: ${json}`);
    doc.fillColor('#000000').font('Helvetica');
    doc.moveDown(0.3);
}

function responseExample(json) {
    doc.fontSize(9).font('Courier').fillColor('#2c3e50').text(`Response: ${json}`);
    doc.fillColor('#000000').font('Helvetica');
    doc.moveDown(0.5);
}

function note(text) {
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#7f8c8d').text(`${text}`);
    doc.fillColor('#000000').font('Helvetica');
    doc.moveDown(0.3);
}

// ============================
//   COVER PAGE
// ============================
doc.moveDown(6);
doc.fontSize(32).font('Helvetica-Bold').fillColor('#B8860B')
    .text('GEM Backend', { align: 'center' });
doc.fontSize(24).text('Full API Reference', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(18).text('Frontend Integration Guide', { align: 'center' });
doc.moveDown(1);
doc.fontSize(14).font('Helvetica').fillColor('#555555')
    .text('Grand Egyptian Museum — Digital Platform', { align: 'center' });
doc.moveDown(2);
doc.fontSize(12).fillColor('#000000')
    .text(`Base URL: ${BASE_URL}`, { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(10).fillColor('#888888')
    .text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, { align: 'center' });
doc.moveDown(3);
doc.fontSize(11).fillColor('#333333')
    .text('Authentication: All endpoints require header:', { align: 'center' });
doc.fontSize(10).font('Courier')
    .text('Authorization: Bearer <token>', { align: 'center' });
doc.moveDown(1);
doc.fontSize(11).font('Helvetica').fillColor('#333333')
    .text('Language: Send Accept-Language header for Arabic/English:', { align: 'center' });
doc.fontSize(10).font('Courier')
    .text('Accept-Language: ar   OR   Accept-Language: en', { align: 'center' });
doc.font('Helvetica').fillColor('#000000');

// ============================
//   1. AUTH APIS
// ============================
title('1. Authentication APIs — /api/auth');

sectionTitle('Register');
endpoint('POST', '/api/auth/register', 'No', 'Create a new user account');
bodyExample('{ "name": "Ahmed", "email": "ahmed@email.com", "password": "123456" }');
responseExample('{ "message": "User registered successfully" }');

sectionTitle('Login');
endpoint('POST', '/api/auth/login', 'No', 'Login and get JWT token');
bodyExample('{ "email": "ahmed@email.com", "password": "123456" }');
responseExample('{ "token": "eyJhbGci..." }');

sectionTitle('Google Login');
endpoint('POST', '/api/auth/google', 'No', 'Login via Google OAuth');
bodyExample('{ "tokenId": "google_id_token_from_frontend" }');
responseExample('{ "token": "eyJhbGci..." }');
note('Google Client ID: 322457229349-1riijja3taalo0kbd4i6ulaotscujif5.apps.googleusercontent.com');
note('Frontend uses Google Sign-In SDK, then sends the tokenId to this endpoint.');

sectionTitle('Forgot Password (Send OTP)');
endpoint('POST', '/api/auth/forgot-password', 'No', 'Send 6-digit reset code to email');
bodyExample('{ "email": "ahmed@email.com" }');
responseExample('{ "message": "Reset code sent to email" }');

sectionTitle('Verify OTP Code');
endpoint('POST', '/api/auth/verify-reset-code', 'No', 'Verify the reset code');
bodyExample('{ "email": "ahmed@email.com", "code": "123456" }');
responseExample('{ "message": "Code verified successfully! You can now reset your password." }');

sectionTitle('Reset Password');
endpoint('POST', '/api/auth/reset-password', 'No', 'Set new password using OTP');
bodyExample('{ "email": "ahmed@email.com", "code": "123456", "newPassword": "newPass123" }');
responseExample('{ "message": "Password updated successfully" }');

sectionTitle('Get Current User');
endpoint('GET', '/api/auth/me', 'Yes', 'Get current logged-in user profile');
responseExample('{ "_id": "...", "name": "Ahmed", "email": "...", "avatar": "...", "language": "en", "role": "user" }');

sectionTitle('Update Profile');
endpoint('PUT', '/api/auth/me', 'Yes', 'Update name, avatar, language, or password');
bodyExample('{ "name": "New Name", "avatar": "url", "language": "ar", "oldPassword": "old", "newPassword": "new123" }');
responseExample('{ "message": "Profile updated successfully", "user": { ... } }');
note('All fields optional. Password change requires oldPassword + newPassword (min 6 chars).');

sectionTitle('Make Admin');
endpoint('PUT', '/api/auth/make-admin/:userId', 'Admin Only', 'Promote a user to admin');

// ============================
//   2. ARTIFACTS APIS
// ============================
title('2. Artifacts APIs — /api/artifacts');

sectionTitle('Get All Artifacts');
endpoint('GET', '/api/artifacts', 'No (Public)', 'Get all artifacts');
responseExample('[{ "_id": "...", "name": "Sphinx", "description": "...", "era": "...", "imageUrl": "...", "model3DUrl": "...", "audioUrl": "...", "videoUrl": "..." }]');

sectionTitle('Get Single Artifact');
endpoint('GET', '/api/artifacts/:id', 'No (Public)', 'Get artifact by ID');

sectionTitle('Create Artifact');
endpoint('POST', '/api/artifacts', 'Admin Only', 'Create new artifact');
bodyExample('{ "name": "...", "description": "...", "era": "...", "imageUrl": "...", "model3DUrl": "...", "audioUrl": "...", "videoUrl": "..." }');

sectionTitle('Update Artifact');
endpoint('PUT', '/api/artifacts/:id', 'Admin Only', 'Update artifact by ID');

sectionTitle('Delete Artifact');
endpoint('DELETE', '/api/artifacts/:id', 'Admin Only', 'Delete artifact by ID');
responseExample('{ "message": "Artifact deleted successfully" }');

// ============================
//   3. EVENTS APIS
// ============================
title('3. Events APIs — /api/events');

sectionTitle('Get All Events');
endpoint('GET', '/api/events', 'No (Public)', 'Get all events sorted by date');
responseExample('[{ "_id": "...", "title": "Night Tour", "description": "...", "date": "2026-05-01", "imageUrl": "..." }]');

sectionTitle('Create Event');
endpoint('POST', '/api/events', 'Admin Only', 'Create new event');
bodyExample('{ "title": "Night Tour", "description": "...", "date": "2026-05-01", "imageUrl": "..." }');

sectionTitle('Delete Event');
endpoint('DELETE', '/api/events/:id', 'Admin Only', 'Delete event by ID');
responseExample('{ "message": "Event deleted" }');

// ============================
//   4. FAVORITES APIS
// ============================
title('4. Favorites APIs — /api/favorites');
note('Supports both Artifacts and Events. Pass type = "Artifact" or "Event". Default: "Artifact".');

sectionTitle('Toggle Favorite (Recommended)');
endpoint('POST', '/api/favorites/toggle/:itemId', 'Yes', 'Add if not favorited, remove if already favorited');
bodyExample('{ "type": "Artifact" }');
responseExample('{ "isFavorited": true, "message": "Added to favorites" }');

sectionTitle('Check if Favorited');
endpoint('GET', '/api/favorites/check/:itemId?type=Artifact', 'Yes', 'Check favorite status');
responseExample('{ "isFavorited": true }');

sectionTitle('Get My Favorites');
endpoint('GET', '/api/favorites/my', 'Yes', 'Get all favorites');
endpoint('GET', '/api/favorites/my?type=Artifact', 'Yes', 'Get favorite artifacts only');
endpoint('GET', '/api/favorites/my?type=Event', 'Yes', 'Get favorite events only');

sectionTitle('Get Favorites Count');
endpoint('GET', '/api/favorites/count', 'Yes', 'Get total favorites count');
responseExample('{ "count": 5 }');

sectionTitle('Add to Favorites');
endpoint('POST', '/api/favorites/:itemId', 'Yes', 'Add item to favorites');
bodyExample('{ "type": "Artifact" }');

sectionTitle('Remove from Favorites');
endpoint('DELETE', '/api/favorites/:itemId?type=Artifact', 'Yes', 'Remove from favorites');
responseExample('{ "message": "Removed from favorites" }');

// ============================
//   5. BOOKING & PAYMENT APIS
// ============================
title('5. Booking & Payment APIs — /api/bookings');

doc.fontSize(11).font('Helvetica-Bold').text('Ticket Prices (EGP):');
doc.fontSize(10).font('Helvetica')
    .text('  Egyptian:   Adult 200 | Child 100 | Student 100')
    .text('  Arab:       Adult 1450 | Child 730')
    .text('  Expatriate: Adult 730 | Child 370');
doc.moveDown(0.5);
note('Tax: 14% added automatically.');

sectionTitle('Create Checkout Session');
endpoint('POST', '/api/bookings/checkout', 'Yes', 'Create booking + Paymob payment session');
bodyExample('{ "visitDate": "2026-05-15", "nationalityType": "egyptian", "tickets": [{ "category": "adult", "quantity": 2 }, { "category": "child", "quantity": 1 }], "billingData": { "first_name": "Ahmed", "last_name": "Ali", "email": "a@t.com", "phone_number": "+20123456" } }');
responseExample('{ "bookingId": "...", "subtotal": 500, "tax": 70, "total": 570, "currency": "EGP", "paymobOrderId": "...", "paymentKey": "...", "checkoutUrl": "https://accept.paymob.com/..." }');

sectionTitle('Verify Payment');
endpoint('POST', '/api/bookings/verify-payment', 'Yes', 'Verify payment status after checkout');
bodyExample('{ "orderId": "PAYMOB_ORDER_ID", "transactionId": "TRANSACTION_ID" }');
responseExample('{ "message": "Payment successful", "booking": { ... } }');

sectionTitle('Get My Bookings');
endpoint('GET', '/api/bookings/my-bookings', 'Yes', 'Get current user bookings');

sectionTitle('Get Booking Details');
endpoint('GET', '/api/bookings/:id', 'Yes', 'Get single booking by ID');

sectionTitle('Get All Bookings');
endpoint('GET', '/api/bookings/', 'Admin Only', 'Get all bookings (admin dashboard)');

sectionTitle('Paymob Webhook');
endpoint('POST', '/api/bookings/webhook', 'No (Server)', 'Paymob transaction callback (automatic)');
note('Called automatically by Paymob — frontend does not use this.');

// ============================
//   6. AI FEATURE APIS
// ============================
title('6. AI Feature APIs — /api/ai');

sectionTitle('1. AI Chat Bot');
endpoint('POST', '/api/ai/ask', 'Yes', 'Ask the AI chatbot a question');
bodyExample('{ "question": "Tell me about the pyramids" }');
responseExample('{ "answer": "The pyramids of Giza were built..." }');

sectionTitle('2. Get Chat History');
endpoint('GET', '/api/ai/chats', 'Yes', 'Get user chat history');

sectionTitle('3. Artifact Detection (Camera/Upload)');
endpoint('POST', '/api/ai/detect', 'Yes', 'Detect artifact from image');
note('Content-Type: multipart/form-data — Field: image (file, max 10MB)');
responseExample('{ "detected": "Tutankhamun Mask", "confidence": 0.95, "artifact": { ... } }');

sectionTitle('4. Get Detection History');
endpoint('GET', '/api/ai/detections', 'Yes', 'Get user detection history');

sectionTitle('5. Story to Image (AI Imagination)');
endpoint('POST', '/api/ai/story-to-image', 'Yes', 'Generate image from story text');
bodyExample('{ "story": "A pharaoh walking in a golden palace..." }');
responseExample('{ "image": "data:image/png;base64,...", "format": "base64" }');

sectionTitle('6. Name to Cartouche');
endpoint('POST', '/api/ai/name-to-cartouche', 'Yes', 'Convert name to Egyptian cartouche');
bodyExample('{ "name": "Ahmed" }');
responseExample('{ "name": "Ahmed", "cartouche": "image_url_or_base64" }');

sectionTitle('7. Photo to Pharaoh');
endpoint('POST', '/api/ai/photo-to-pharaoh', 'Yes', 'Transform photo to pharaoh style');
note('Content-Type: multipart/form-data — Field: image (file)');
responseExample('{ "pharaohImage": "data:image/png;base64,...", "format": "base64" }');

sectionTitle('8. Text to Speech');
endpoint('POST', '/api/ai/text-to-speech', 'Yes', 'Generate audio narration for a statue');
bodyExample('{ "statueId": "1", "language": "ar" }');
responseExample('{ "info": "...", "text": "...", "audioUrl": "..." }');
note('language: "ar" or "en"');

sectionTitle('9. Image to 3D (Coming Soon)');
endpoint('POST', '/api/ai/image-to-3d', 'Yes', 'Convert image to 3D model (placeholder)');
note('Content-Type: multipart/form-data — Field: image (file)');
responseExample('{ "message": "Image-to-3D feature is coming soon", "status": "placeholder" }');

// ============================
//   7. VIDEOS & UPLOAD APIS
// ============================
title('7. Videos & Upload APIs');

sectionTitle('Get All Videos');
endpoint('GET', '/api/videos', 'No (Public)', 'Get all videos');

sectionTitle('Add Video');
endpoint('POST', '/api/videos/add', 'No', 'Add video metadata');
bodyExample('{ "title": "Tour", "public_id": "...", "url": "https://...", "duration": 120 }');

sectionTitle('Upload Video to Cloudinary');
endpoint('POST', '/api/upload/video', 'No', 'Upload video file to Cloudinary');
note('Content-Type: multipart/form-data — Fields: video (file, max 100MB), title (text)');

// ============================
//   8. LANGUAGE / i18n APIS
// ============================
title('8. Language / i18n APIs — /api/lang');

note('All API responses support Arabic and English. Send Accept-Language header or ?lang= query param.');

sectionTitle('Get All Translations');
endpoint('GET', '/api/lang/all/translations', 'No (Public)', 'Get all translations (en + ar) at once');
responseExample('{ "supported": ["en", "ar"], "default": "en", "translations": { "en": { ... }, "ar": { ... } } }');
note('Recommended: Call once on app load and cache locally.');

sectionTitle('Get Translations by Language');
endpoint('GET', '/api/lang/ar', 'No (Public)', 'Get Arabic translations');
endpoint('GET', '/api/lang/en', 'No (Public)', 'Get English translations');
responseExample('{ "lang": "ar", "translations": { "server_error": "...", ... } }');

sectionTitle('Get Translations by Header');
endpoint('GET', '/api/lang', 'No (Public)', 'Get translations based on Accept-Language header');

// ============================
//   9. SCREEN → API MAPPING
// ============================
title('9. Frontend Screen to API Mapping');

const mappings = [
    ['Landing page', 'Static — no API'],
    ['Login', 'POST /api/auth/login'],
    ['Login with Google', 'POST /api/auth/google'],
    ['Register', 'POST /api/auth/register'],
    ['Home', 'GET /api/artifacts + GET /api/events'],
    ['AI Guide / Chat bot', 'POST /api/ai/ask + GET /api/ai/chats'],
    ['AI Imagination', 'POST /api/ai/story-to-image'],
    ['About us', 'Static — no API'],
    ['Ancient-arts / Collection', 'GET /api/artifacts'],
    ['Artifact-show', 'GET /api/artifacts/:id'],
    ['Edit-profile', 'PUT /api/auth/me'],
    ['Name-Translator', 'POST /api/ai/name-to-cartouche'],
    ['Pharaoh-Transformer', 'POST /api/ai/photo-to-pharaoh'],
    ['Profile', 'GET /api/auth/me'],
    ['Advanced 3D Model', 'POST /api/ai/image-to-3d (placeholder)'],
    ['Artifact Identifier', 'POST /api/ai/detect'],
    ['Text to Speech', 'POST /api/ai/text-to-speech'],
    ['Booking / Plan-your-visit', 'POST /api/bookings/checkout'],
    ['Change password', 'PUT /api/auth/me (oldPassword/newPassword)'],
    ['Forgot password', 'POST /api/auth/forgot-password'],
    ['Verify OTP', 'POST /api/auth/verify-reset-code'],
    ['Reset password', 'POST /api/auth/reset-password'],
    ['Events', 'GET /api/events'],
    ['Favorites', 'Favorites APIs (toggle/my/check)'],
    ['Payment', 'POST /api/bookings/checkout -> checkoutUrl'],
    ['Settings / Language', 'PUT /api/auth/me (language) + GET /api/lang'],
];

mappings.forEach(([screen, api]) => {
    doc.fontSize(10).font('Helvetica-Bold').text(screen, { continued: true });
    doc.font('Helvetica').text(` -> ${api}`);
    doc.moveDown(0.2);
});

// ============================
//   10. IMPORTANT NOTES
// ============================
title('10. Important Notes for Frontend');

doc.fontSize(11).font('Helvetica');

doc.font('Helvetica-Bold').text('1. Authentication');
doc.font('Helvetica').text('All protected endpoints require: Authorization: Bearer <token>');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('2. Language Support (i18n)');
doc.font('Helvetica').text('Send Accept-Language: ar for Arabic messages, or Accept-Language: en for English.');
doc.text('Alternative: Add ?lang=ar as query parameter.');
doc.text('Default: English.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('3. Google Login');
doc.font('Helvetica').text('Client ID: 322457229349-1riijja3taalo0kbd4i6ulaotscujif5.apps.googleusercontent.com');
doc.text('Use Google Sign-In SDK to get tokenId, then POST to /api/auth/google.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('4. Error Responses');
doc.font('Helvetica').text('All errors return: { "message": "Error description" }');
doc.text('Messages are translated based on Accept-Language header.');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('5. File Uploads');
doc.font('Helvetica').text('Use Content-Type: multipart/form-data for image/video uploads.');
doc.text('Image max: 10MB | Video max: 100MB');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').text('6. Axios Setup Example');
doc.moveDown(0.3);
doc.fontSize(9).font('Courier').fillColor('#2c3e50');
doc.text('// Set language globally');
doc.text('axios.defaults.headers.common["Accept-Language"] = "ar";');
doc.text('');
doc.text('// Set auth token globally');
doc.text('axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;');
doc.fillColor('#000000').font('Helvetica');

// Finalize
doc.end();
console.log('PDF Generated Successfully as FRONTEND_API_GUIDE.pdf');
