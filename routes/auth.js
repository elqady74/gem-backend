const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/adminMiddleware");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const { t } = require("../utils/i18n");

/* =========================
   Multer Setup for Avatar
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

/* =========================
   Register
========================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: t(req, "user_already_exists") });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: t(req, "user_registered") });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Login
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: t(req, "invalid_credentials") });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: t(req, "invalid_credentials") });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Google Login
========================= */
router.post("/google", async (req, res) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ message: t(req, "google_token_required") });
    }

    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, sub, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        googleId: sub,
        avatar: picture
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = sub;
      user.avatar = user.avatar ? user.avatar : picture;
      await user.save();
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(401).json({ message: t(req, "invalid_google_token") });
  }
});

/* =========================
   Forgot Password (Send OTP)
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: t(req, "no_user_with_email") });
    }

    // توليد كود مكون من 6 أرقام
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // حفظ الكود في الداتا بيز مع وقت انتهاء (بعد 30 دقيقة)
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
    await user.save();

    // إرسال الإيميل
    const message = `الكود الخاص بإعادة تعيين كلمة المرور هو: ${resetCode}\nأو تجاهل هذا البريد إذا لم تكن أنت من طلب ذلك.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Code",
        message,
        code: resetCode
      });

      res.status(200).json({ message: t(req, "reset_code_sent") });
    } catch (error) {
      console.error("Sending email error:", error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({ message: t(req, "email_not_sent") });
    }

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Verify OTP Code
========================= */
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: t(req, "invalid_or_expired_code") });
    }

    res.status(200).json({ message: t(req, "code_verified") });

  } catch (error) {
    console.error("Verify Code Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Reset Password
========================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: t(req, "invalid_or_expired_code") });
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // تحديث بيانات المستخدم
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: t(req, "password_updated") });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Get Current User
========================= */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Update Profile
========================= */
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { name, avatar, language, oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: t(req, "user_not_found") });
    }

    // Update name (if provided)
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // Update avatar (if provided)
    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    // Update language (if provided)
    if (language) {
      if (!["en", "ar"].includes(language)) {
        return res.status(400).json({ message: t(req, "language_must_be_en_or_ar") });
      }
      user.language = language;
    }

    // Update password (if provided)
    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ message: t(req, "old_password_required") });
      }

      // Google-only users might not have a password
      if (!user.password) {
        return res.status(400).json({ message: t(req, "cannot_change_google_password") });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: t(req, "old_password_incorrect") });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: t(req, "new_password_min_length") });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ message: t(req, "profile_updated"), user: updatedUser });

  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Make Admin
========================= */
router.put("/make-admin/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "admin" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: t(req, "user_not_found") });
    }

    res.json(user);

  } catch (error) {
    console.error("Make Admin Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* =========================
   Upload Avatar (Cloudinary)
   POST /api/auth/me/avatar
   - Uploads image to Cloudinary
   - Saves permanent URL in user.avatar
   - Works across all devices
========================= */
router.post("/me/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: t(req, "no_file_uploaded") });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: t(req, "user_not_found") });
    }

    // Delete old avatar from Cloudinary if it exists
    if (user.avatar && user.avatar.includes("cloudinary")) {
      try {
        // Extract public_id from URL: .../gem_avatars/abc123.jpg -> gem_avatars/abc123
        const parts = user.avatar.split("/");
        const folder = parts[parts.length - 2];
        const filename = parts[parts.length - 1].split(".")[0];
        await cloudinary.uploader.destroy(`${folder}/${filename}`);
      } catch (e) {
        // Old avatar cleanup is best-effort, don't fail the request
      }
    }

    // Upload new avatar to Cloudinary
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "image",
            folder: "gem_avatars",
            public_id: `user_${req.user.id}_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" }
            ]
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload();

    // Save Cloudinary URL to user
    user.avatar = result.secure_url;
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({
      message: t(req, "profile_updated"),
      avatarUrl: result.secure_url,
      user: updatedUser
    });

  } catch (error) {
    console.error("Avatar Upload Error:", error);
    res.status(500).json({ message: t(req, "upload_failed") });
  }
});

module.exports = router;