/**
 * Language Detection Middleware
 *
 * Sets req.lang based on:
 *   1. Accept-Language header (e.g. "ar", "ar-EG", "en-US")
 *   2. ?lang= query parameter
 *   3. Defaults to "en"
 */
module.exports = function (req, res, next) {
    let lang = "en";

    // Priority 1: Accept-Language header
    const acceptLang = req.header("Accept-Language");
    if (acceptLang) {
        const primary = acceptLang.split(",")[0].trim().toLowerCase();
        if (primary.startsWith("ar")) {
            lang = "ar";
        } else {
            lang = "en";
        }
    }

    // Priority 2: ?lang= query param (overrides header if present)
    if (req.query && req.query.lang) {
        const queryLang = req.query.lang.toLowerCase();
        if (queryLang === "ar") {
            lang = "ar";
        } else if (queryLang === "en") {
            lang = "en";
        }
    }

    req.lang = lang;
    next();
};
