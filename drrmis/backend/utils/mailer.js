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
const siteUrl = (u) => (u || process.env.FRONTEND_URL || 'https://cdrrmo-gingoog.web.app').replace(/\/+$/, '')

// One formal, mobile-friendly frame for every PDRA email. Built with tables
// and inline styles (what email apps support): full width on a phone,
// 560px wide on a computer.
function layout(inner, { preheader = '', url } = {}) {
  const site = siteUrl(url)
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
<body style="margin:0; padding:0; background:#eef2f7;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
        <tr><td style="background:#172554; padding:20px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px; vertical-align:middle;"><img src="${esc(site)}/cdrrmo-logo.png" width="44" height="44" alt="CDRRMO" style="display:block; border:0;"></td>
            <td style="vertical-align:middle;">
              <div style="color:#bfdbfe; font-size:11px; letter-spacing:1px; text-transform:uppercase;">City Government of Gingoog</div>
              <div style="color:#ffffff; font-size:17px; font-weight:bold; line-height:1.3;">City Disaster Risk Reduction and Management Office</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 24px 8px; font-size:15px; line-height:1.6;">
          ${inner}
        </td></tr>
        <tr><td style="padding:8px 24px 28px; font-size:15px; line-height:1.6;">
          <p style="margin:0;">Respectfully,</p>
          <p style="margin:0; font-weight:bold;">City Disaster Risk Reduction and Management Office</p>
          <p style="margin:0; color:#6b7280; font-size:13px;">Gingoog City, Misamis Oriental</p>
        </td></tr>
        <tr><td style="background:#f8fafc; border-top:1px solid #e5e7eb; padding:16px 24px; color:#6b7280; font-size:12px; line-height:1.5;">
          This is a system-generated message from the Pre-Disaster Risk Assessment (PDRA) System. Please do not reply to this email. If you did not expect this message, please inform the CDRRMO.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;"><tr>
    <td style="background:#1d4ed8; border-radius:8px;">
      <a href="${esc(href)}" style="display:inline-block; padding:12px 28px; color:#ffffff; text-decoration:none; font-weight:bold; font-size:15px;">${label}</a>
    </td>
  </tr></table>`

async function sendOtpEmail(toEmail, name, otp) {
  await sendEmail({
    to: toEmail,
    toName: name,
    subject: 'PDRA Password Reset Code',
    html: layout(`
      <p style="margin:0 0 16px;">Dear ${esc(name) || 'User'},</p>
      <p style="margin:0 0 16px;">We received a request to reset the password of your PDRA account. Please use the one-time code below to continue. This code will expire in <strong>10 minutes</strong>.</p>
      <div style="margin:0 0 16px; padding:18px 12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; text-align:center; font-size:30px; font-weight:bold; letter-spacing:8px; color:#1e3a8a; font-family:'Courier New', monospace;">${esc(otp)}</div>
      <p style="margin:0 0 16px; color:#4b5563; font-size:14px;">If you did not request a password reset, you may ignore this email. Your password will remain unchanged.</p>`,
      { preheader: `Your PDRA password reset code is ${otp}. It expires in 10 minutes.` }),
  })
}

// Login details for a new account (isReset=false) or a password CDRRMO just
// reset (isReset=true).
async function sendAccountEmail(toEmail, name, username, password, { isReset = false, siteUrl: site } = {}) {
  const url = siteUrl(site)
  const row = (label, value) => `
    <tr><td style="padding:10px 16px; border-bottom:1px solid #e5e7eb;">
      <div style="color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:.5px;">${label}</div>
      <div style="font-family:'Courier New', monospace; font-size:16px; font-weight:bold; color:#111827; word-break:break-all;">${esc(value)}</div>
    </td></tr>`
  await sendEmail({
    to: toEmail,
    toName: name,
    subject: isReset ? 'PDRA Account: Password Reset' : 'PDRA Account: Request Approved',
    html: layout(`
      <p style="margin:0 0 16px;">Dear ${esc(name) || 'User'},</p>
      <p style="margin:0 0 16px;">${isReset
        ? 'The password of your account in the Pre-Disaster Risk Assessment (PDRA) System has been reset by the CDRRMO. Please use the login details below to sign in.'
        : 'Your request for an account in the Pre-Disaster Risk Assessment (PDRA) System has been approved, and your account is now active. Please use the login details below to sign in.'}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px;">
        ${row('Username', username)}
        ${row('Password', password)}
      </table>
      ${button(`${url}/login`, 'Sign in to PDRA')}
      <p style="margin:16px 0 0; padding:12px 14px; background:#fffbeb; border-left:4px solid #f59e0b; border-radius:6px; color:#78350f; font-size:14px;">
        <strong>Important:</strong> Please keep your login details private and do not share them with anyone. You may change your password anytime in the system (Profile menu &rarr; Change Password).
      </p>`,
      { preheader: isReset ? 'Your PDRA password has been reset.' : 'Your PDRA account is now active.', url }),
  })
}

module.exports = { sendEmail, sendOtpEmail, sendAccountEmail, isEmailConfigured }