// Uses Gmail SMTP (via nodemailer) to send password reset emails - completely
// free, no domain to buy or verify, and works for any recipient email
// address (unlike Resend's free onboarding@resend.dev sender, which can only
// email the Resend account's own address until a domain is verified).
//
// Setup (5 minutes):
//   1. Turn on 2-Step Verification on the Gmail account you want to send
//      from: https://myaccount.google.com/security
//   2. Go to https://myaccount.google.com/apppasswords, create an App
//      Password (choose "Mail" as the app), and copy the 16-character code.
//   3. On Render, add TWO environment variables:
//        GMAIL_USER          = your-account@gmail.com
//        GMAIL_APP_PASSWORD  = the 16-character app password (no spaces)
//   That's it - emails send from your own Gmail address to any recipient.

const nodemailer = require('nodemailer')

let transporter

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD
    if (!user || !pass) throw new Error('Email is not configured on the server yet. Contact your system administrator.')
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
  }
  return transporter
}

async function sendOtpEmail(toEmail, name, otp) {
  const user = process.env.GMAIL_USER
  if (!user) throw new Error('Email is not configured on the server yet. Contact your system administrator.')

  await getTransporter().sendMail({
    from: `"PDRA - Gingoog City CDRRMO" <${user}>`,
    to: toEmail,
    subject: 'Your PDRA Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#1d4ed8;">PDRA - Gingoog City CDRRMO</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your password. Use the one-time code below - it expires in 10 minutes.</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f3f4f6; padding: 16px; border-radius: 8px;">${otp}</p>
        <p style="color:#6b7280; font-size: 13px;">If you did not request this, you can safely ignore this email - your password will not be changed.</p>
      </div>
    `,
  })
}

module.exports = { sendOtpEmail }