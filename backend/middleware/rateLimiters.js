const rateLimit = require('express-rate-limit');

// Throttles per target email (not just per IP) so one inbox can't be flooded with codes.
const perEmail = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.email || 'none').toLowerCase()
});

// Code/token guessing is also bounded per OTP (5 attempts); this is the IP-level backstop.
const otp = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

// Only the credential-guessing surface (register, login) needs this: /refresh, /logout
// and /me already require a valid cookie or access token, so throttling them the same
// way would just lock legitimate users out on a few page reloads.
const credential = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { perEmail, otp, credential };
