const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/adminMiddleware");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");

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
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
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
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
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
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Google Login
========================= */
router.post("/google", async (req, res) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({ message: "Google token is required" });
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
    res.status(401).json({ message: "Invalid Google token or unauthorized" });
  }
});

/* =========================
   Forgot Password (Send OTP)
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // تأكد أن الإيميل موجود ومسجل بشكل تقليدي ومش بس بجوجل (عنده باسوورد)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "There is no user with that email" });
    }

    // توليد كود مكون من 6 أرقام
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // حفظ الكود في الداتا بيز مع وقت انتهاء (مثلاً بعد 30 دقيقة)
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

      res.status(200).json({ message: "Reset code sent to email" });
    } catch (error) {
      console.error("Sending email error:", error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({ message: "Email could not be sent" });
    }

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error" });
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
      resetPasswordExpire: { $gt: Date.now() } // التأكد من أن الكود لم تنتهِ صلاحيته
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    res.status(200).json({ message: "Code verified successfully! You can now reset your password." });

  } catch (error) {
    console.error("Verify Code Error:", error);
    res.status(500).json({ message: "Server error" });
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
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    // تشفير كلمة المرور الجديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // تحديث بيانات المستخدم
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
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
    res.status(500).json({ message: "Server error" });
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
      return res.status(404).json({ message: "User not found" });
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
        return res.status(400).json({ message: "Language must be 'en' or 'ar'" });
      }
      user.language = language;
    }

    // Update password (if provided)
    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ message: "Old password is required to set a new password" });
      }

      // Google-only users might not have a password
      if (!user.password) {
        return res.status(400).json({ message: "Cannot change password for Google-only accounts" });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ message: "Profile updated successfully", user: updatedUser });

  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error" });
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
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (error) {
    console.error("Make Admin Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;