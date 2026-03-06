const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  visitDate: {
    type: Date,
    required: true
  },

  nationalityType: {
    type: String,
    enum: ["egyptian", "arab", "expatriate"],
    required: true
  },

  tickets: [
    {
      category: String,
      quantity: Number,
      price: Number
    }
  ],

  subtotal: Number,
  tax: Number,
  total: Number,

  paymobOrderId: {
    type: String,
    default: null
  },

  paymobTransactionId: {
    type: String,
    default: null
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "cancelled", "failed"],
    default: "pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);