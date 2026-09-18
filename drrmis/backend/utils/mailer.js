// Uses Resend (https://resend.com) to send password reset emails - a free
// transactional email API. Much simpler than Gmail SMTP: no 2-Step
// Verification, no App Password, no need to own a specific Gmail account.
//
// Setup (5 minutes):
//   1. Sign up free at https://resend.com
//   2. Dashboard -> API Keys -> Create API Key -> copy it (starts with "re_")
//   3. On Render, add ONE environment variable:
//        RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxx
//   That's it - no domain purchase or DNS setup required. Emails send from
//   Resend's shared "onboarding@resend.dev" address, which works
//   out-of-the-box for a system like this.

async function sendOtpEmail(toEmail, name, otp) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Email is not configured on the server yet. Contact your system administrator.')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PDRA - Gingoog City CDRRMO <onboarding@resend.dev>',
      to: [toEmail],
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
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.message || `Resend API error (${res.status})`)
  }
}

module.exports = { sendOtpEmail }
