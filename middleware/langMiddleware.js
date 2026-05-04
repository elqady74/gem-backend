const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Language Detection Middleware
 *
 * Sets req.lang based on the following priority order:
 *   1. X-Language custom header OR ?lang= query param  (explicit client override)
 *   2. User's saved language in DB (if logged in via JWT token)
 *   3. Accept-Language header (e.g. "ar", "ar-EG", "en-US")
 *   4. Defaults to "en"
 *
 * This means:
 *  - A guest user whose browser is set to Arabic → gets Arabic (via Accept-Language)
 *  - A logged-in user who saved Arabic in their profile → gets Arabic (via DB)
 *  - Any client that explicitly sends X-Language: ar → always gets Arabic (overrides all)
 */
module.exports = async function (req, res, next) {
    let lang = "en";

    // ── Priority 3: Accept-Language header ───────────────────────────────────
    const acceptLang = req.header("Accept-Language");
    if (acceptLang) {
        const primary = acceptLang.split(",")[0].trim().toLowerCase();
        lang = primary.startsWith("ar") ? "ar" : "en";
    }

    // ── Priority 2: User's saved language from DB ─────────────────────────────
    // Only runs if there is a valid JWT token — does NOT override explicit P1 request
    try {
        const authHeader = req.header("Authorization");
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded && decoded.id) {
                    const user = await User.findById(decoded.id).select("language").lean();
                    if (user && user.language) {
                        lang = user.language;   // DB preference overrides Accept-Language
                    }
                }
            }
        }
    } catch (err) {
        // Token invalid or expired — keep lang from lower priority
    }

    // ── Priority 1: Explicit override via X-Language header or ?lang= param ───
    // This always wins, even over the DB setting — useful for testing or switching
    const xLang = req.header("X-Language");
    if (xLang) {
        const h = xLang.trim().toLowerCase();
        if (h === "ar" || h === "en") lang = h;
    }

    if (req.query && req.query.lang) {
        const q = req.query.lang.toLowerCase();
        if (q === "ar" || q === "en") lang = q;
    }

    req.lang = lang;
    next();
};
