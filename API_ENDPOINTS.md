# 🏛️ GEM Backend — Complete API Endpoints

Base URL (Production): `https://gem-backend-production-1ea2.up.railway.app/api`
Base URL (Local): `http://localhost:5000/api`

> **IMPORTANT:**
> - All protected routes require: `Authorization: Bearer <token>`
> - Default content type: `application/json` (unless stated `multipart/form-data`)
> - Multi-language: `Accept-Language: ar` header or `?lang=ar` query

---

## 🔐 1. Authentication & Users (`/auth`)

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **POST** | `/auth/register` | Create new account | `{name, email, password}` | No |
| **POST** | `/auth/login` | Login → JWT token | `{email, password}` | No |
| **POST** | `/auth/google` | Google OAuth login | `{tokenId}` | No |
| **POST** | `/auth/forgot-password` | Send 6-digit OTP to email | `{email}` | No |
| **POST** | `/auth/verify-reset-code` | Verify the 6-digit OTP | `{email, code}` | No |
| **POST** | `/auth/reset-password` | Set new password with OTP | `{email, code, newPassword}` | No |
| **GET** | `/auth/me` | Get current user profile | — | Yes |
| **PUT** | `/auth/me` | Update profile (name, avatar, language, password) | `{name?, avatar?, language?, oldPassword?, newPassword?}` — also accepts `multipart/form-data` with `avatar` file | Yes |
| **POST** | `/auth/me/avatar` | Upload avatar image to Cloudinary | `multipart/form-data` → field: `avatar` (max 5MB) | Yes |
| **PUT** | `/auth/make-admin/:id` | Promote user to admin | — | Yes (Admin) |

---

## 🏺 2. Artifacts (`/artifacts`)

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **GET** | `/artifacts` | Get all artifacts | — | No |
| **GET** | `/artifacts/:id` | Get single artifact by ID | — | No |
| **POST** | `/artifacts` | Create artifact | `{name, description, era, imageUrl, model3DUrl, audioUrl, videoUrl, ...}` | Yes (Admin) |
| **POST** | `/artifacts/bulk-upload` | Bulk create artifacts from Excel | `multipart/form-data` → field: `file` | Yes (Admin) |
| **PUT** | `/artifacts/:id` | Update artifact | `{name?, description?, imageUrl?, ...}` | Yes (Admin) |
| **DELETE** | `/artifacts/:id` | Delete artifact | — | Yes (Admin) |

---

## ❤️ 3. Favorites (`/favorites`)

> **TIP:** `itemId` can be a MongoDB ObjectId **or** a static frontend string like `tut-mask-1`.
> `type` defaults to `"Artifact"` if omitted. Valid values: `Artifact`, `Event`.

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **POST** | `/favorites/:itemId` | Add item to favorites | `{type?: "Artifact"|"Event"}` | Yes |
| **POST** | `/favorites/toggle/:itemId` | Toggle favorite (add/remove in 1 call) | `{type?: "Artifact"|"Event"}` | Yes |
| **GET** | `/favorites/my` | Get user's favorites (populated) | `?type=Artifact|Event` (optional) | Yes |
| **GET** | `/favorites/count` | Get favorites count | `?type=Artifact|Event` (optional) | Yes |
| **GET** | `/favorites/check/:itemId` | Check if item is favorited | `?type=Artifact|Event` (optional) | Yes |
| **DELETE** | `/favorites/:itemId` | Remove from favorites | `?type=Artifact|Event` (optional) | Yes |

---

## 🎭 4. Events (`/events`)

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **GET** | `/events` | Get all events (sorted by date) | — | No |
| **POST** | `/events` | Create event | `{title, description, date, imageUrl, location}` | Yes (Admin) |
| **PUT** | `/events/:id` | Update event | `{title?, description?, date?, imageUrl?, location?}` | Yes (Admin) |
| **DELETE** | `/events/:id` | Delete event | — | Yes (Admin) |

---

## 🎫 5. Bookings & Payments (`/bookings`)

> **NOTE:** Prices are loaded dynamically from Settings collection. Tax rate defaults to 14%.
> Payment is processed through Paymob gateway.

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **POST** | `/bookings/checkout` | Create booking + Paymob checkout URL | `{visitDate, nationalityType, tickets: [{category, quantity}], billingData?}` | Yes |
| **POST** | `/bookings/verify-payment` | Verify Paymob payment | `{orderId, transactionId}` | Yes |
| **POST** | `/bookings/webhook` | Paymob transaction callback (HMAC verified) | Paymob payload (automatic) | No |
| **GET** | `/bookings/my-bookings` | Get user's booking history | — | Yes |
| **GET** | `/bookings/:id` | Get single booking details | — | Yes |
| **GET** | `/bookings` | Get all bookings (Admin) | — | Yes (Admin) |

---

## 🤖 6. AI Features (`/ai`)

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **POST** | `/ai/ask` | Ask GEM Chatbot | `{question}` | Yes |
| **GET** | `/ai/chats` | Get user's chat history | — | Yes |
| **POST** | `/ai/detect` | AI artifact detection (camera/upload) | `multipart/form-data` → field: `image` | Yes |
| **GET** | `/ai/detections` | Get user's detection history | — | Yes |
| **POST** | `/ai/story-to-image` | Generate pharaonic image from text | `{story}` | Yes |
| **POST** | `/ai/name-to-cartouche` | Convert name to hieroglyphic cartouche | `{name}` | Yes |
| **POST** | `/ai/photo-to-pharaoh` | Transform selfie to pharaoh/queen | `multipart/form-data` → field: `image` | Yes |
| **POST** | `/ai/text-to-speech` | Full pipeline: detect + story + audio (MP3) | `multipart/form-data` → field: `image`, optional `language` (`ar`|`en`) | Yes |
| **POST** | `/ai/image-to-3d` | Image → 3D model (Placeholder — coming soon) | `multipart/form-data` → field: `image` | Yes |

---

## 📤 7. Upload (`/upload`)

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **POST** | `/upload/video` | Upload video to Cloudinary (max 100MB) | `multipart/form-data` → field: `video`, optional `title` | No |

---

## 🎬 8. Videos (`/videos`)

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **GET** | `/videos` | Get all museum videos | — | No |
| **POST** | `/videos/add` | Add video record | `{title, public_id, url, duration?}` | No |

---

## 🌐 9. Language & Translations (`/lang`)

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **GET** | `/lang` | Get translations (auto-detect from `Accept-Language` header) | `?lang=ar` (optional) | No |
| **GET** | `/lang/:locale` | Get translations for specific locale (e.g. `/lang/ar`) | — | No |
| **GET** | `/lang/all/translations` | Get all supported languages and translations | — | No |

---

## ⚙️ 10. Public Settings (`/settings`)

| Method | Endpoint | Description | Body / Query | Auth |
|--------|----------|-------------|--------------|------|
| **GET** | `/settings` | Get global museum settings (ticket prices, hours, etc.) | — | No |

---

## 🛡️ 11. Admin Dashboard (`/admin`)

> **WARNING:** All endpoints below require **Admin Token** (`Authorization: Bearer <admin_token>`).

### 📊 Dashboard Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/admin/stats` | Full dashboard: users, bookings, revenue, artifacts, events, AI, videos, favorites |

### 👥 User Management

| Method | Endpoint | Description | Body / Query |
|--------|----------|-------------|--------------|
| **GET** | `/admin/users` | List all users (paginated) | `?page, limit, search, role, banned` |
| **GET** | `/admin/users/:id` | Get single user details | — |
| **PUT** | `/admin/users/:id` | Update user info | `{name?, role?}` |
| **DELETE** | `/admin/users/:id` | Delete user | — |
| **PUT** | `/admin/users/:id/ban` | Toggle ban/unban user | — |
| **GET** | `/admin/users/:id/activity` | Get user activity (bookings, chats, detections, favorites) | — |

### 🎫 Booking Management

| Method | Endpoint | Description | Body / Query |
|--------|----------|-------------|--------------|
| **GET** | `/admin/bookings` | List all bookings (paginated) | `?page, limit, status, nationality, dateFrom, dateTo` |
| **GET** | `/admin/bookings/:id` | Get single booking | — |
| **PUT** | `/admin/bookings/:id/status` | Update booking status | `{status: "pending"|"paid"|"cancelled"|"failed"}` |
| **GET** | `/admin/bookings-revenue` | Revenue report | `?period=daily|weekly|monthly` |

### 🤖 AI Management

| Method | Endpoint | Description | Body / Query |
|--------|----------|-------------|--------------|
| **GET** | `/admin/ai/chats` | List all AI chats (paginated) | `?page, limit, search, userId` |
| **GET** | `/admin/ai/detections` | List all AI detections (paginated) | `?page, limit, artifact, userId` |
| **DELETE** | `/admin/ai/chats/:id` | Delete a chat record | — |

### 📋 Activity Logs

| Method | Endpoint | Description | Body / Query |
|--------|----------|-------------|--------------|
| **GET** | `/admin/logs` | View admin activity logs (paginated) | `?page, limit, action, adminId, targetModel, dateFrom, dateTo` |

### ⚙️ Settings

| Method | Endpoint | Description | Body / Query |
|--------|----------|-------------|--------------|
| **GET** | `/admin/settings` | Get global settings | — |
| **PUT** | `/admin/settings` | Update global settings | `{ticketPrices?, addons?, taxRate?, maxBookingsPerDay?, maintenanceMode?, museumOpenTime?, museumCloseTime?}` |

### 🔔 Notifications

| Method | Endpoint | Description | Body / Query |
|--------|----------|-------------|--------------|
| **POST** | `/admin/notifications/send` | Send notification (to user or broadcast) | `{title, message, type?: "info"|"warning"|"promo"|"system", recipientId?}` |
| **GET** | `/admin/notifications` | Get sent notifications (paginated) | `?page, limit, type, broadcast=true` |

---

## 📊 Summary

| Section | Route File | Mount Point | Total Endpoints |
|---------|-----------|-------------|-----------------|
| Auth & Users | `routes/auth.js` | `/api/auth` | 10 |
| Artifacts | `routes/artifacts.js` | `/api/artifacts` | 5 |
| Favorites | `routes/favorites.js` | `/api/favorites` | 6 |
| Events | `routes/events.js` | `/api/events` | 4 |
| Bookings & Payments | `routes/bookings.js` | `/api/bookings` | 6 |
| AI Features | `routes/ai.js` | `/api/ai` | 9 |
| Upload | `routes/upload.js` | `/api/upload` | 1 |
| Videos | `routes/videos.js` | `/api/videos` | 2 |
| Language | `routes/lang.js` | `/api/lang` | 3 |
| Public Settings | `routes/settings.js` | `/api/settings` | 1 |
| Admin Dashboard | `routes/admin.js` | `/api/admin` | 17 |
| **Total** | | | **64** |
