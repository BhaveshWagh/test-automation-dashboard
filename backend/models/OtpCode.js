const mongoose = require('mongoose');

// One active row per (user, purpose). `purpose` separates email verification from password reset.
const OtpCodeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: ['email_verify', 'password_reset'], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },

    // password_reset only: issued once the OTP is verified, exchanged for the new password.
    resetTokenHash: { type: String, default: null, index: true },
    resetTokenExpiresAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

OtpCodeSchema.index({ userId: 1, purpose: 1 }, { unique: true });
// Mongo auto-deletes expired rows, same approach as RefreshToken.
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpCode', OtpCodeSchema);
