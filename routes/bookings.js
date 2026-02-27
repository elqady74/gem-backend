const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Booking = require("../models/Booking");

const router = express.Router();

/* =========================
   Ticket Pricing
========================= */
const PRICES = {
  egyptian: {
    adult: 200,
    child: 100,
    student: 100,
    senior: 100
  },
  arab: {
    adult: 1450,
    child: 730,
    student: 730
  },
  expatriate: {
    adult: 730,
    child: 370,
    student: 370
  }
};

/* =========================
   Create Booking
========================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { visitDate, nationalityType, tickets } = req.body;

    if (!visitDate || !nationalityType || !tickets?.length) {
      return res.status(400).json({ message: "Missing data" });
    }

    let subtotal = 0;
    const calculatedTickets = [];

    tickets.forEach(ticket => {

      const price = PRICES[nationalityType]?.[ticket.category];
      if (!price) return;

      const itemTotal = price * ticket.quantity;
      subtotal += itemTotal;

      calculatedTickets.push({
        category: ticket.category,
        quantity: ticket.quantity,
        price
      });
    });

    if (calculatedTickets.length === 0) {
      return res.status(400).json({ message: "Invalid ticket selection" });
    }

    const tax = +(subtotal * 0.07).toFixed(2);
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

    res.status(201).json(booking);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Get My Bookings
========================= */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   Simulate Payment
========================= */
router.put("/:id/pay", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Already paid" });
    }

    booking.paymentStatus = "paid";
    await booking.save();

    res.json({ message: "Payment successful", booking });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;