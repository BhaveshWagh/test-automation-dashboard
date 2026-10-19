const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const router = express.Router();

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const authenticate = require('../middleware/authenticate');
const { signAccessToken, generateRefreshToken, hashToken, REFRESH_TOKEN_TTL_MS } = require('../utils/tokens');
const OtpCode = require('../models/OtpCode');
const { issueOtp, verifyOtp, hashResetToken, RESET_TOKEN_TTL_MS } = require('../utils/otp');
const { sendOtpEmail, sendPasswordChangedEmail } = require('../utils/mailer');

const BCRYPT_COST = 12;
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';

const RegisterZ = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(10)
});

const LoginZ = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const EmailZ = z.object({ email: z.string().email().toLowerCase() });
const OtpZ = z.object({ email: z.string().email().toLowerCase(), otp: z.string().regex(/^\d{6}$/) });
const ResetZ = z.object({ resetToken: z.string().min(32).max(200), newPassword: z.string().min(10) });

// Throttles per target email (not just per IP) so one inbox can't be flooded with codes.
const perEmailRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.email || 'none').toLowerCase()
});

// Code/token guessing is also bounded per OTP (5 attempts); this is the IP-level backstop.
const otpRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

// Only the credential-guessing surface (register, login) needs this: /refresh, /logout
// and /me already require a valid cookie or access token, so throttling them the same
// way would just lock legitimate users out on a few page reloads.
const credentialRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH
    // No maxAge: a session cookie, so closing the browser requires logging in again.
    // Server-side expiry is still enforced via RefreshToken.expiresAt.
  };
}

function toPublicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

// Issues a fresh access token + a new refresh token family member, sets the refresh cookie.
async function issueTokens(res, user, familyId) {
  const accessToken = signAccessToken(user);
  const { raw, tokenHash, expiresAt } = generateRefreshToken();

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    familyId: familyId || crypto.randomUUID(),
    expiresAt
  });

  res.cookie(REFRESH_COOKIE_NAME, raw, refreshCookieOptions());
  return accessToken;
}

// Issues a code and emails it. Failures are logged, never surfaced: callers must respond
// identically whether or not the account exists (no account enumeration).
async function sendOtpTo(user, purpose) {
  try {
    const code = await issueOtp(user._id, purpose);
    if (code) await sendOtpEmail(user.email, code, purpose);
  } catch (err) {
    console.error(`Failed to send ${purpose} code:`, err.message);
  }
}

// POST /api/auth/register
router.post('/register', credentialRateLimit, async (req, res) => {
  const parsed = RegisterZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration details', details: parsed.error.issues });
  }
  const { name, email, password } = parsed.data;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await User.create({ name, email, passwordHash });

    // No session yet: the email must be verified with an OTP first.
    await sendOtpTo(user, 'email_verify');
    res.status(201).json({ verificationRequired: true, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register', details: err.message });
  }
});

// POST /api/auth/login
router.post('/login', credentialRateLimit, async (req, res) => {
  const parsed = LoginZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }
  const { email, password } = parsed.data;

  try {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      await sendOtpTo(user, 'email_verify');
      return res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED', email: user.email });
    }

    const accessToken = await issueTokens(res, user);
    res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log in', details: err.message });
  }
});

// POST /api/auth/verify-email - confirms the emailed code, then starts the session.
router.post('/verify-email', otpRateLimit, async (req, res) => {
  const parsed = OtpZ.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid or expired code' });

  try {
    const user = await User.findOne({ email: parsed.data.email });
    const record = user && (await verifyOtp(user._id, 'email_verify', parsed.data.otp));
    if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

    user.emailVerified = true;
    await user.save();
    await OtpCode.deleteOne({ _id: record._id });

    const accessToken = await issueTokens(res, user);
    res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// POST /api/auth/resend-verification - always 200, whether or not the account exists.
router.post('/resend-verification', otpRateLimit, perEmailRateLimit, async (req, res) => {
  const parsed = EmailZ.safeParse(req.body);
  if (parsed.success) {
    const user = await User.findOne({ email: parsed.data.email }).catch(() => null);
    if (user && !user.emailVerified) sendOtpTo(user, 'email_verify');
  }
  res.json({ message: 'If the account needs verification, a code has been sent.' });
});

// POST /api/auth/forgot-password - always 200. The send is not awaited so response time
// doesn't reveal whether the account exists.
router.post('/forgot-password', otpRateLimit, perEmailRateLimit, async (req, res) => {
  const parsed = EmailZ.safeParse(req.body);
  if (parsed.success) {
    const user = await User.findOne({ email: parsed.data.email }).catch(() => null);
    if (user) sendOtpTo(user, 'password_reset');
  }
  res.json({ message: 'If an account exists for that email, a code has been sent.' });
});

// POST /api/auth/verify-reset-otp - trades a valid code for a short-lived single-use reset token.
router.post('/verify-reset-otp', otpRateLimit, async (req, res) => {
  const parsed = OtpZ.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid or expired code' });

  try {
    const user = await User.findOne({ email: parsed.data.email });
    const record = user && (await verifyOtp(user._id, 'password_reset', parsed.data.otp));
    if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    // Atomic and guarded by codeHash: if a newer code replaced this one meanwhile, nothing is attached.
    const attached = await OtpCode.updateOne(
      { _id: record._id, codeHash: record.codeHash },
      {
        $set: {
          resetTokenHash: hashResetToken(resetToken),
          resetTokenExpiresAt: resetExpiry,
          expiresAt: resetExpiry // keep the row alive for the TTL index until the token expires
        }
      }
    );
    if (!attached.matchedCount) return res.status(400).json({ error: 'Invalid or expired code' });

    res.json({ resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', otpRateLimit, async (req, res) => {
  const parsed = ResetZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Password must be at least 10 characters' });
  }

  try {
    // Atomic claim: only one request can consume a given token.
    const record = await OtpCode.findOneAndUpdate(
      {
        purpose: 'password_reset',
        resetTokenHash: hashResetToken(parsed.data.resetToken),
        completedAt: null,
        resetTokenExpiresAt: { $gt: new Date() }
      },
      { $set: { completedAt: new Date() } }
    );
    if (!record) return res.status(400).json({ error: 'Reset session is invalid or expired. Start again.' });

    const user = await User.findById(record.userId);
    if (!user) return res.status(400).json({ error: 'Reset session is invalid or expired. Start again.' });

    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
    user.emailVerified = true; // they just proved inbox ownership
    await user.save();

    // Sign out every device: an attacker's existing session must not survive the reset.
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
    await OtpCode.deleteMany({ userId: user._id });
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });

    sendPasswordChangedEmail(user.email).catch((err) => console.error('Failed to send confirmation:', err.message));
    res.json({ message: 'Password updated. Please sign in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/auth/refresh - rotates the refresh token, reuse of an already-rotated
// token revokes the whole family (theft signal) and forces re-login.
router.post('/refresh', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!raw) {
    return res.status(401).json({ error: 'Missing refresh token' });
  }

  try {
    const tokenHash = hashToken(raw);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.expiresAt < new Date()) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      return res.status(401).json({ error: 'Refresh token not recognized or expired' });
    }

    if (stored.revokedAt) {
      // Already-rotated token presented again - revoke the whole family and force re-login.
      await RefreshToken.updateMany(
        { familyId: stored.familyId, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      return res.status(401).json({ error: 'Refresh token already used; session revoked' });
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    stored.revokedAt = new Date();
    await stored.save();

    const accessToken = await issueTokens(res, user, stored.familyId);
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to refresh session', details: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (raw) {
    const tokenHash = hashToken(raw);
    await RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  res.status(204).end();
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(toPublicUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user', details: err.message });
  }
});

module.exports = router;
