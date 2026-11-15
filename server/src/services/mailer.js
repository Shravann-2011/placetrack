// Sends email through Brevo's HTTPS API.
// Why not SMTP (Nodemailer)? Render's free tier blocks the SMTP ports (25/465/587),
// but ordinary HTTPS requests work, so we call Brevo's REST endpoint with fetch.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

function isMailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM);
}

// MAIL_FROM can be "PlaceTrack <you@gmail.com>" or just "you@gmail.com"
function parseFrom(value) {
  const m = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || 'PlaceTrack', email: m[2] } : { name: 'PlaceTrack', email: value.trim() };
}

async function sendMail({ to, toName, subject, html, text }) {
  if (!isMailConfigured()) throw new Error('Email is not set up on the server (BREVO_API_KEY / MAIL_FROM missing)');
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: parseFrom(process.env.MAIL_FROM),
      to: [{ email: to, ...(toName && { name: toName }) }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

module.exports = { sendMail, isMailConfigured, parseFrom };
