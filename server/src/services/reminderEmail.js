// The reminder email, one wording per kind of reminder: a pre-placement talk asks you to join the
// talk, an online assessment asks you to open the test, a deadline asks you to register, and so on.
// Only real details from the event are used (company, time, venue or link); nothing is made up.
//
// Email clients (Gmail, Outlook, Apple Mail) ignore most modern CSS, so this is built the way email
// has to be: tables, inline styles, web-safe fonts. The <style> block only tunes phones.

const TIME_ZONE = 'Asia/Kolkata'; // campus placements in India: times shown in IST
const C = { ink: '#10231a', page: '#f3f1ea', card: '#ffffff', box: '#f8f6ef', line: '#e6e1d3', body: '#3f4a44', muted: '#77837c', lime: '#d4f04c' };
const DOT = {
  'Registration deadline': '#e11d48', 'Pre-placement talk': '#0d9488', 'Online assessment': '#0284c7', 'Group discussion': '#7c3aed',
  'Technical interview': '#d97706', 'HR interview': '#ea580c', 'Offer deadline': '#059669', Other: '#64748b',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (date, opts) => new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, ...opts }).format(date);
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d);
const clock = (d) => fmt(d, { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase().replace(/\s+/g, '\u00a0'); // "11:59 PM" never splits across lines
const isUrl = (s) => /^https?:\/\//i.test(s || '');
const minus = (d, mins) => new Date(+d - mins * 60e3);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// "today" / "tonight" / "tomorrow" / "on Friday, 20 Nov"
function dayWord(start, now, { night = false } = {}) {
  if (dayKey(start) === dayKey(now)) return night && +fmt(start, { hour: 'numeric', hour12: false }) >= 18 ? 'tonight' : 'today';
  if (dayKey(start) === dayKey(new Date(+now + 864e5))) return 'tomorrow';
  return `on ${fmt(start, { weekday: 'long', day: 'numeric', month: 'short' })}`;
}

// "in 16 min" / "in 3 hours" / "in 1 day"
function countdown(start, now) {
  const mins = Math.max(0, Math.round((start - now) / 60000));
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

// Where the round happens, in words: the meeting platform, the venue, or just the mode
function placeOf(event, link) {
  if (link) {
    const host = link.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./, '');
    const known = [[/meet\.google/, 'Google Meet'], [/zoom\.us/, 'Zoom'], [/teams\.(microsoft|live)/, 'Microsoft Teams'], [/hackerrank/, 'HackerRank'], [/hackerearth/, 'HackerEarth'], [/mettl/, 'Mercer Mettl'], [/webex/, 'Webex']];
    return (known.find(([re]) => re.test(host)) || [null, host])[1];
  }
  return event.location || event.mode || null;
}

// The words and the main button for each kind of reminder
function copyFor(event, ctx) {
  const { company, at, when, link, venue, appUrl, jobLink } = ctx;
  const timed = !event.allDay;
  const start = new Date(event.start);
  const view = { label: 'View in PlaceTrack', href: `${appUrl}/calendar` };
  const join = (label) => (link ? { label, href: link } : view);
  const logistics = (earlyMins, word) => (link
    ? `It's online. Join from the link below a few minutes before ${timed ? clock(start) : 'it starts'}.`
    : venue
      ? `It's at ${venue}.${timed ? ` Try to be there by ${clock(minus(start, earlyMins))}.` : ''}`
      : `The ${word} link or venue usually comes from the placement cell or the company before it starts.`);

  switch (event.type) {
    case 'Pre-placement talk':
      return {
        subject: `Pre-placement talk: ${company}, ${when}${at}`,
        headline: `Join the ${company} pre-placement talk ${when}${at}`,
        body: logistics(10, 'joining'),
        button: join('Join the talk'),
      };
    case 'Online assessment':
      return {
        subject: `Online assessment: ${company}, ${when}${at}`,
        headline: `Take the ${company} online assessment ${when}${at}`,
        body: link
          ? 'Open the test from the link below. Use a laptop on a steady connection, with your webcam working.'
          : 'The test link usually arrives by email from the company or the test platform shortly before it starts. Use a laptop on a steady connection.',
        button: join('Open the test'),
      };
    case 'Group discussion':
      return {
        subject: `Group discussion: ${company}, ${when}${at}`,
        headline: `Group discussion with ${company} ${when}${at}`,
        body: logistics(15, 'meeting'),
        button: join('Join the discussion'),
      };
    case 'Technical interview':
      return {
        subject: `Technical interview: ${company}, ${when}${at}`,
        headline: `Your technical interview with ${company} is ${when}${at}`,
        body: `${logistics(15, 'meeting')} Keep your resume open; they will ask about the projects on it.`,
        button: join('Join the interview'),
      };
    case 'HR interview':
      return {
        subject: `HR interview: ${company}, ${when}${at}`,
        headline: `Your HR interview with ${company} is ${when}${at}`,
        body: logistics(15, 'meeting'),
        button: join('Join the interview'),
      };
    case 'Registration deadline':
      return {
        subject: `${company} registration closes ${when}${at}`,
        headline: `Register for ${company} before ${timed ? clock(start) : 'the end of the day'} ${when}`,
        body: 'If you haven\'t registered yet, do it now. If you already have, you can ignore this email.',
        button: jobLink ? { label: 'Open the registration form', href: jobLink } : view,
      };
    case 'Offer deadline':
      return {
        subject: `Reply to your ${company} offer by ${timed ? `${clock(start)} ` : ''}${when.replace(/^on /, '')}`,
        headline: `Reply to your ${company} offer by ${timed ? `${clock(start)} ` : ''}${when.replace(/^on /, '')}`,
        body: 'Accept or decline it on the company\'s portal or by email, as their offer letter says. Compare it with your other offers first.',
        button: { label: 'Compare my offers', href: `${appUrl}/offers` },
      };
    default: {
      const name = event.title || 'Event';
      return {
        subject: `${name}: ${company}, ${when}${at}`,
        headline: `${name === 'Event' ? `${company} event` : `${name} with ${company}`} ${when}${at}`,
        body: link ? 'Join from the link below.' : venue ? `It's at ${venue}.` : '',
        button: join('Join the meeting'),
      };
    }
  }
}

// Same link format as the app's "Add to Google Calendar" button
function googleCalendarUrl(event, title) {
  const ics = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(event.start);
  const end = new Date(Math.max(+new Date(event.end || start), +start + 30 * 60e3));
  const dates = event.allDay ? `${dayKey(start).replace(/-/g, '')}/${dayKey(new Date(+start + 864e5)).replace(/-/g, '')}` : `${ics(start)}/${ics(end)}`;
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates, details: 'Added from PlaceTrack', location: event.location || '' });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function fact(label, value, sub) {
  return `<div class="fact" style="display:inline-block;vertical-align:top;width:31%;min-width:150px;margin:0 0 4px;padding:14px 0 0">
          <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${C.muted}">${esc(label)}</div>
          <div style="margin-top:4px;font-size:16px;font-weight:700;line-height:1.3;color:${C.ink}">${esc(value)}</div>
          ${sub ? `<div style="margin-top:2px;font-size:13px;color:${C.muted}">${esc(sub)}</div>` : ''}
        </div>`;
}

function buildReminder(event, user, now = new Date()) {
  const appUrl = process.env.CLIENT_URL || 'https://placetrack-five.vercel.app';
  const isDeadline = ['Registration deadline', 'Offer deadline'].includes(event.type);
  const company = event.application?.company || 'your application';
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : start;
  const timed = !event.allDay;
  const link = isUrl(event.location) ? event.location : null;
  const venue = !link && event.location ? event.location : null;
  const jobLink = isUrl(event.application?.jobLink) ? event.application.jobLink : null;
  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';
  const kindLabel = event.type === 'Other' ? (event.title || 'Event') : event.type;

  const when = dayWord(start, now, { night: isDeadline });
  const at = timed ? ` at ${clock(start)}` : '';
  const copy = copyFor(event, { company, at, when, link, venue, appUrl, jobLink });

  // The three facts: day, time, place (deadlines: day, time, and what is due)
  const timeValue = !timed ? 'All day' : isDeadline || +end <= +start ? clock(start) : `${clock(start)} – ${clock(end)}`;
  const hasEnd = timed && !isDeadline && +end > +start;
  const place = placeOf(event, link);
  const facts = [
    fact('Date', fmt(start, { weekday: 'long', day: 'numeric', month: 'short' })),
    fact(isDeadline ? 'Closes at' : 'Time', timed ? clock(start) : 'All day', timed ? (hasEnd ? `until ${clock(end)} IST` : 'IST') : ''),
    isDeadline
      ? fact('Role', event.application?.role || '—')
      : fact(link ? 'Join on' : 'Where', place || 'To be shared'),
  ].join('');

  const secondary = [
    !isDeadline && `<a href="${esc(googleCalendarUrl(event, `${company}: ${kindLabel}`))}" style="color:${C.ink};text-decoration:underline">Add to Google Calendar</a>`,
    copy.button.href !== `${appUrl}/calendar` && `<a href="${esc(`${appUrl}/calendar`)}" style="color:${C.ink};text-decoration:underline">View in PlaceTrack</a>`,
  ].filter(Boolean).join(`<span style="color:${C.line}">&nbsp;&nbsp;|&nbsp;&nbsp;</span>`);

  const preheader = `${cap(when.replace(/^on /, ''))}${at}${place && !isDeadline ? `, ${place}` : ''}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(copy.subject)}</title>
<style>
  @media (max-width: 600px) {
    .pad { padding-left: 22px !important; padding-right: 22px !important; }
    .h1 { font-size: 23px !important; }
    .fact { width: 100% !important; }
    .btn { display: block !important; text-align: center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}&nbsp;&#8199;&#847;&nbsp;&#8199;&#847;&nbsp;&#8199;&#847;&nbsp;&#8199;&#847;&nbsp;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}">
  <tr><td align="center" style="padding:32px 12px 40px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
      <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:14px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

          <tr><td class="pad" style="padding:26px 36px 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:14px;font-weight:800;letter-spacing:.2px;color:${C.ink}">
                <span style="display:inline-block;width:18px;height:18px;border-radius:5px;background:${C.ink};color:${C.lime};font-size:11px;line-height:18px;text-align:center;vertical-align:-3px;margin-right:7px">P</span>PlaceTrack
              </td>
              <td align="right" style="font-size:12px;color:${C.muted};white-space:nowrap">
                <span style="display:inline-block;width:7px;height:7px;border-radius:7px;background:${DOT[event.type] || DOT.Other};margin-right:6px;vertical-align:1px"></span>${esc(kindLabel)}
              </td>
            </tr></table>
          </td></tr>

          <tr><td class="pad" style="padding:30px 36px 0">
            <p style="margin:0 0 10px;font-size:14px;color:${C.muted}">Hi ${esc(firstName)}, ${isDeadline ? 'closing' : 'starting'} ${esc(countdown(start, now))}${event.application?.role && !isDeadline ? ` &middot; ${esc(event.application.role)}` : ''}</p>
            <h1 class="h1" style="margin:0;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-.3px;color:${C.ink}">${esc(copy.headline)}</h1>
            ${copy.body ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:${C.body}">${esc(copy.body)}</p>` : ''}
          </td></tr>

          <tr><td class="pad" style="padding:24px 36px 0">
            <div style="border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};padding:4px 0 16px">
        ${facts}
            </div>
          </td></tr>

          <tr><td class="pad" style="padding:26px 36px 0">
            <a class="btn" href="${esc(copy.button.href)}" target="_blank" style="display:inline-block;background:${C.ink};color:#ffffff;border-radius:8px;padding:14px 24px;font-size:15px;font-weight:700;line-height:1;text-decoration:none">${esc(copy.button.label)}</a>
          </td></tr>

          <tr><td class="pad" style="padding:18px 36px 30px;font-size:13px;line-height:1.6;color:${C.muted}">
            ${secondary}
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:20px 12px 0;text-align:center;font-size:12px;line-height:1.7;color:${C.muted}">
        PlaceTrack sends one reminder for each round on your calendar, about a day before.<br>
        <a href="${esc(`${appUrl}/settings`)}" style="color:${C.muted};text-decoration:underline">Turn off reminder emails</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hi ${firstName},`,
    '',
    `${copy.headline}.`,
    copy.body,
    '',
    `Date: ${fmt(start, { weekday: 'long', day: 'numeric', month: 'short' })}`,
    `${isDeadline ? 'Closes at' : 'Time'}: ${timeValue}${timed ? ' IST' : ''}`,
    !isDeadline && place ? `${link ? 'Join on' : 'Where'}: ${place}` : '',
    '',
    `${copy.button.label}: ${copy.button.href}`,
    '',
    `Turn off reminder emails: ${appUrl}/settings`,
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

  const plain = (t) => t.replace(/\u00a0/g, ' ');
  return { subject: plain(copy.subject), html, text: plain(text), preheader: plain(preheader) };
}

module.exports = { buildReminder };
