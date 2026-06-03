const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { parsePagination, paginatedResponse } = require("../utils/pagination");
const { logActivity } = require("../utils/activityLogger");
const { t } = require("../utils/i18n");

// Models
const User = require("../models/User");
const Booking = require("../models/Booking");
const Artifact = require("../models/Artifact");
const Event = require("../models/Event");
const Chat = require("../models/Chat");
const Detection = require("../models/Detection");
const Video = require("../models/Video");
const Favorite = require("../models/Favorite");
const ActivityLog = require("../models/ActivityLog");
const Settings = require("../models/Settings");
const Notification = require("../models/Notification");

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware, adminMiddleware);

/* ================================================================
   ██████   █████  ███████ ██   ██ ██████   ██████   █████  ██████  ██████
   ██   ██ ██   ██ ██      ██   ██ ██   ██ ██    ██ ██   ██ ██   ██ ██   ██
   ██   ██ ███████ ███████ ███████ ██████  ██    ██ ███████ ██████  ██   ██
   ██   ██ ██   ██      ██ ██   ██ ██   ██ ██    ██ ██   ██ ██   ██ ██   ██
   ██████  ██   ██ ███████ ██   ██ ██████   ██████  ██   ██ ██   ██ ██████
   1. Dashboard Stats
================================================================ */

router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Run all aggregations in parallel
    const [
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      totalBookings,
      bookingsByStatus,
      revenueResult,
      revenueThisMonth,
      totalArtifacts,
      upcomingEvents,
      pastEvents,
      totalDetections,
      totalChats,
      totalVideos,
      topDetectedArtifacts,
      topFavoritedItems
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),

      // Bookings
      Booking.countDocuments(),
      Booking.aggregate([
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
      ]),

      // Revenue (all time paid bookings)
      Booking.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),

      // Revenue this month
      Booking.aggregate([
        { $match: { paymentStatus: "paid", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),

      // Artifacts
      Artifact.countDocuments(),

      // Events
      Event.countDocuments({ date: { $gte: now } }),
      Event.countDocuments({ date: { $lt: now } }),

      // AI
      Detection.countDocuments(),
      Chat.countDocuments(),

      // Videos
      Video.countDocuments(),

      // Top detected artifacts
      Detection.aggregate([
        { $group: { _id: "$detectedArtifact", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Top favorited items
      Favorite.aggregate([
        { $group: { _id: { itemId: "$itemId", itemType: "$itemType" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Format bookings by status
    const bookingStatusMap = {};
    bookingsByStatus.forEach(b => { bookingStatusMap[b._id] = b.count; });

    // Calculate user growth percentage
    const userGrowth = newUsersLastMonth > 0
      ? (((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100).toFixed(1)
      : newUsersThisMonth > 0 ? 100 : 0;

    res.json({
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        growthPercent: parseFloat(userGrowth)
      },
      bookings: {
        total: totalBookings,
        pending: bookingStatusMap.pending || 0,
        paid: bookingStatusMap.paid || 0,
        cancelled: bookingStatusMap.cancelled || 0,
        failed: bookingStatusMap.failed || 0
      },
      revenue: {
        total: revenueResult[0]?.total || 0,
        thisMonth: revenueThisMonth[0]?.total || 0,
        currency: "EGP"
      },
      artifacts: {
        total: totalArtifacts
      },
      events: {
        upcoming: upcomingEvents,
        past: pastEvents,
        total: upcomingEvents + pastEvents
      },
      ai: {
        totalDetections,
        totalChats,
        topDetectedArtifacts: topDetectedArtifacts.map(d => ({
          name: d._id,
          count: d.count
        }))
      },
      videos: {
        total: totalVideos
      },
      favorites: {
        topItems: topFavoritedItems.map(f => ({
          itemId: f._id.itemId,
          itemType: f._id.itemType,
          count: f.count
        }))
      }
    });

  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});


/* ================================================================
   ██    ██ ███████ ███████ ██████  ███████
   ██    ██ ██      ██      ██   ██ ██
   ██    ██ ███████ █████   ██████  ███████
   ██    ██      ██ ██      ██   ██      ██
    ██████  ███████ ███████ ██   ██ ███████
   2. User Management
================================================================ */

/* ---- Get All Users (paginated + search + role filter) ---- */
router.get("/users", async (req, res) => {
  try {
    const { skip, limit, page } = parsePagination(req.query);

    const filter = {};

    // Search by name or email
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    // Filter by role
    if (req.query.role && ["user", "admin"].includes(req.query.role)) {
      filter.role = req.query.role;
    }

    // Filter by banned status
    if (req.query.banned !== undefined) {
      filter.isBanned = req.query.banned === "true";
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -resetPasswordToken -resetPasswordExpire")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    res.json(paginatedResponse(users, total, page, limit));

  } catch (error) {
    console.error("Admin Users Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Get Single User ---- */
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -resetPasswordToken -resetPasswordExpire");

    if (!user) {
      return res.status(404).json({ message: t(req, "user_not_found") });
    }

    res.json(user);

  } catch (error) {
    console.error("Admin Users Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Update User (name, role) ---- */
router.put("/users/:id", async (req, res) => {
  try {
    const { name, role } = req.body;
    const updates = {};

    if (name && name.trim()) updates.name = name.trim();
    if (role && ["user", "admin"].includes(role)) updates.role = role;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: t(req, "no_updates_provided") });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select("-password -resetPasswordToken -resetPasswordExpire");

    if (!user) {
      return res.status(404).json({ message: t(req, "user_not_found") });
    }

    await logActivity({
      adminId: req.user.id,
      action: "update_user",
      targetModel: "User",
      targetId: user._id,
      details: updates,
      ipAddress: req.ip
    });

    res.json({ message: t(req, "user_updated"), user });

  } catch (error) {
    console.error("Admin Users Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Delete User ---- */
router.delete("/users/:id", async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: t(req, "cannot_delete_self") });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: t(req, "user_not_found") });
    }

    await logActivity({
      adminId: req.user.id,
      action: "delete_user",
      targetModel: "User",
      targetId: user._id,
      details: { name: user.name, email: user.email },
      ipAddress: req.ip
    });

    res.json({ message: t(req, "user_deleted") });

  } catch (error) {
    console.error("Admin Users Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Ban / Unban User ---- */
router.put("/users/:id/ban", async (req, res) => {
  try {
    // Prevent admin from banning themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: t(req, "cannot_ban_self") });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: t(req, "user_not_found") });
    }

    // Toggle ban status
    user.isBanned = !user.isBanned;
    await user.save();

    await logActivity({
      adminId: req.user.id,
      action: user.isBanned ? "ban_user" : "unban_user",
      targetModel: "User",
      targetId: user._id,
      details: { name: user.name, email: user.email },
      ipAddress: req.ip
    });

    const messageKey = user.isBanned ? "user_banned" : "user_unbanned";
    res.json({ message: t(req, messageKey), isBanned: user.isBanned });

  } catch (error) {
    console.error("Admin Users Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Get User Activity ---- */
router.get("/users/:id/activity", async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("name email");
    if (!user) {
      return res.status(404).json({ message: t(req, "user_not_found") });
    }

    const [bookings, chats, detections, favorites] = await Promise.all([
      Booking.find({ user: userId }).sort({ createdAt: -1 }).limit(20),
      Chat.find({ user: userId }).sort({ createdAt: -1 }).limit(20),
      Detection.find({ user: userId }).sort({ createdAt: -1 }).limit(20),
      Favorite.find({ user: userId }).populate("itemId").sort({ createdAt: -1 }).limit(20)
    ]);

    res.json({
      user,
      activity: {
        bookings,
        chats,
        detections,
        favorites
      }
    });

  } catch (error) {
    console.error("Admin Users Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});


/* ================================================================
   ██████   ██████   ██████  ██   ██ ██ ███    ██  ██████  ███████
   ██   ██ ██    ██ ██    ██ ██  ██  ██ ████   ██ ██       ██
   ██████  ██    ██ ██    ██ █████   ██ ██ ██  ██ ██   ███ ███████
   ██   ██ ██    ██ ██    ██ ██  ██  ██ ██  ██ ██ ██    ██      ██
   ██████   ██████   ██████  ██   ██ ██ ██   ████  ██████  ███████
   4. Booking Management
================================================================ */

/* ---- Get All Bookings (paginated + filters) ---- */
router.get("/bookings", async (req, res) => {
  try {
    const { skip, limit, page } = parsePagination(req.query);

    const filter = {};

    // Filter by payment status
    if (req.query.status && ["pending", "paid", "cancelled", "failed"].includes(req.query.status)) {
      filter.paymentStatus = req.query.status;
    }

    // Filter by nationality type
    if (req.query.nationality && ["egyptian", "arab", "expatriate"].includes(req.query.nationality)) {
      filter.nationalityType = req.query.nationality;
    }

    // Filter by date range
    if (req.query.dateFrom || req.query.dateTo) {
      filter.visitDate = {};
      if (req.query.dateFrom) filter.visitDate.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.visitDate.$lte = new Date(req.query.dateTo);
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter)
    ]);

    res.json(paginatedResponse(bookings, total, page, limit));

  } catch (error) {
    console.error("Admin Bookings Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Get Single Booking ---- */
router.get("/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email avatar");

    if (!booking) {
      return res.status(404).json({ message: t(req, "booking_not_found") });
    }

    res.json(booking);

  } catch (error) {
    console.error("Admin Bookings Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Update Booking Status ---- */
router.put("/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["pending", "paid", "cancelled", "failed"].includes(status)) {
      return res.status(400).json({ message: t(req, "invalid_booking_status") });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: t(req, "booking_not_found") });
    }

    const oldStatus = booking.paymentStatus;
    booking.paymentStatus = status;
    await booking.save();

    await logActivity({
      adminId: req.user.id,
      action: "update_booking_status",
      targetModel: "Booking",
      targetId: booking._id,
      details: { oldStatus, newStatus: status },
      ipAddress: req.ip
    });

    res.json({ message: t(req, "booking_status_updated"), booking });

  } catch (error) {
    console.error("Admin Bookings Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Revenue Report ---- */
router.get("/bookings-revenue", async (req, res) => {
  try {
    const { period } = req.query; // daily, weekly, monthly
    const now = new Date();
    let groupBy, startDate;

    switch (period) {
      case "daily":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30); // last 30 days
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        };
        break;

      case "weekly":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90); // last ~3 months
        groupBy = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" }
        };
        break;

      case "monthly":
      default:
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1); // last 12 months
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        };
        break;
    }

    const revenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: "$total" },
          bookingsCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
    ]);

    const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0);
    const totalBookings = revenue.reduce((sum, r) => sum + r.bookingsCount, 0);

    res.json({
      period: period || "monthly",
      totalRevenue,
      totalBookings,
      currency: "EGP",
      breakdown: revenue
    });

  } catch (error) {
    console.error("Admin Revenue Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});


/* ================================================================
    █████  ██     ███    ███  ██████  ███    ███ ████████
   ██   ██ ██     ████  ████ ██       ████  ████    ██
   ███████ ██     ██ ████ ██ ██   ███ ██ ████ ██    ██
   ██   ██ ██     ██  ██  ██ ██    ██ ██  ██  ██    ██
   ██   ██ ██     ██      ██  ██████  ██      ██    ██
   AI Management
================================================================ */

/* ---- Get All Chats (paginated) ---- */
router.get("/ai/chats", async (req, res) => {
  try {
    const { skip, limit, page } = parsePagination(req.query);

    const filter = {};

    // Filter by user
    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    // Search in questions
    if (req.query.search) {
      filter.$or = [
        { question: new RegExp(req.query.search, "i") },
        { answer: new RegExp(req.query.search, "i") }
      ];
    }

    const [chats, total] = await Promise.all([
      Chat.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Chat.countDocuments(filter)
    ]);

    res.json(paginatedResponse(chats, total, page, limit));

  } catch (error) {
    console.error("Admin AI Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Get All Detections (paginated) ---- */
router.get("/ai/detections", async (req, res) => {
  try {
    const { skip, limit, page } = parsePagination(req.query);

    const filter = {};

    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    if (req.query.artifact) {
      filter.detectedArtifact = new RegExp(req.query.artifact, "i");
    }

    const [detections, total] = await Promise.all([
      Detection.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Detection.countDocuments(filter)
    ]);

    res.json(paginatedResponse(detections, total, page, limit));

  } catch (error) {
    console.error("Admin AI Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Delete Chat ---- */
router.delete("/ai/chats/:id", async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: t(req, "chat_not_found") });
    }

    await logActivity({
      adminId: req.user.id,
      action: "delete_chat",
      targetModel: "Chat",
      targetId: chat._id,
      details: { question: chat.question },
      ipAddress: req.ip
    });

    res.json({ message: t(req, "chat_deleted") });

  } catch (error) {
    console.error("Admin AI Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});


/* ================================================================
   ██       ██████   ██████  ███████
   ██      ██    ██ ██       ██
   ██      ██    ██ ██   ███ ███████
   ██      ██    ██ ██    ██      ██
   ███████  ██████   ██████  ███████
   7. Activity Log
================================================================ */

/* ---- Get Activity Logs (paginated + filters) ---- */
router.get("/logs", async (req, res) => {
  try {
    const { skip, limit, page } = parsePagination(req.query);

    const filter = {};

    // Filter by admin
    if (req.query.adminId) {
      filter.admin = req.query.adminId;
    }

    // Filter by action
    if (req.query.action) {
      filter.action = req.query.action;
    }

    // Filter by target model
    if (req.query.targetModel) {
      filter.targetModel = req.query.targetModel;
    }

    // Filter by date range
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("admin", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(filter)
    ]);

    res.json(paginatedResponse(logs, total, page, limit));

  } catch (error) {
    console.error("Admin Logs Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});


/* ================================================================
   ███████ ███████ ████████ ████████ ██ ███    ██  ██████  ███████
   ██      ██         ██       ██    ██ ████   ██ ██       ██
   ███████ █████      ██       ██    ██ ██ ██  ██ ██   ███ ███████
        ██ ██         ██       ██    ██ ██  ██ ██ ██    ██      ██
   ███████ ███████    ██       ██    ██ ██   ████  ██████  ███████
   8. Settings
================================================================ */

/* ---- Get Settings ---- */
router.get("/settings", async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);

  } catch (error) {
    console.error("Admin Settings Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Update Settings ---- */
router.put("/settings", async (req, res) => {
  try {
    const allowedFields = [
      "ticketPrices",
      "addons",
      "taxRate",
      "maxBookingsPerDay",
      "maintenanceMode",
      "museumOpenTime",
      "museumCloseTime"
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: t(req, "no_updates_provided") });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    // Apply updates
    Object.assign(settings, updates);
    await settings.save();

    await logActivity({
      adminId: req.user.id,
      action: "update_settings",
      targetModel: "Settings",
      targetId: settings._id,
      details: updates,
      ipAddress: req.ip
    });

    res.json({ message: t(req, "settings_updated"), settings });

  } catch (error) {
    console.error("Admin Settings Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});


/* ================================================================
   ███    ██  ██████  ████████ ██ ███████ ██  ██████  █████  ████████ ██  ██████  ███    ██ ███████
   ████   ██ ██    ██    ██    ██ ██      ██ ██      ██   ██    ██    ██ ██    ██ ████   ██ ██
   ██ ██  ██ ██    ██    ██    ██ █████   ██ ██      ███████    ██    ██ ██    ██ ██ ██  ██ ███████
   ██  ██ ██ ██    ██    ██    ██ ██      ██ ██      ██   ██    ██    ██ ██    ██ ██  ██ ██      ██
   ██   ████  ██████     ██    ██ ██      ██  ██████ ██   ██    ██    ██  ██████  ██   ████ ███████
   9. Notifications
================================================================ */

/* ---- Send Notification ---- */
router.post("/notifications/send", async (req, res) => {
  try {
    const { recipientId, title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: t(req, "notification_title_message_required") });
    }

    // If recipientId is provided, send to specific user; otherwise broadcast
    if (recipientId) {
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: t(req, "user_not_found") });
      }

      const notification = await Notification.create({
        sender: req.user.id,
        recipient: recipientId,
        title,
        message,
        type: type || "info"
      });

      await logActivity({
        adminId: req.user.id,
        action: "send_notification",
        targetModel: "Notification",
        targetId: notification._id,
        details: { recipientId, title },
        ipAddress: req.ip
      });

      return res.status(201).json({ message: t(req, "notification_sent"), notification });
    }

    // Broadcast: create one notification with recipient = null
    const notification = await Notification.create({
      sender: req.user.id,
      recipient: null,
      title,
      message,
      type: type || "info"
    });

    await logActivity({
      adminId: req.user.id,
      action: "broadcast_notification",
      targetModel: "Notification",
      targetId: notification._id,
      details: { title, broadcast: true },
      ipAddress: req.ip
    });

    res.status(201).json({ message: t(req, "notification_broadcast_sent"), notification });

  } catch (error) {
    console.error("Admin Notifications Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});

/* ---- Get Sent Notifications (paginated) ---- */
router.get("/notifications", async (req, res) => {
  try {
    const { skip, limit, page } = parsePagination(req.query);

    const filter = {};

    // Filter by type
    if (req.query.type && ["info", "warning", "promo", "system"].includes(req.query.type)) {
      filter.type = req.query.type;
    }

    // Filter broadcast only
    if (req.query.broadcast === "true") {
      filter.recipient = null;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate("sender", "name email")
        .populate("recipient", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter)
    ]);

    res.json(paginatedResponse(notifications, total, page, limit));

  } catch (error) {
    console.error("Admin Notifications Error:", error);
    res.status(500).json({ message: t(req, "server_error") });
  }
});


module.exports = router;
