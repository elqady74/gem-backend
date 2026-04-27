const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { t } = require("../utils/i18n");

const router = express.Router();

/* =========================
   Paymob Config
========================= */
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_SECRET_KEY = process.env.PAYMOB_SECRET_KEY;
const PAYMOB_PUBLIC_KEY = process.env.PAYMOB_PUBLIC_KEY;
const PAYMOB_HMAC_SECRET = process.env.PAYMOB_HMAC_SECRET;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_BASE_URL = "https://accept.paymob.com/api";

/* =========================
   Ticket Pricing (EGP)
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
   Validation Helpers
========================= */
function validateTickets(tickets, nationalityType, req) {
  const validCategories = Object.keys(PRICES[nationalityType]);

  for (const ticket of tickets) {
    if (!validCategories.includes(ticket.category)) {
      return t(req, "invalid_ticket_category", {
        category: ticket.category,
        nationality: nationalityType,
        valid: validCategories.join(", ")
      });
    }
    if (!Number.isInteger(ticket.quantity) || ticket.quantity <= 0) {
      return t(req, "invalid_ticket_quantity", { category: ticket.category });
    }
  }

  return null;
}

function validateVisitDate(visitDate, req) {
  const date = new Date(visitDate);
  if (isNaN(date.getTime())) {
    return t(req, "invalid_visit_date");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date < today) {
    return t(req, "visit_date_past");
  }

  return null;
}

/* =========================
   Paymob Helpers
========================= */

// Step 1: Get Auth Token
async function getPaymobAuthToken() {
  const response = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
    api_key: PAYMOB_API_KEY
  });
  return response.data.token;
}

// Step 2: Register Order
async function registerPaymobOrder(authToken, booking, calculatedTickets) {
  const items = calculatedTickets.map(ticket => ({
    name: `${booking.nationalityType.toUpperCase()} - ${ticket.category}`,
    amount_cents: ticket.price * ticket.quantity * 100,
    description: `${ticket.quantity}x ${ticket.category} ticket`,
    quantity: ticket.quantity
  }));

  const response = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
    auth_token: authToken,
    delivery_needed: "false",
    amount_cents: Math.round(booking.total * 100),
    currency: "EGP",
    merchant_order_id: booking._id.toString(),
    items
  });

  return response.data;
}

// Step 3: Get Payment Key
async function getPaymobPaymentKey(authToken, orderId, amountCents, billingData) {
  const response = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    billing_data: billingData,
    currency: "EGP",
    integration_id: parseInt(PAYMOB_INTEGRATION_ID),
    lock_order_when_paid: "false"
  });

  return response.data.token;
}

/* =========================
   Create Checkout Session
========================= */
router.post("/checkout", authMiddleware, async (req, res) => {
  try {

    const { visitDate, nationalityType, tickets, billingData } = req.body;

    // --- Basic validation ---
    if (!visitDate || !nationalityType || !tickets?.length) {
      return res.status(400).json({ message: t(req, "missing_booking_data") });
    }

    if (!PRICES[nationalityType]) {
      return res.status(400).json({ message: t(req, "invalid_nationality_type") });
    }

    // --- Visit date validation ---
    const dateError = validateVisitDate(visitDate, req);
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    // --- Ticket validation ---
    const ticketError = validateTickets(tickets, nationalityType, req);
    if (ticketError) {
      return res.status(400).json({ message: ticketError });
    }

    // --- Calculate prices ---
    let subtotal = 0;

    const calculatedTickets = tickets.map(ticket => {
      const price = PRICES[nationalityType][ticket.category];
      subtotal += price * ticket.quantity;

      return {
        category: ticket.category,
        quantity: ticket.quantity,
        price
      };
    });

    const tax = +(subtotal * 0.14).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    // --- Create booking in DB ---
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

    // --- Paymob Payment Flow ---

    // Step 1: Auth
    const authToken = await getPaymobAuthToken();

    // Step 2: Register Order
    const paymobOrder = await registerPaymobOrder(authToken, booking, calculatedTickets);

    // Save Paymob Order ID
    booking.paymobOrderId = paymobOrder.id.toString();
    await booking.save();

    // Step 3: Payment Key
    const amountCents = Math.round(total * 100);

    const defaultBilling = {
      apartment: "NA",
      email: billingData?.email || "customer@example.com",
      floor: "NA",
      first_name: billingData?.first_name || "Guest",
      street: "NA",
      building: "NA",
      phone_number: billingData?.phone_number || "+201000000000",
      shipping_method: "NA",
      postal_code: "NA",
      city: "Cairo",
      country: "EG",
      last_name: billingData?.last_name || "User",
      state: "Cairo"
    };

    const paymentKey = await getPaymobPaymentKey(
      authToken,
      paymobOrder.id,
      amountCents,
      defaultBilling
    );

    // Build checkout URL (Paymob hosted iframe)
    const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_INTEGRATION_ID}?payment_token=${paymentKey}`;

    res.json({
      bookingId: booking._id,
      subtotal,
      tax,
      total,
      currency: "EGP",
      paymobOrderId: paymobOrder.id,
      paymentKey,
      checkoutUrl
    });

  } catch (error) {
    console.error("Checkout Error:", error.response?.data || error.message);
    res.status(500).json({ message: t(req, "server_error"), details: error.response?.data || error.message });
  }
});


/* =========================
   Verify Payment
========================= */
router.post("/verify-payment", authMiddleware, async (req, res) => {

  try {

    const { orderId, transactionId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: t(req, "missing_order_id") });
    }

    // --- Find booking by Paymob order ---
    const booking = await Booking.findOne({
      paymobOrderId: orderId.toString(),
      user: req.user.id
    });

    if (!booking) {
      return res.status(404).json({ message: t(req, "booking_not_found") });
    }

    // --- Prevent double verification ---
    if (booking.paymentStatus === "paid") {
      return res.json({
        message: t(req, "payment_already_verified"),
        booking
      });
    }

    // --- Check with Paymob API ---
    const authToken = await getPaymobAuthToken();

    const response = await axios.get(
      `${PAYMOB_BASE_URL}/ecommerce/orders/${orderId}`,
      {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      }
    );

    const orderData = response.data;

    if (orderData.paid_amount_cents >= Math.round(booking.total * 100)) {
      booking.paymentStatus = "paid";
      if (transactionId) booking.paymobTransactionId = transactionId.toString();
      await booking.save();

      return res.json({
        message: t(req, "payment_successful"),
        booking
      });
    } else {
      return res.status(400).json({
        message: t(req, "payment_not_completed"),
        paidAmount: orderData.paid_amount_cents / 100,
        expectedAmount: booking.total
      });
    }

  } catch (error) {
    console.error("Verify Payment Error:", error.response?.data || error.message);
    res.status(500).json({ message: t(req, "verification_error") });
  }

});


/* =========================
   Paymob Webhook (Transaction Callback)
========================= */
router.post("/webhook", async (req, res) => {

  try {
    const payload = req.body;

    // --- HMAC Verification ---
    if (PAYMOB_HMAC_SECRET && req.query.hmac) {
      const obj = payload.obj;

      const hmacData = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order?.id,
        obj.owner,
        obj.pending,
        obj.source_data?.pan,
        obj.source_data?.sub_type,
        obj.source_data?.type,
        obj.success
      ].join("");

      const computedHmac = crypto
        .createHmac("sha512", PAYMOB_HMAC_SECRET)
        .update(hmacData)
        .digest("hex");

      if (computedHmac !== req.query.hmac) {
        console.error("Webhook HMAC mismatch");
        return res.status(403).json({ message: t(req, "invalid_hmac") });
      }
    }

    // --- Process the transaction ---
    const transaction = payload.obj;
    if (!transaction || !transaction.order?.id) {
      return res.status(400).json({ message: t(req, "invalid_webhook_data") });
    }

    const booking = await Booking.findOne({
      paymobOrderId: transaction.order.id.toString()
    });

    if (!booking) {
      return res.status(404).json({ message: t(req, "booking_not_found") });
    }

    if (transaction.success === true) {
      booking.paymentStatus = "paid";
    } else if (transaction.is_voided === true) {
      booking.paymentStatus = "cancelled";
    } else {
      booking.paymentStatus = "failed";
    }

    booking.paymobTransactionId = transaction.id?.toString();
    await booking.save();

    res.json({ message: t(req, "webhook_processed") });

  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ message: t(req, "webhook_error") });
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
    res.status(500).json({ message: t(req, "server_error") });
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
      return res.status(404).json({ message: t(req, "booking_not_found") });
    }

    res.json(booking);

  } catch (error) {
    res.status(500).json({ message: t(req, "server_error") });
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
    res.status(500).json({ message: t(req, "server_error") });
  }

});

module.exports = router;