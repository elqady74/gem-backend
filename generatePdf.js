const fs = require('fs');
const PDFDocument = require('pdfkit');

// Create a document
const doc = new PDFDocument({ margin: 50 });

// Pipe its output somewhere, like to a file or HTTP response
doc.pipe(fs.createWriteStream('API_Documentation.pdf'));

// Basic Info
doc.fontSize(20).text('GEM Backend API Documentation', { align: 'center' });
doc.fontSize(12).moveDown().text('Base URL: https://gem-backend-production.up.railway.app');
doc.moveDown();
doc.text('Note: If "Auth Required" is mentioned, you must send a token in the headers:');
doc.text('Authorization: Bearer <your_token>');
doc.moveDown(2);

// Function to add endpoints
function addEndpoint(method, path, auth, desc, body) {
    doc.fontSize(14).font('Helvetica-Bold').text(`[${method}] ${path}`);
    doc.fontSize(12).font('Helvetica').text(`Auth Required: ${auth}`);
    doc.text(`Description: ${desc}`);
    if (body) {
        doc.text('Body (JSON):');
        doc.fontSize(10).font('Courier').text(body, { indent: 20 });
        doc.fontSize(12).font('Helvetica');
    }
    doc.moveDown();
}

// 1. Auth
doc.fontSize(16).font('Helvetica-Bold').text('1. Authentication (Auth)').moveDown(0.5);
addEndpoint('POST', '/api/auth/register', 'No', 'Register a new user', '{\n  "name": "Ahmed",\n  "email": "ahmed@test.com",\n  "password": "123"\n}');
addEndpoint('POST', '/api/auth/login', 'No', 'Login and get Token', '{\n  "email": "ahmed@test.com",\n  "password": "123"\n}');
addEndpoint('POST', '/api/auth/google', 'No', 'Login via Google', '{\n  "tokenId": "Google_Token_Here"\n}');
addEndpoint('GET', '/api/auth/me', 'Yes', 'Get current logged-in user profile details', null);

// 2. Forgot Password
doc.fontSize(16).font('Helvetica-Bold').text('2. Forgot Password Flow').moveDown(0.5);
addEndpoint('POST', '/api/auth/forgot-password', 'No', 'Send OTP to User Email', '{\n  "email": "ahmed@test.com"\n}');
addEndpoint('POST', '/api/auth/verify-reset-code', 'No', 'Verify OTP', '{\n  "email": "ahmed@test.com",\n  "code": "123456"\n}');
addEndpoint('POST', '/api/auth/reset-password', 'No', 'Set New Password', '{\n  "email": "ahmed@test.com",\n  "code": "123456",\n  "newPassword": "newPass123"\n}');

// 3. AI Chatbot
doc.fontSize(16).font('Helvetica-Bold').text('3. AI Chatbot').moveDown(0.5);
addEndpoint('POST', '/api/ai/ask', 'Yes', 'Ask the AI Chatbot a question', '{\n  "question": "من هو رمسيس الثاني؟"\n}');
addEndpoint('GET', '/api/ai/chats', 'Yes', 'Get full chat history of the user', null);

// 4. Artifacts & Video
doc.fontSize(16).font('Helvetica-Bold').text('4. Artifacts (Including Video & 3D)').moveDown(0.5);
addEndpoint('GET', '/api/artifacts', 'No', 'Get all artifacts (includes videoUrl, model3DUrl, audioUrl)', null);
addEndpoint('GET', '/api/artifacts/:id', 'No', 'Get a single artifact by its ID', null);
addEndpoint('POST', '/api/artifacts', 'Yes (Admin)', 'Create new artifact', '{\n  "name": "Sword",\n  "description": "Ancient sword",\n  "videoUrl": "https://example.com/video.mp4",\n  "model3DUrl": "...",\n  "audioUrl": "..."\n}');

// 5. Favorites
doc.fontSize(16).font('Helvetica-Bold').text('5. Favorites').moveDown(0.5);
addEndpoint('POST', '/api/favorites', 'Yes', 'Add artifact to favorites', '{\n  "artifactId": "60c72b1234567890"\n}');
addEndpoint('GET', '/api/favorites', 'Yes', 'Get my favorite artifacts', null);
addEndpoint('DELETE', '/api/favorites/:id', 'Yes', 'Remove artifact from favorites', null);

// 6. Events
doc.fontSize(16).font('Helvetica-Bold').text('6. Events').moveDown(0.5);
addEndpoint('GET', '/api/events', 'No', 'Get all events', null);
addEndpoint('POST', '/api/events', 'Yes (Admin)', 'Create a new event', '{\n  "title": "Museum Opening",\n  "description": "Big event",\n  "date": "2026-05-01"\n}');

// Finalize PDF file
doc.end();
console.log('PDF Generated Successfully as API_Documentation.pdf');
