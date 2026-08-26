const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// Protects both our server and our Amadeus request quota from abuse/loops.
const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMinutes * 60 * 1000,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

module.exports = apiRateLimiter;
