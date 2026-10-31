const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const OtpCode = require('../models/OtpCode');
const { signAccessToken, generateRefreshToken, hashToken } = require('../utils/tokens');
const { issueOtp, verifyOtp, hashResetToken, RESET_TOKEN_TTL_MS } = require('../utils/otp');
const { sendOtpEmail, sendPasswordChangedEmail } = require('../utils/mailer');
const { AppError } = require('../utils/httpErrors');

const BCRYPT_COST = 12;

// Issues a fresh access token + a new refresh token family member.
// Returns the raw refresh token; putting it in a cookie is the controller's job,
// since HTTP transport is not this layer's concern.
async function issueTokens(user, familyId) {
  const accessToken = signAccessToken(user);
  const { raw, tokenHash, expiresAt } = generateRefreshToken();

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    familyId: familyId || crypto.randomUUID(),
    expiresAt
  });

  return { accessToken, refreshToken: raw };
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

async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({ name, email, passwordHash });

  // No session yet: the email must be verified with an OTP first.
  await sendOtpTo(user, 'email_verify');
  return user;
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw new AppError(401, 'Invalid email or password');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw new AppError(401, 'Invalid email or password');

  if (!user.emailVerified) {
    await sendOtpTo(user, 'email_verify');
    throw new AppError(403, 'Email not verified', { code: 'EMAIL_NOT_VERIFIED', email: user.email });
  }

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

// Confirms the emailed code, then starts the session.
async function verifyEmail({ email, otp }) {
  const user = await User.findOne({ email });
  const record = user && (await verifyOtp(user._id, 'email_verify', otp));
  if (!record) throw new AppError(400, 'Invalid or expired code');

  user.emailVerified = true;
  await user.save();
  await OtpCode.deleteOne({ _id: record._id });

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

// Always succeeds from the caller's point of view: no account enumeration.
async function resendVerification(email) {
  const user = await User.findOne({ email }).catch(() => null);
  if (user && !user.emailVerified) sendOtpTo(user, 'email_verify'); // not awaited
}

// Always succeeds from the caller's point of view: the send is not awaited so
// response time doesn't reveal whether the account exists.
async function forgotPassword(email) {
  const user = await User.findOne({ email }).catch(() => null);
  if (user) sendOtpTo(user, 'password_reset'); // not awaited
}

// Trades a valid code for a short-lived single-use reset token.
async function verifyResetOtp({ email, otp }) {
  const user = await User.findOne({ email });
  const record = user && (await verifyOtp(user._id, 'password_reset', otp));
  if (!record) throw new AppError(400, 'Invalid or expired code');

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
  if (!attached.matchedCount) throw new AppError(400, 'Invalid or expired code');

  return resetToken;
}

async function resetPassword({ resetToken, newPassword }) {
  // Atomic claim: only one request can consume a given token.
  const record = await OtpCode.findOneAndUpdate(
    {
      purpose: 'password_reset',
      resetTokenHash: hashResetToken(resetToken),
      completedAt: null,
      resetTokenExpiresAt: { $gt: new Date() }
    },
    { $set: { completedAt: new Date() } }
  );
  if (!record) throw new AppError(400, 'Reset session is invalid or expired. Start again.');

  const user = await User.findById(record.userId);
  if (!user) throw new AppError(400, 'Reset session is invalid or expired. Start again.');

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  user.emailVerified = true; // they just proved inbox ownership
  await user.save();

  // Sign out every device: an attacker's existing session must not survive the reset.
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await OtpCode.deleteMany({ userId: user._id });

  sendPasswordChangedEmail(user.email).catch((err) => console.error('Failed to send confirmation:', err.message));
  return user;
}

// Rotates the refresh token; reuse of an already-rotated token revokes the whole
// family (theft signal) and forces re-login. `clearCookie` on the thrown error tells
// the controller whether this failure should also clear the refresh cookie.
async function refreshSession(raw) {
  if (!raw) throw new AppError(401, 'Missing refresh token');

  const tokenHash = hashToken(raw);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored || stored.expiresAt < new Date()) {
    const err = new AppError(401, 'Refresh token not recognized or expired');
    err.clearCookie = true;
    throw err;
  }

  if (stored.revokedAt) {
    // Already-rotated token presented again - revoke the whole family and force re-login.
    await RefreshToken.updateMany(
      { familyId: stored.familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    const err = new AppError(401, 'Refresh token already used; session revoked');
    err.clearCookie = true;
    throw err;
  }

  const user = await User.findById(stored.userId);
  if (!user) throw new AppError(401, 'User no longer exists');

  stored.revokedAt = new Date();
  await stored.save();

  return issueTokens(user, stored.familyId);
}

async function logout(raw) {
  if (!raw) return;
  await RefreshToken.updateOne({ tokenHash: hashToken(raw) }, { $set: { revokedAt: new Date() } });
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

module.exports = {
  issueTokens,
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  refreshSession,
  logout,
  getMe
};
