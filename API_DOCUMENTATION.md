# GEM Backend — API Documentation for Frontend
# Base URL: https://gem-backend-production-cb6d.up.railway.app

---

## 🔐 Authentication Headers

All endpoints marked with 🔒 require:
```
Authorization: Bearer <token>
```
All endpoints marked with 👑 require admin role + auth token.

---

## 1. Auth APIs (`/api/auth`)

### Register
```
POST /api/auth/register
```
```json
Body: { "name": "Ahmed", "email": "ahmed@email.com", "password": "123456" }
Response: { "message": "User registered successfully" }
```
> ℹ️ Same name allowed for multiple users. Email must be unique.

### Login
```
POST /api/auth/login
```
```json
Body: { "email": "ahmed@email.com", "password": "123456" }
Response: { "token": "eyJhbGci..." }
```

### Google Login
```
POST /api/auth/google
```
```json
Body: { "tokenId": "google_id_token_here" }
Response: { "token": "eyJhbGci..." }
```

### Get Current User 🔒
```
GET /api/auth/me
```
```json
Response: { "_id": "...", "name": "Ahmed", "email": "...", "avatar": "...", "language": "en", "role": "user" }
```

### Update Profile 🔒
```
PUT /api/auth/me
```
```json
Body (all optional):
{
  "name": "New Name",
  "avatar": "https://image-url.com/photo.jpg",
  "language": "ar",
  "oldPassword": "current_pass",
  "newPassword": "new_pass_min6"
}
Response: { "message": "Profile updated successfully", "user": { ... } }
```

### Forgot Password (Send OTP)
```
POST /api/auth/forgot-password
```
```json
Body: { "email": "ahmed@email.com" }
Response: { "message": "Reset code sent to email" }
```

### Verify OTP Code
```
POST /api/auth/verify-reset-code
```
```json
Body: { "email": "ahmed@email.com", "code": "123456" }
Response: { "message": "Code verified successfully! You can now reset your password." }
```

### Reset Password
```
POST /api/auth/reset-password
```
```json
Body: { "email": "ahmed@email.com", "code": "123456", "newPassword": "newpass123" }
Response: { "message": "Password updated successfully" }
```

### Make Admin 🔒👑
```
PUT /api/auth/make-admin/:userId
```

---

## 2. Artifacts APIs (`/api/artifacts`)

### Get All Artifacts (Public)
```
GET /api/artifacts
```

### Get Single Artifact (Public)
```
GET /api/artifacts/:id
```

### Create Artifact 🔒👑
```
POST /api/artifacts
```
```json
Body: { "name": "Tutankhamun Mask", "description": "...", "era": "New Kingdom", "imageUrl": "...", "model3DUrl": "...", "audioUrl": "...", "videoUrl": "..." }
```

### Update Artifact 🔒👑
```
PUT /api/artifacts/:id
```

### Delete Artifact 🔒👑
```
DELETE /api/artifacts/:id
```

---

## 3. Events APIs (`/api/events`)

### Get All Events (Public)
```
GET /api/events
```

### Create Event 🔒👑
```
POST /api/events
```
```json
Body: { "title": "Night Tour", "description": "...", "date": "2026-05-01", "imageUrl": "..." }
```

### Delete Event 🔒👑
```
DELETE /api/events/:id
```

---

## 4. Favorites APIs (`/api/favorites`)

> Supports both **Artifacts** and **Events**. Pass `type` = `"Artifact"` or `"Event"`.
> If `type` is omitted, defaults to `"Artifact"`.

### Toggle Favorite (Recommended) 🔒
```
POST /api/favorites/toggle/:itemId
```
```json
Body: { "type": "Artifact" }   // or "Event"
Response: { "isFavorited": true, "message": "Added to favorites" }
         { "isFavorited": false, "message": "Removed from favorites" }
```

### Check if Favorited 🔒
```
GET /api/favorites/check/:itemId?type=Artifact
```
```json
Response: { "isFavorited": true }
```

### Get My Favorites 🔒
```
GET /api/favorites/my                 ← all favorites
GET /api/favorites/my?type=Artifact   ← artifacts only
GET /api/favorites/my?type=Event      ← events only
```

### Get Favorites Count 🔒
```
GET /api/favorites/count
GET /api/favorites/count?type=Artifact
```

### Add to Favorites 🔒
```
POST /api/favorites/:itemId
Body: { "type": "Artifact" }
```

### Remove from Favorites 🔒
```
DELETE /api/favorites/:itemId?type=Artifact
```

---

## 5. Booking & Payment APIs (`/api/bookings`)

### Ticket Prices (EGP)
| Nationality | Adult | Child | Student |
|-------------|-------|-------|---------|
| Egyptian    | 200   | 100   | 100     |
| Arab        | 1450  | 730   | —       |
| Expatriate  | 730   | 370   | —       |

### Create Checkout Session 🔒
```
POST /api/bookings/checkout
```
```json
Body:
{
  "visitDate": "2026-12-01",
  "nationalityType": "egyptian",
  "tickets": [
    { "category": "adult", "quantity": 2 },
    { "category": "student", "quantity": 1 }
  ],
  "billingData": {
    "first_name": "Ahmed",
    "last_name": "User",
    "email": "ahmed@test.com",
    "phone_number": "+201234567890"
  }
}
Response:
{
  "bookingId": "...",
  "subtotal": 500,
  "tax": 70,
  "total": 570,
  "currency": "EGP",
  "paymobOrderId": "...",
  "paymentKey": "...",
  "checkoutUrl": "https://accept.paymob.com/..."
}
```

### Verify Payment 🔒
```
POST /api/bookings/verify-payment
```
```json
Body: { "orderId": "paymob_order_id", "transactionId": "optional" }
```

### Get My Bookings 🔒
```
GET /api/bookings/my-bookings
```

### Get Booking Details 🔒
```
GET /api/bookings/:id
```

### Get All Bookings 🔒👑
```
GET /api/bookings/
```

### Webhook (Paymob callback — no auth)
```
POST /api/bookings/webhook
```

---

## 6. AI Feature APIs (`/api/ai`)

### Chat Bot (AI Guide) 🔒
```
POST /api/ai/ask
```
```json
Body: { "question": "Tell me about the pyramids" }
Response: { "answer": "The pyramids of Giza..." }
```

### Get Chat History 🔒
```
GET /api/ai/chats
```

### Artifact Detection (Camera/Upload) 🔒
```
POST /api/ai/detect
Content-Type: multipart/form-data
Field: image (file)
```
```json
Response: { "detected": "Tutankhamun Mask", "confidence": 0.95, "artifact": { ... }, "rawResult": { ... } }
```

### Story to Image (AI Imagination) 🔒
```
POST /api/ai/story-to-image
```
```json
Body: { "story": "A pharaoh walking in a golden palace..." }
Response: { "image": "data:image/png;base64,...", "format": "base64" }
```

### Name to Cartouche (Name Translator) 🔒
```
POST /api/ai/name-to-cartouche
```
```json
Body: { "name": "Ahmed" }
Response: { "name": "Ahmed", "cartouche": "image_url_or_base64", "rawResult": [...] }
```

### Photo to Pharaoh (Pharaoh Transformer) 🔒
```
POST /api/ai/photo-to-pharaoh
Content-Type: multipart/form-data
Field: image (file)
```
```json
Response: { "pharaohImage": "data:image/png;base64,...", "format": "base64" }
```

### Text to Speech 🔒
```
POST /api/ai/text-to-speech
```
```json
Body: { "statueId": "1", "language": "ar" }
Response: { "info": "...", "text": "...", "audioUrl": "..." }
```

### Image to 3D (Coming Soon) 🔒
```
POST /api/ai/image-to-3d
Content-Type: multipart/form-data
Field: image (file)
Response: { "message": "Image-to-3D feature is coming soon", "status": "placeholder" }
```

---

## 7. Videos APIs (`/api/videos`)

### Get All Videos (Public)
```
GET /api/videos
```

### Add Video
```
POST /api/videos/add
```
```json
Body: { "title": "Tour Video", "public_id": "...", "url": "https://...", "duration": 120 }
```

---

## 8. Upload APIs (`/api/upload`)

### Upload Video (Cloudinary)
```
POST /api/upload/video
Content-Type: multipart/form-data
Fields: video (file), title (text)
```

---

## 📱 Frontend Screen → API Mapping

| Screen | API(s) Used |
|--------|-------------|
| Landing page | Static — no API |
| Login | `POST /api/auth/login` |
| Register | `POST /api/auth/register` |
| Home | `GET /api/artifacts` + `GET /api/events` |
| AI Guide / Chat bot | `POST /api/ai/ask` + `GET /api/ai/chats` |
| AI Imagination | `POST /api/ai/story-to-image` |
| About us | Static — no API |
| Ancient-arts / Collection | `GET /api/artifacts` |
| Artifact-show | `GET /api/artifacts/:id` |
| Cookie-Settings | Frontend only — no API |
| Edit-profile | `PUT /api/auth/me` |
| Feedback / Get in touch | ⚠️ No API — frontend-only or needs implementation |
| Kids-Museum | `GET /api/artifacts` (filtered by frontend) |
| Name-Translator | `POST /api/ai/name-to-cartouche` |
| Pharaoh-Transformer | `POST /api/ai/photo-to-pharaoh` |
| Privacy-policy | Static — no API |
| Profile | `GET /api/auth/me` |
| Term-of-Service | Static — no API |
| Advanced 3D Model | `POST /api/ai/image-to-3d` (placeholder) |
| Artifact Identifier | `POST /api/ai/detect` |
| Booking / Plan-your-visit | `POST /api/bookings/checkout` |
| Change password | `PUT /api/auth/me` (with oldPassword/newPassword) |
| Code send | `POST /api/auth/forgot-password` |
| Reset the password | `POST /api/auth/reset-password` |
| Reset complete / Success | Frontend-only success screens |
| Event | `GET /api/events` |
| Fav / Collection | `GET /api/favorites/my` + toggle endpoints |
| Footer | Static — no API |
| Payment | `POST /api/bookings/checkout` → redirect to `checkoutUrl` |
| Setting | `PUT /api/auth/me` (language) |
| Shop | ⚠️ No API — needs implementation if needed |
| Visitor help | Can use `POST /api/ai/ask` or static |
