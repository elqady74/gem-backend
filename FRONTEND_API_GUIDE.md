# 📘 GEM Backend — Full API Reference (Frontend Guide)

> **Base URL:** `http://localhost:5000` (dev) or your production URL
>
> **اللغة:** ابعت `Accept-Language: ar` في الهيدر → كل الرسائل بالعربي. الديفولت إنجليزي.

---

## 🔐 Auth — `/api/auth`

### 1. Register
```
POST /api/auth/register
```
**Body:**
```json
{
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "password": "123456"
}
```
**Response (201):**
```json
{ "message": "User registered successfully" }
```

---

### 2. Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "ahmed@example.com",
  "password": "123456"
}
```
**Response (200):**
```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

---

### 3. Google Login
```
POST /api/auth/google
```
**Body:**
```json
{
  "tokenId": "GOOGLE_ID_TOKEN_FROM_FRONTEND"
}
```
> الفرونت يستخدم Google Sign-In SDK ويبعت الـ `tokenId` اللي بيرجع من جوجل.
>
> **Google Client ID:** `322457229349-1riijja3taalo0kbd4i6ulaotscujif5.apps.googleusercontent.com`

**Response (200):**
```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

---

### 4. Forgot Password (Send OTP)
```
POST /api/auth/forgot-password
```
**Body:**
```json
{ "email": "ahmed@example.com" }
```
**Response (200):**
```json
{ "message": "Reset code sent to email" }
```

---

### 5. Verify OTP Code
```
POST /api/auth/verify-reset-code
```
**Body:**
```json
{
  "email": "ahmed@example.com",
  "code": "123456"
}
```
**Response (200):**
```json
{ "message": "Code verified successfully! You can now reset your password." }
```

---

### 6. Reset Password
```
POST /api/auth/reset-password
```
**Body:**
```json
{
  "email": "ahmed@example.com",
  "code": "123456",
  "newPassword": "newpass123"
}
```
**Response (200):**
```json
{ "message": "Password updated successfully" }
```

---

### 7. Get Current User 🔒
```
GET /api/auth/me
Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "_id": "...",
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "avatar": "",
  "language": "en",
  "role": "user",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### 8. Update Profile 🔒
```
PUT /api/auth/me
Authorization: Bearer <token>
```
**Body (كل الحقول اختيارية):**
```json
{
  "name": "Ahmed Updated",
  "avatar": "https://...",
  "language": "ar",
  "oldPassword": "123456",
  "newPassword": "newpass123"
}
```
**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

---

### 9. Make Admin 🔒 (Admin Only)
```
PUT /api/auth/make-admin/:userId
Authorization: Bearer <admin_token>
```

---

## 🏛️ Artifacts — `/api/artifacts`

### 1. Get All Artifacts
```
GET /api/artifacts
```
**Response (200):**
```json
[
  {
    "_id": "...",
    "name": "Sphinx",
    "description": "...",
    "era": "Old Kingdom",
    "imageUrl": "...",
    "model3DUrl": "...",
    "audioUrl": "...",
    "videoUrl": "..."
  }
]
```

---

### 2. Get Single Artifact
```
GET /api/artifacts/:id
```

---

### 3. Create Artifact 🔒 (Admin Only)
```
POST /api/artifacts
Authorization: Bearer <admin_token>
```
**Body:**
```json
{
  "name": "Sphinx",
  "description": "The Great Sphinx of Giza",
  "era": "Old Kingdom",
  "imageUrl": "https://...",
  "model3DUrl": "https://...",
  "audioUrl": "https://...",
  "videoUrl": "https://..."
}
```

---

### 4. Update Artifact 🔒 (Admin Only)
```
PUT /api/artifacts/:id
Authorization: Bearer <admin_token>
```

### 5. Delete Artifact 🔒 (Admin Only)
```
DELETE /api/artifacts/:id
Authorization: Bearer <admin_token>
```

---

## 🤖 AI Features — `/api/ai`

### 1. AI Chat 🔒
```
POST /api/ai/ask
Authorization: Bearer <token>
```
**Body:**
```json
{ "question": "ما هو أبو الهول؟" }
```
**Response (200):**
```json
{ "answer": "أبو الهول هو تمثال..." }
```

---

### 2. Get Chat History 🔒
```
GET /api/ai/chats
Authorization: Bearer <token>
```

---

### 3. Artifact Detection (Camera) 🔒
```
POST /api/ai/detect
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Body:** `image` (file - max 10MB)

**Response (200):**
```json
{
  "detected": "Sphinx",
  "confidence": 0.95,
  "artifact": { ... },
  "rawResult": { ... }
}
```

---

### 4. Get Detection History 🔒
```
GET /api/ai/detections
Authorization: Bearer <token>
```

---

### 5. Story → Image 🔒
```
POST /api/ai/story-to-image
Authorization: Bearer <token>
```
**Body:**
```json
{ "story": "ملك فرعوني يقف أمام الأهرامات" }
```
**Response (200):**
```json
{
  "image": "data:image/png;base64,...",
  "format": "base64"
}
```

---

### 6. Name → Cartouche 🔒
```
POST /api/ai/name-to-cartouche
Authorization: Bearer <token>
```
**Body:**
```json
{ "name": "Ahmed" }
```
**Response (200):**
```json
{
  "name": "Ahmed",
  "cartouche": "https://...",
  "rawResult": [...]
}
```

---

### 7. Photo → Pharaoh 🔒
```
POST /api/ai/photo-to-pharaoh
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Body:** `image` (file)

**Response (200):**
```json
{
  "pharaohImage": "data:image/png;base64,...",
  "format": "base64"
}
```

---

### 8. Text-to-Speech 🔒
```
POST /api/ai/text-to-speech
Authorization: Bearer <token>
```
**Body:**
```json
{
  "statueId": "1",
  "language": "ar"
}
```
**Response (200):**
```json
{
  "info": "...",
  "text": "النص المقروء...",
  "audioUrl": "https://..."
}
```

---

### 9. Image → 3D Model 🔒 (Coming Soon)
```
POST /api/ai/image-to-3d
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Body:** `image` (file)

---

## 🎟️ Bookings — `/api/bookings`

### Ticket Prices (EGP)

| Nationality | Adult | Child | Student |
|-------------|-------|-------|---------|
| egyptian | 200 | 100 | 100 |
| arab | 1450 | 730 | — |
| expatriate | 730 | 370 | — |

### 1. Create Checkout Session 🔒
```
POST /api/bookings/checkout
Authorization: Bearer <token>
```
**Body:**
```json
{
  "visitDate": "2026-05-15",
  "nationalityType": "egyptian",
  "tickets": [
    { "category": "adult", "quantity": 2 },
    { "category": "child", "quantity": 1 }
  ],
  "billingData": {
    "email": "ahmed@example.com",
    "first_name": "Ahmed",
    "last_name": "Ali",
    "phone_number": "+201234567890"
  }
}
```
**Response (200):**
```json
{
  "bookingId": "...",
  "subtotal": 500,
  "tax": 70,
  "total": 570,
  "currency": "EGP",
  "paymobOrderId": "...",
  "paymentKey": "...",
  "checkoutUrl": "https://accept.paymob.com/api/acceptance/iframes/..."
}
```

---

### 2. Verify Payment 🔒
```
POST /api/bookings/verify-payment
Authorization: Bearer <token>
```
**Body:**
```json
{
  "orderId": "PAYMOB_ORDER_ID",
  "transactionId": "TRANSACTION_ID"
}
```

---

### 3. Get My Bookings 🔒
```
GET /api/bookings/my-bookings
Authorization: Bearer <token>
```

---

### 4. Get Booking Details 🔒
```
GET /api/bookings/:id
Authorization: Bearer <token>
```

---

### 5. Get All Bookings 🔒 (Admin Only)
```
GET /api/bookings
Authorization: Bearer <admin_token>
```

---

### 6. Paymob Webhook (Server-to-Server)
```
POST /api/bookings/webhook
```
> يُستدعى تلقائياً من Paymob — مش محتاج الفرونت يستخدمه.

---

## 📅 Events — `/api/events`

### 1. Get All Events
```
GET /api/events
```
**Response (200):**
```json
[
  {
    "_id": "...",
    "title": "Night at the Museum",
    "description": "...",
    "date": "2026-06-01T00:00:00.000Z",
    "imageUrl": "https://..."
  }
]
```

---

### 2. Create Event 🔒 (Admin Only)
```
POST /api/events
Authorization: Bearer <admin_token>
```
**Body:**
```json
{
  "title": "Night at the Museum",
  "description": "Special event...",
  "date": "2026-06-01",
  "imageUrl": "https://..."
}
```

---

### 3. Delete Event 🔒 (Admin Only)
```
DELETE /api/events/:id
Authorization: Bearer <admin_token>
```

---

## ❤️ Favorites — `/api/favorites`

> `type` = `"Artifact"` أو `"Event"`. الديفولت: `"Artifact"`

### 1. Add to Favorites 🔒
```
POST /api/favorites/:itemId
Authorization: Bearer <token>
```
**Body:**
```json
{ "type": "Artifact" }
```

---

### 2. Get My Favorites 🔒
```
GET /api/favorites/my
GET /api/favorites/my?type=Artifact
GET /api/favorites/my?type=Event
Authorization: Bearer <token>
```

---

### 3. Get Favorites Count 🔒
```
GET /api/favorites/count
GET /api/favorites/count?type=Artifact
Authorization: Bearer <token>
```
**Response:**
```json
{ "count": 5 }
```

---

### 4. Check if Favorited 🔒
```
GET /api/favorites/check/:itemId?type=Artifact
Authorization: Bearer <token>
```
**Response:**
```json
{ "isFavorited": true }
```

---

### 5. Toggle Favorite 🔒
```
POST /api/favorites/toggle/:itemId
Authorization: Bearer <token>
```
**Body:**
```json
{ "type": "Artifact" }
```
**Response:**
```json
{ "isFavorited": true, "message": "Added to favorites" }
```

---

### 6. Remove from Favorites 🔒
```
DELETE /api/favorites/:itemId?type=Artifact
Authorization: Bearer <token>
```

---

## 📹 Videos — `/api/videos`

### 1. Get All Videos
```
GET /api/videos
```

### 2. Add Video
```
POST /api/videos/add
```
**Body:**
```json
{
  "title": "Museum Tour",
  "public_id": "gema_videos/abc123",
  "url": "https://res.cloudinary.com/...",
  "duration": 120
}
```

---

## ☁️ Upload — `/api/upload`

### Upload Video (Cloudinary)
```
POST /api/upload/video
Content-Type: multipart/form-data
```
**Body:** `video` (file - max 100MB) + `title` (text)

---

## 🌐 Language / Translations — `/api/lang`

### 1. Get All Translations
```
GET /api/lang/all/translations
```
**Response:**
```json
{
  "supported": ["en", "ar"],
  "default": "en",
  "translations": {
    "en": { "server_error": "Server error", "..." },
    "ar": { "server_error": "خطأ في الخادم", "..." }
  }
}
```

### 2. Get Translations by Language
```
GET /api/lang/ar
GET /api/lang/en
```

### 3. Get Translations by Header
```
GET /api/lang
Accept-Language: ar
```

---

## 🔑 ملاحظات مهمة للفرونت

1. **🔒 = محتاج Token** — ابعت في الهيدر: `Authorization: Bearer <token>`
2. **اللغة** — ابعت `Accept-Language: ar` لرسائل بالعربي
3. **Google Login Client ID:** `322457229349-1riijja3taalo0kbd4i6ulaotscujif5.apps.googleusercontent.com`
4. **Error Response** دايماً بالشكل ده:
```json
{ "message": "Error message here" }
```
5. **ملفات (Images/Videos)** — ابعتها كـ `multipart/form-data`
