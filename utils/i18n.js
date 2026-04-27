const en = require("../locales/en.json");
const ar = require("../locales/ar.json");

const locales = { en, ar };

/**
 * Translate a message key based on the request language.
 *
 * @param {object} req - Express request object (must have req.lang set by langMiddleware)
 * @param {string} key - Translation key (e.g. "server_error")
 * @param {object} [params] - Optional interpolation params, e.g. { category: "adult" }
 * @returns {string} Translated message
 */
function t(req, key, params) {
  const lang = (req && req.lang) || "en";
  const translations = locales[lang] || locales.en;

  let message = translations[key] || locales.en[key] || key;

  // Interpolation: replace {placeholder} with actual values
  if (params) {
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{${param}\\}`, "g"), value);
    }
  }

  return message;
}

module.exports = { t };
