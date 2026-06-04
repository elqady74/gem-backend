# 🏛 Tutora – Your AI Tour Guide to the Grand Egyptian Museum
# 🏛 Tutora – Your AI Tour Guide to the Grand Egyptian Museum

<p align="center">
  <strong>Your Intelligent Tour Guide to the Grand Egyptian Museum</strong>
</p>

<p align="center">
  Built to enhance museum experiences through Artificial Intelligence,
  Smart Booking, Interactive Exploration, and Digital Heritage Preservation.
</p>

---

<p align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-REST_API-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Secured-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Google Auth](https://img.shields.io/badge/Google_Auth-Enabled-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_Storage-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-Deployed-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

</p>

---

## 📖 Overview

**Tutora** is an AI-powered digital platform developed for the **Grand Egyptian Museum (GEM)**.

The platform provides visitors with a complete digital museum experience through:

- 🤖 AI Museum Guide
- 🎟 Smart Ticket Booking
- ❤️ Favorites System
- 🏺 Artifact Exploration
- 🎥 Interactive Media Experience
- 📅 Event Discovery
- 👤 User Profiles
- 🔐 Secure Authentication
- 🌍 Multilingual Support
- 💳 Online Payments

The backend is built using modern technologies and follows RESTful API architecture principles.

---

## ✨ Features

### 🔐 Authentication & Authorization

- User Registration
- User Login
- JWT Authentication
- Google Authentication
- Protected Routes
- Role-Based Authorization

### 👤 User Management

- User Profiles
- Profile Updates
- Profile Image Upload
- Cloudinary Integration

### 🎟 Booking System

- Museum Ticket Booking
- Dynamic Ticket Calculation
- Booking History
- Payment Status Tracking

### 💳 Payment Integration

- Secure Payment Processing
- Booking Verification
- Paid / Pending Status Tracking

### ❤️ Favorites System

- Add Favorite Items
- Remove Favorites
- Retrieve Saved Items

### 📅 Events Management

- View Events
- Create Events
- Update Events
- Delete Events

### 🎥 Media Management

- Video Upload Support
- Cloudinary Storage
- Interactive Museum Content

### 🌍 Language Support

- Arabic Language
- English Language

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|----------|
| Node.js | Runtime Environment |
| Express.js | Backend Framework |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| Google Auth Library | Google Authentication |
| Cloudinary | Media Storage |
| Multer | File Uploads |
| Railway | Deployment |
| dotenv | Environment Variables |
| CORS | API Security |

---

## 📂 Project Structure

```text
gem-backend/
│
├── middleware/
├── models/
├── routes/
├── uploads/
├── locales/
├── server.js
├── package.json
└── .env
```

---

## 🚀 Live API

Production URL:

```text
https://gem-backend-production.up.railway.app/
```

---

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/elqady74/gem-backend.git
```

Navigate to the project:

```bash
cd gem-backend
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Run production server:

```bash
npm start
```

---

## 🔑 Environment Variables

Create a `.env` file:

```env
PORT=5000

MONGO_URI=your_mongodb_uri

JWT_SECRET=your_jwt_secret

GOOGLE_CLIENT_ID=your_google_client_id

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

PAYMOB_API_KEY=your_paymob_api_key
```

---

## 📡 Main API Endpoints

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google-login
GET  /api/auth/me
```

### Bookings

```http
POST /api/bookings
GET  /api/bookings/my
PUT  /api/bookings/:id/pay
```

### Favorites

```http
POST   /api/favorites/:artifactId
DELETE /api/favorites/:artifactId
GET    /api/favorites/my
```

### Events

```http
GET    /api/events
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id
```

### Videos

```http
GET    /api/videos
POST   /api/videos
DELETE /api/videos/:id
```

### Languages

```http
GET /api/lang/en
GET /api/lang/ar
```

---

## ☁️ Deployment

The backend is deployed on Railway and connected to MongoDB Atlas.

Production API:

```text
https://gem-backend-production.up.railway.app/
```

---

## 🎓 Graduation Project

Tutora was developed as a Graduation Project to provide an intelligent digital companion for visitors of the Grand Egyptian Museum.

The project combines:

- Artificial Intelligence
- Museum Technology
- Secure Booking Systems
- Interactive Media
- Multilingual Experiences

into one integrated platform.

---

## 🔗 Connect with Me

- 💼 **LinkedIn:** [Ahmed Elqady](https://www.linkedin.com/in/ahmed-elkady-0180a7361)
- 💻 **GitHub:** [elqady74](https://github.com/elqady74)
- 📧 **Email:** elqady169@gmail.com
- 📱 **Phone:** +20 1015730065
