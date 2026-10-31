// Lets a service signal an HTTP-level failure (404, 400, 409, ...) without importing Express
// or building a response itself. `extra` is merged into the JSON body alongside `error`
// (e.g. { details: [...] } or { code: 'EMAIL_NOT_VERIFIED' }).
class AppError extends Error {
  constructor(statusCode, message, extra) {
    super(message);
    this.statusCode = statusCode;
    this.extra = extra;
  }
}

// Shared error-response shaping so every controller reports failures the same way:
// a thrown AppError maps to its own status/body, anything else is an unexpected
// failure logged server-side and reported as a generic 500.
function sendError(res, err, fallbackMessage) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, ...err.extra });
  }
  console.error(err);
  res.status(500).json({ error: fallbackMessage, details: err.message });
}

module.exports = { AppError, sendError };
