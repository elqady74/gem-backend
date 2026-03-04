const express = require("express");
const Stripe = require("stripe");
const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

/* =========================
   Ticket Pricing
========================= */
const PRICES = {
  egyptian: {
    adult: 200,
    child: 100,
    student: 100
  },
  arab: {
    adult: 1450,
    child: 730
  },
  expatriate: {
    adult: 730,
    child: 370
  }
};

/* =========================
   Create Checkout Session
========================= */
router.post("/checkout", authMiddleware, async (req, res) => {
  try {

    const { visitDate, nationalityType, tickets } = req.body;

    if (!visitDate || !nationalityType || !tickets?.length) {
      return res.status(400).json({ message: "Missing booking data" });
    }

    if (!PRICES[nationalityType]) {
      return res.status(400).json({ message: "Invalid nationality type" });
    }

    let subtotal = 0;

    const calculatedTickets = tickets.map(ticket => {

      const price = PRICES[nationalityType][ticket.category];

      if (!price) {
        throw new Error("Invalid ticket category");
      }

      subtotal += price * ticket.quantity;

      return {
        category: ticket.category,
        quantity: ticket.quantity,
        price
      };

    });

    const tax = +(subtotal * 0.14).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    const booking = await Booking.create({
      user: req.user.id,
      visitDate,
      nationalityType,
      tickets: calculatedTickets,
      subtotal,
      tax,
      total,
      paymentStatus: "pending"
    });

    const frontendURL = process.env.FRONTEND_URL || "http://localhost:5500";

    const line_items = calculatedTickets.map(ticket => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${nationalityType.toUpperCase()} Ticket - ${ticket.category}`
        },
        unit_amount: ticket.price * 100
      },
      quantity: ticket.quantity
    }));

    line_items.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Taxes"
        },
        unit_amount: Math.round(tax * 100)
      },
      quantity: 1
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      client_reference_id: booking._id.toString(),
      success_url: `${frontendURL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendURL}/cancel`,
      line_items
    });

    res.json({
      bookingId: booking._id,
      subtotal,
      tax,
      total,
      checkoutUrl: session.url
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


/* =========================
   Verify Payment
========================= */
router.post("/verify-payment", authMiddleware, async (req, res) => {

  try {

    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const bookingId = session.client_reference_id;

    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.user.id
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.paymentStatus = "paid";
    await booking.save();

    res.json({
      message: "Payment successful",
      booking
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Verification error" });
  }

});


/* =========================
   Get My Bookings
========================= */
router.get("/my-bookings", authMiddleware, async (req, res) => {

  try {

    const bookings = await Booking
      .find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(bookings);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});


/* =========================
   Get Booking Details
========================= */
router.get("/:id", authMiddleware, async (req, res) => {

  try {

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});


/* =========================
   Admin: Get All Bookings
========================= */
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {

  try {

    const bookings = await Booking
      .find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(bookings);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});

module.exports = router;