const nodemailer = require('nodemailer')

// Uses Gmail SMTP with an App Password (free — no paid email service needed).
// Requires two environment variables on Render:
//   EMAIL_USER = any Gmail address you already have — CDRRMO's own personal
//                Gmail works fine, no need to create a dedicated new one.
//                This is the account emails are SENT FROM (the "mailman").
//                Each recipient — e.g. a Barangay Official — still receives
//                the OTP at their own individual email, the one on file for
//                their account, not this sender address.
//   EMAIL_PASS = a 16-character Gmail App Password (NOT the normal Gmail password —
//                generate one at https://myaccount.google.com/apppasswords,
//                requires 2-Step Verification to be enabled on that Gmail account)
let transporter = null

function getTransporter() {
  if (transporter) return transporter
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('EMAIL_USER / EMAIL_PASS not set — password reset emails will fail until configured on Render.')
    return null
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  })
  return transporter
}

async function sendOtpEmail(toEmail, name, otp) {
  const t = getTransporter()
  if (!t) throw new Error('Email is not configured on the server yet. Contact your system administrator.')
  await t.sendMail({
    from: `"PDRA — Gingoog City CDRRMO" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your PDRA Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#1d4ed8;">PDRA — Gingoog City CDRRMO</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your password. Use the one-time code below — it expires in 10 minutes.</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f3f4f6; padding: 16px; border-radius: 8px;">${otp}</p>
        <p style="color:#6b7280; font-size: 13px;">If you did not request this, you can safely ignore this email — your password will not be changed.</p>
      </div>
    `,
  })
}

module.exports = { sendOtpEmail }