const nodemailer = require('nodemailer');

const isProd = process.env.NODE_ENV === 'production';
let gmailTransport = null;

function layout(title, bodyHtml) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
    <h2 style="margin:0 0 16px">${title}</h2>${bodyHtml}
    <p style="margin-top:24px;color:#666;font-size:12px">Test Automation Dashboard</p>
  </div>`;
}

// Gmail SMTP via an App Password. Without credentials, dev mode prints the email to the console.
function getGmailTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  if (!gmailTransport) {
    gmailTransport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') }
    });
  }
  return gmailTransport;
}

async function sendMail({ to, subject, html, text }) {
  const gmail = getGmailTransport();
  if (!gmail) {
    if (isProd) throw new Error('Mail is not configured (set GMAIL_USER and GMAIL_APP_PASSWORD)');
    // Dev convenience only: lets the flow work before credentials exist. Never runs in production.
    console.warn(`[mailer] GMAIL_USER/GMAIL_APP_PASSWORD not set - email NOT sent. To: ${to} | ${subject}
${text}`);
    return;
  }

  // Gmail rewrites the From address to the authenticated account, so use it directly.
  await gmail.sendMail({ from: `Test Automation Dashboard <${process.env.GMAIL_USER}>`, to, subject, html, text });
}

function sendOtpEmail(to, code, purpose) {
  const isReset = purpose === 'password_reset';
  const subject = isReset ? 'Your password reset code' : 'Verify your email';
  const intro = isReset ? 'Use this code to reset your password.' : 'Use this code to verify your email address.';
  return sendMail({
    to,
    subject,
    text: `${intro}\n\nCode: ${code}\n\nIt expires in 10 minutes. If you did not request this, ignore this email.`,
    html: layout(
      subject,
      `<p>${intro}</p>
       <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:20px 0">${code}</p>
       <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`
    )
  });
}

function sendPasswordChangedEmail(to) {
  return sendMail({
    to,
    subject: 'Your password was changed',
    text: 'Your password was just changed. If this was not you, reset your password immediately.',
    html: layout(
      'Your password was changed',
      '<p>Your password was just changed and all existing sessions were signed out.</p><p>If this was not you, reset your password immediately.</p>'
    )
  });
}

module.exports = { sendOtpEmail, sendPasswordChangedEmail };
