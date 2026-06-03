const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  ticketPrices: {
    general: {
      intl: { adult: { type: Number, default: 25 }, student: { type: Number, default: 15 } },
      local: { adult: { type: Number, default: 200 }, student: { type: Number, default: 100 } }
    },
    guided: {
      intl: { adult: { type: Number, default: 38 }, student: { type: Number, default: 20 } },
      local: { adult: { type: Number, default: 350 }, student: { type: Number, default: 175 } }
    },
    tut: {
      intl: { adult: { type: Number, default: 42 }, student: { type: Number, default: 22 } },
      local: { adult: { type: Number, default: 450 }, student: { type: Number, default: 225 } }
    },
    kids: {
      intl: { child: { type: Number, default: 15 }, adult: { type: Number, default: 10 } },
      local: { child: { type: Number, default: 100 }, adult: { type: Number, default: 75 } }
    }
  },
  addons: {
    audio: { type: Number, default: 8 },
    ramses: { type: Number, default: 15 },
    photo: { type: Number, default: 5 },
    vip: { type: Number, default: 15 }
  },

  taxRate: {
    type: Number,
    default: 0.14
  },

  maxBookingsPerDay: {
    type: Number,
    default: 500
  },

  maintenanceMode: {
    type: Boolean,
    default: false
  },

  museumOpenTime: {
    type: String,
    default: "09:00"
  },

  museumCloseTime: {
    type: String,
    default: "17:00"
  }

}, { timestamps: true });

/**
 * Get the singleton settings document.
 * Creates one with defaults if it doesn't exist.
 */
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
