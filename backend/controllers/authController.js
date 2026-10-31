const { z } = require('zod');
const authService = require('../services/authService');
const { AppError, sendError } = require('../utils/httpErrors');

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

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

function toPublicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register
async function register(req, res) {
  const parsed = RegisterZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration details', details: parsed.error.issues });
  }

  try {
    const user = await authService.register(parsed.data);
    // No session yet: the email must be verified with an OTP first.
    res.status(201).json({ verificationRequired: true, email: user.email });
  } catch (err) {
    sendError(res, err, 'Failed to register');
  }
}

// POST /api/auth/login
async function login(req, res) {
  const parsed = LoginZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  try {
    const { user, accessToken, refreshToken } = await authService.login(parsed.data);
    setRefreshCookie(res, refreshToken);
    res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    sendError(res, err, 'Failed to log in');
  }
}

// POST /api/auth/verify-email - confirms the emailed code, then starts the session.
async function verifyEmail(req, res) {
  const parsed = OtpZ.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid or expired code' });

  try {
    const { user, accessToken, refreshToken } = await authService.verifyEmail(parsed.data);
    setRefreshCookie(res, refreshToken);
    res.json({ user: toPublicUser(user), accessToken });
  } catch (err) {
    sendError(res, err, 'Failed to verify email');
  }
}

// POST /api/auth/resend-verification - always 200, whether or not the account exists.
async function resendVerification(req, res) {
  const parsed = EmailZ.safeParse(req.body);
  if (parsed.success) await authService.resendVerification(parsed.data.email);
  res.json({ message: 'If the account needs verification, a code has been sent.' });
}

// POST /api/auth/forgot-password - always 200.
async function forgotPassword(req, res) {
  const parsed = EmailZ.safeParse(req.body);
  if (parsed.success) await authService.forgotPassword(parsed.data.email);
  res.json({ message: 'If an account exists for that email, a code has been sent.' });
}

// POST /api/auth/verify-reset-otp
async function verifyResetOtp(req, res) {
  const parsed = OtpZ.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid or expired code' });

  try {
    const resetToken = await authService.verifyResetOtp(parsed.data);
    res.json({ resetToken });
  } catch (err) {
    sendError(res, err, 'Failed to verify code');
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  const parsed = ResetZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Password must be at least 10 characters' });
  }

  try {
    await authService.resetPassword(parsed.data);
    clearRefreshCookie(res);
    res.json({ message: 'Password updated. Please sign in.' });
  } catch (err) {
    sendError(res, err, 'Failed to reset password');
  }
}

// POST /api/auth/refresh - rotates the refresh token.
async function refresh(req, res) {
  try {
    const { accessToken, refreshToken } = await authService.refreshSession(req.cookies?.[REFRESH_COOKIE_NAME]);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken });
  } catch (err) {
    if (err instanceof AppError && err.clearCookie) clearRefreshCookie(res);
    sendError(res, err, 'Failed to refresh session');
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  res.status(204).end();
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const user = await authService.getMe(req.user.id);
    res.json(toPublicUser(user));
  } catch (err) {
    sendError(res, err, 'Failed to fetch current user');
  }
}

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  refresh,
  logout,
  me
};
