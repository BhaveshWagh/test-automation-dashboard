const crypto = require('crypto');
const OtpCode = require('../models/OtpCode');

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hmacSecret() {
  const secret = process.env.OTP_HMAC_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('OTP_HMAC_SECRET (or JWT_ACCESS_SECRET) must be set');
  return secret;
}

function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

// Only 1,000,000 possible codes, so a plain hash would be brute-forced instantly if the DB leaked.
// HMAC with a server-side secret keeps the stored value useless without it.
function hashOtp(code, userId, purpose) {
  return crypto.createHmac('sha256', hmacSecret()).update(`${purpose}:${userId}:${code}`).digest('hex');
}

function hashResetToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Creates (replacing any previous) code for the user. Returns the raw code, or null when the
// resend cooldown is still running or a concurrent request already issued one.
//
// The cooldown check lives inside the filter, so check-and-write is ONE atomic operation:
// - row exists and is still cooling down -> filter misses, upsert tries to insert, the unique
//   (userId, purpose) index rejects it (E11000) -> null
// - two simultaneous first requests -> one insert wins, the other hits E11000 -> null
// So at most one code is issued (and emailed) per cooldown window, however many requests race.
async function issueOtp(userId, purpose) {
  const code = generateOtp();
  try {
    await OtpCode.findOneAndUpdate(
      { userId, purpose, lastSentAt: { $lte: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
      {
        $set: {
          codeHash: hashOtp(code, userId, purpose),
          attempts: 0,
          lastSentAt: new Date(),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          usedAt: null,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          completedAt: null
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return code;
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }
}

// Checks a submitted code. Every call burns one attempt (atomically), and the code dies
// after MAX_ATTEMPTS wrong tries. A correct code is then claimed with a second atomic update,
// so only ONE of several simultaneous correct submissions succeeds.
// Returns the OtpCode doc on success, null otherwise.
async function verifyOtp(userId, purpose, code) {
  const record = await OtpCode.findOneAndUpdate(
    {
      userId,
      purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_ATTEMPTS }
    },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (!record) return null;

  const expected = Buffer.from(record.codeHash, 'hex');
  const actual = Buffer.from(hashOtp(code, userId, purpose), 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;

  // codeHash in the filter: if a newer code replaced this one meanwhile, the claim fails.
  return OtpCode.findOneAndUpdate(
    { _id: record._id, usedAt: null, codeHash: record.codeHash },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
}

module.exports = {
  issueOtp,
  verifyOtp,
  hashResetToken,
  RESET_TOKEN_TTL_MS
};
