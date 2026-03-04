const express = require("express");
const Stripe = require("stripe");
const Booking = require("../models/Booking");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
// Create stripe instance (will use the key from .env later, fallback to empty string if not set to avoid crash on startup)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

/* =========================
   Create Checkout Session
========================= */
router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const { visitDate, nationalityType, tickets } = req.body;

    // 1. Validation
    if (!visitDate || !nationalityType || !tickets || tickets.length === 0) {
      return res.status(400).json({ message: "Please provide all booking details" });
    }

    // 2. Calculate Totals
    let subtotal = 0;
    tickets.forEach(ticket => {
      subtotal += (ticket.price * ticket.quantity);
    });

    const tax = subtotal * 0.14; // 14% Taxes, you can change this
    const total = subtotal + tax;

    // 3. Create Booking in Database (Pending)
    const booking = await Booking.create({
      user: req.user.id,
      visitDate,
      nationalityType,
      tickets,
      subtotal,
      tax,
      total,
      paymentStatus: "pending"
    });

    // 4. Create Stripe Checkout Session
    // We get the frontend URL from env, or fallback to the provided railway URL
    const frontendURL = process.env.FRONTEND_URL || "https://gem-backend-production.up.railway.app";

    // Prepare line items for Stripe
    const line_items = tickets.map(ticket => {
      return {
        price_data: {
          currency: "usd", // USD or EGP
          product_data: {
            name: `${nationalityType.toUpperCase()} Ticket - ${ticket.category}`,
          },
          unit_amount: Math.round(ticket.price * 100), // Stripe takes amounts in cents
        },
        quantity: ticket.quantity,
      };
    });

    // Add Tax as a separate line item
    if (tax > 0) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Taxes & Fees (14%)" },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${frontendURL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendURL}/cancel`,
      client_reference_id: booking._id.toString(),
      line_items: line_items
    });

    // 5. Return the Stripe URL to frontend so they can redirect the user
    res.status(200).json({
      message: "Checkout session created",
      bookingId: booking._id,
      url: session.url
    });

  } catch (error) {
    console.error("Booking Checkout Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* =========================
   Verify Payment
========================= */
// Once frontend redirects user to /success?session_id=..., it should call this API to confirm
router.post("/verify-payment", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const bookingId = session.client_reference_id;

      // Update booking to paid
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { paymentStatus: "paid" },
        { new: true }
      );

      return res.status(200).json({ message: "Payment successful", booking });
    } else {
      return res.status(400).json({ message: "Payment not completed" });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* =========================
   Get My Bookings
========================= */
router.get("/my-bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Get Bookings Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Get All Bookings (Admin)
========================= */
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().populate("user", "name email").sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;