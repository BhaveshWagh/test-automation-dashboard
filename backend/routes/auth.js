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
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS
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

    const accessToken = await issueTokens(res, user);
    res.status(201).json({ user: toPublicUser(user), accessToken });
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

    const accessToken = await issueTokens(res, user);
    res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log in', details: err.message });
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
