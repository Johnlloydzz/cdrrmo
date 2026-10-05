// Sends PDRA's emails (password reset codes, new-account login details).
//
// Two free email services are supported — set ONE of them on Render
// (Dashboard → cdrrmo-backend → Environment):
//
//  A) Brevo (recommended — can email ANY address with no domain needed)
//       1. Sign up free at https://www.brevo.com (300 emails/day)
//       2. Senders, Domains & Dedicated IPs → Senders → add and verify the
//          Gmail address PDRA will send from (Brevo emails you a link)
//       3. SMTP & API → API Keys → Generate a new API key
//       4. On Render add:
//            BREVO_API_KEY   = xkeysib-…
//            MAIL_FROM_EMAIL = the Gmail you verified in step 2
//            MAIL_FROM_NAME  = PDRA - Gingoog City CDRRMO   (optional)
//
//  B) Resend (RESEND_API_KEY). Without your own verified domain it can only
//     send to the email you signed up with — fine for testing, not for
//     emailing other officials.
//
// Both are plain HTTPS calls, so they work on Render's free tier (which
// doesn't allow outgoing SMTP connections).

const FROM_NAME = () => process.env.MAIL_FROM_NAME || 'PDRA - Gingoog City CDRRMO'

function isEmailConfigured() {
  return !!((process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL) || process.env.RESEND_API_KEY)
}

async function sendEmail({ to, toName, subject, html }) {
  if (process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: FROM_NAME(), email: process.env.MAIL_FROM_EMAIL },
        to: [{ email: to, name: toName || undefined }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `Brevo API error (${res.status})`)
    }
    return
  }

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME()} <onboarding@resend.dev>`, to: [to], subject, html }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `Resend API error (${res.status})`)
    }
    return
  }

  throw new Error('Email is not configured on the server yet. Contact your system administrator.')
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function layout(inner) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color:#1f2937;">
      <h2 style="color:#1d4ed8; margin-bottom: 4px;">PDRA - Gingoog City CDRRMO</h2>
      <p style="color:#6b7280; font-size: 13px; margin-top: 0;">Pre-Disaster Risk Assessment System</p>
      ${inner}
      <p style="color:#9ca3af; font-size: 12px; margin-top: 24px;">This is an automated message from PDRA. Please don't reply to this email.</p>
    </div>`
}

async function sendOtpEmail(toEmail, name, otp) {
  await sendEmail({
    to: toEmail,
    toName: name,
    subject: 'Your PDRA Password Reset Code',
    html: layout(`
      <p>Hi ${esc(name) || 'there'},</p>
      <p>We received a request to reset your password. Use the one-time code below - it expires in 10 minutes.</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f3f4f6; padding: 16px; border-radius: 8px;">${esc(otp)}</p>
      <p style="color:#6b7280; font-size: 13px;">If you did not request this, you can safely ignore this email - your password will not be changed.</p>`),
  })
}

// Login details for a new account (isReset=false) or a password CDRRMO just
// reset (isReset=true).
async function sendAccountEmail(toEmail, name, username, password, { isReset = false, siteUrl } = {}) {
  const url = siteUrl || process.env.FRONTEND_URL || 'https://cdrrmo-gingoog.web.app'
  await sendEmail({
    to: toEmail,
    toName: name,
    subject: isReset ? 'Your PDRA password was reset' : 'Your PDRA account is ready',
    html: layout(`
      <p>Hi ${esc(name) || 'there'},</p>
      <p>${isReset
        ? 'CDRRMO has reset the password for your PDRA account. Here are your new login details:'
        : 'Your request was approved and your PDRA account has been created. Here are your login details:'}</p>
      <table style="width:100%; background:#f3f4f6; border-radius:8px; padding:12px; font-size:15px;">
        <tr><td style="color:#6b7280; padding:4px 8px;">Username</td><td style="font-family:monospace; font-weight:bold; padding:4px 8px;">${esc(username)}</td></tr>
        <tr><td style="color:#6b7280; padding:4px 8px;">Password</td><td style="font-family:monospace; font-weight:bold; padding:4px 8px;">${esc(password)}</td></tr>
      </table>
      <p style="margin-top:16px;"><a href="${esc(url)}/login" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:10px 18px; border-radius:8px; font-weight:bold;">Sign in to PDRA</a></p>
      <p style="color:#b45309; font-size: 13px;"><strong>For your security:</strong> after signing in, change this password right away (profile menu → Change Password), and don't share it with anyone.</p>`),
  })
}

module.exports = { sendEmail, sendOtpEmail, sendAccountEmail, isEmailConfigured }