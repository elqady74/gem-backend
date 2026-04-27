const express = require("express");
const en = require("../locales/en.json");
const ar = require("../locales/ar.json");

const router = express.Router();

const locales = { en, ar };

/* =========================
   Get Translations
   GET /api/lang
   GET /api/lang?lang=ar
   GET /api/lang/ar
========================= */

// GET /api/lang — returns translations based on Accept-Language header or ?lang= query
router.get("/", (req, res) => {
    const lang = req.lang || "en";
    res.json({
        lang,
        translations: locales[lang] || locales.en
    });
});

// GET /api/lang/:locale — returns translations for a specific locale
router.get("/:locale", (req, res) => {
    const locale = req.params.locale.toLowerCase();

    if (!locales[locale]) {
        return res.status(400).json({
            message: "Unsupported language. Supported: en, ar",
            supported: ["en", "ar"]
        });
    }

    res.json({
        lang: locale,
        translations: locales[locale]
    });
});

// GET /api/lang/all — returns all translations
router.get("/all/translations", (req, res) => {
    res.json({
        supported: ["en", "ar"],
        default: "en",
        translations: locales
    });
});

module.exports = router;
