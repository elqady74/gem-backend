const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Import Routes
const authRoutes = require("./routes/auth");
const artifactRoutes = require("./routes/artifacts");
const aiRoutes = require("./routes/ai");
const favoriteRoutes = require("./routes/favorites");
const bookingRoutes = require("./routes/bookings");
const eventRoutes = require("./routes/events");
const uploadRoutes = require("./routes/upload");
const videoRoutes = require("./routes/videos");
const langRoutes = require("./routes/lang");
const adminRoutes = require("./routes/admin");
const settingsRoutes = require("./routes/settings");

const app = express();

/* =========================
   Middlewares
========================= */
const langMiddleware = require("./middleware/langMiddleware");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(langMiddleware);

/* =========================
   Routes
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/artifacts", artifactRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/lang", langRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

/* =========================
   MongoDB Connection
========================= */
mongoose.connect(process.env.MONGO_URI)
   .then(() => console.log("MongoDB Connected ✅"))
   .catch((err) => console.log(err));

/* =========================
   Test Route
========================= */
app.get("/", (req, res) => {
   res.send("Backend is running 🚀");
});

/* =========================
   Server Start
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
});