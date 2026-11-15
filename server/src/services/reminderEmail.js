// The reminder email. Email clients (Gmail, Outlook, Apple Mail) ignore most modern CSS, so this
// is built the way email has to be: nested tables, inline styles, web-safe fonts, no JavaScript.
// The <style> block only adds extras that some clients support (phone padding, dark mode tweaks).

const TIME_ZONE = 'Asia/Kolkata'; // campus placements in India: times shown in IST
const DEADLINES = ['Registration deadline', 'Offer deadline'];
const C = { ink: '#10231a', cream: '#fbf8ee', sand: '#f1ecdc', lime: '#d4f04c', line: '#e8e2cf', muted: '#5b6b62', soft: '#8a978f' };

// Accent colour, short label and one prep tip for each kind of round (matches the app's calendar colours)
const KINDS = {
  'Registration deadline': { color: '#e11d48', tint: '#fff1f3', label: 'Registration deadline', tip: 'Submit early. Placement portals slow down in the last hour.' },
  'Pre-placement talk': { color: '#0d9488', tint: '#effcf9', label: 'Pre-placement talk', tip: 'Note down the role, CTC break-up and bond. They often answer questions you would ask later.' },
  'Online assessment': { color: '#0284c7', tint: '#f0f9ff', label: 'Online assessment', tip: 'Charge your laptop, check your internet and webcam, and keep a rough sheet ready.' },
  'Group discussion': { color: '#7c3aed', tint: '#f5f3ff', label: 'Group discussion', tip: 'Open with a clear point, give others room to speak, and sum up at the end.' },
  'Technical interview': { color: '#d97706', tint: '#fffbeb', label: 'Technical interview', tip: 'Revise your projects end to end. Expect "why did you choose this?" for every tool you used.' },
  'HR interview': { color: '#ea580c', tint: '#fff7ed', label: 'HR interview', tip: 'Have a 60-second introduction ready, and two questions to ask them.' },
  'Offer deadline': { color: '#059669', tint: '#ecfdf5', label: 'Offer deadline', tip: 'Compare total CTC, bond and location on the Offers page before you accept.' },
  Other: { color: '#475569', tint: '#f1f5f9', label: 'Event', tip: '' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (date, opts) => new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, ...opts }).format(date);
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d);
const clock = (d) => fmt(d, { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase().replace(/\s+/g, ' ');
const isUrl = (s) => /^https?:\/\//i.test(s || '');

// "today" / "tomorrow" / "on Friday, 20 Nov"
function dayWord(start, now) {
  if (dayKey(start) === dayKey(now)) return 'today';
  if (dayKey(start) === dayKey(new Date(+now + 864e5))) return 'tomorrow';
  return `on ${fmt(start, { weekday: 'long', day: 'numeric', month: 'short' })}`;
}

// "in 16 minutes" / "in 3 hours" / "in 1 day"
function countdown(start, now) {
  const mins = Math.max(0, Math.round((start - now) / 60000));
  if (mins < 60) return `in ${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

// Same link format as the app's "Add to Google Calendar" button
function googleCalendarUrl(event, title) {
  const ics = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(event.start);
  const end = event.allDay ? new Date(+start + 864e5) : new Date(Math.max(+new Date(event.end || start), +start + 30 * 60e3));
  const dates = event.allDay ? `${dayKey(start).replace(/-/g, '')}/${dayKey(end).replace(/-/g, '')}` : `${ics(start)}/${ics(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: title, dates,
    details: [event.application?.role && `Role: ${event.application.role}`, event.mode && `Mode: ${event.mode}`, 'Added from PlaceTrack'].filter(Boolean).join('\n'),
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function button(href, label, primary) {
  const bg = primary ? C.ink : '#ffffff';
  const fg = primary ? C.lime : C.ink;
  const border = primary ? C.ink : C.line;
  // inline-block links in one cell wrap onto a new line on narrow phones instead of overflowing
  return `<a href="${esc(href)}" target="_blank" style="display:inline-block;margin:0 6px 8px 0;background:${bg};color:${fg};border:1px solid ${border};border-radius:10px;padding:12px 18px;font-weight:700;font-size:14px;line-height:1;text-decoration:none;white-space:nowrap">${esc(label)}</a>`;
}

function buildReminder(event, user, now = new Date()) {
  const appUrl = process.env.CLIENT_URL || 'https://placetrack-five.vercel.app';
  const kind = KINDS[event.type] || KINDS.Other;
  const isDeadline = DEADLINES.includes(event.type);
  const company = event.application?.company || 'Your application';
  const role = event.application?.role;
  const what = event.title || kind.label; // "Other" with no title reads as "Event"
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : start;
  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';

  const day = dayWord(start, now);
  const time = event.allDay ? 'All day' : isDeadline || +end <= +start ? clock(start) : `${clock(start)} – ${clock(end)}`;
  const soon = countdown(start, now);
  const headline = isDeadline
    ? `${what} closes ${day}${event.allDay ? '' : ` at ${clock(start)}`}`
    : `${what} ${day}${event.allDay ? '' : ` at ${clock(start)}`}`;
  const subject = `⏰ ${company} · ${headline}`;

  const list = event.checklist || [];
  const doneCount = list.filter((c) => c.done).length;
  const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;
  const joinUrl = isUrl(event.location) ? event.location : null;
  const place = !isDeadline && event.location && !joinUrl ? event.location : null;
  const calendarUrl = `${appUrl}/calendar`;
  const settingsUrl = `${appUrl}/settings`;

  // Short line shown next to the subject in the inbox list
  const preheader = [time === 'All day' ? `${day[0].toUpperCase()}${day.slice(1)}, all day` : `${time} IST`, !isDeadline && event.mode, list.length && `${doneCount} of ${list.length} prep items done`].filter(Boolean).join(' · ');

  const details = [
    ['When', `${fmt(start, { weekday: 'long', day: 'numeric', month: 'long' })}${event.allDay ? '' : `, ${time} IST`}`],
    role && ['Role', role],
    !isDeadline && event.mode && ['Mode', event.mode],
    place && ['Where', place],
    joinUrl && ['Link', `<a href="${esc(joinUrl)}" style="color:${C.ink};text-decoration:underline">${esc(joinUrl.replace(/^https?:\/\//, '').slice(0, 48))}</a>`, true],
  ].filter(Boolean);

  const detailRows = details.map(([k, v, raw], i) => `
              <tr>
                <td style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ''}color:${C.soft};font-size:13px;width:84px;vertical-align:top">${esc(k)}</td>
                <td style="padding:12px 0;${i ? `border-top:1px solid ${C.line};` : ''}color:${C.ink};font-size:14px;font-weight:600;vertical-align:top">${raw ? v : esc(v)}</td>
              </tr>`).join('');

  const checklist = list.length ? `
          <tr><td style="padding:8px 32px 0" class="px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border:1px solid ${C.line};border-radius:14px">
              <tr><td style="padding:18px 20px">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="font-size:14px;font-weight:700;color:${C.ink}">Your prep</td>
                  <td align="right" style="font-size:13px;color:${C.muted}">${doneCount} of ${list.length} done</td>
                </tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 6px;border-radius:99px;overflow:hidden;background:${C.line}"><tr>
                  ${pct > 0 ? `<td width="${pct}%" style="height:8px;background:${C.ink};font-size:0;line-height:0">&nbsp;</td>` : ''}
                  ${pct < 100 ? `<td style="height:8px;font-size:0;line-height:0">&nbsp;</td>` : ''}
                </tr></table>
                ${list.slice(0, 8).map((c) => `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px"><tr>
                  <td style="width:22px;vertical-align:top;padding-top:1px"><span style="display:inline-block;width:14px;height:14px;border-radius:4px;border:1.5px solid ${c.done ? C.ink : C.soft};background:${c.done ? C.ink : '#ffffff'};color:${C.lime};font-size:11px;line-height:14px;text-align:center;font-weight:900">${c.done ? '&#10003;' : '&nbsp;'}</span></td>
                  <td style="font-size:14px;line-height:1.45;color:${c.done ? C.soft : C.ink};${c.done ? 'text-decoration:line-through;' : ''}">${esc(c.text)}</td>
                </tr></table>`).join('')}
                ${list.length > 8 ? `<p style="margin:8px 0 0;font-size:13px;color:${C.muted}">+ ${list.length - 8} more in PlaceTrack</p>` : ''}
                ${doneCount === list.length ? `<p style="margin:10px 0 0;font-size:14px;font-weight:700;color:${C.ink}">All done. You're ready.</p>` : ''}
              </td></tr>
            </table>
          </td></tr>` : '';

  const tip = kind.tip ? `
          <tr><td style="padding:16px 32px 0" class="px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid ${kind.color};background:${kind.tint};border-radius:0 10px 10px 0">
              <tr><td style="padding:12px 16px;font-size:13px;line-height:1.5;color:${C.ink}"><b>Quick tip:</b> ${esc(kind.tip)}</td></tr>
            </table>
          </td></tr>` : '';

  const buttons = [
    joinUrl && button(joinUrl, 'Join meeting', true),
    button(calendarUrl, 'Open in PlaceTrack', !joinUrl),
    !isDeadline && button(googleCalendarUrl(event, `${company}: ${what}`), 'Add to Google Calendar', false),
  ].filter(Boolean).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
<style>
  @media (max-width: 600px) {
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .h1 { font-size: 24px !important; }
    .tile { display: none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.sand};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}&nbsp;&#8199;&#847;&nbsp;&#8199;&#847;&nbsp;&#8199;&#847;&nbsp;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand}">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

      <!-- Brand -->
      <tr><td style="padding:0 4px 14px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;height:28px;background:${C.ink};border-radius:8px;text-align:center;vertical-align:middle;color:${C.lime};font-weight:900;font-size:15px;line-height:28px">P</td>
          <td style="padding-left:10px;font-weight:900;font-size:15px;letter-spacing:1.5px;color:${C.ink}">PLACETRACK</td>
        </tr></table>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:20px;overflow:hidden">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="height:6px;background:${kind.color};font-size:0;line-height:0">&nbsp;</td></tr>

          <!-- Headline -->
          <tr><td style="padding:28px 32px 8px" class="px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:top">
                <span style="display:inline-block;background:${kind.tint};color:${kind.color};border-radius:99px;padding:5px 11px;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase">${esc(kind.label)} &middot; ${esc(soon)}</span>
                <p style="margin:16px 0 4px;font-size:14px;color:${C.muted}">Hi ${esc(firstName)}, a reminder for</p>
                <h1 class="h1" style="margin:0;font-size:28px;line-height:1.2;font-weight:800;color:${C.ink}">${esc(company)}</h1>
                <p style="margin:6px 0 0;font-size:17px;line-height:1.4;color:${C.ink}">${esc(headline[0].toUpperCase() + headline.slice(1))}</p>
              </td>
              <td class="tile" style="width:76px;vertical-align:top;padding-left:16px">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:76px;border:1px solid ${C.line};border-radius:14px;overflow:hidden;text-align:center">
                  <tr><td style="background:${C.ink};color:${C.lime};font-size:11px;font-weight:800;letter-spacing:1px;padding:5px 0">${esc(fmt(start, { month: 'short' }).toUpperCase())}</td></tr>
                  <tr><td style="font-size:30px;font-weight:800;color:${C.ink};padding:6px 0 0;line-height:1">${esc(fmt(start, { day: 'numeric' }))}</td></tr>
                  <tr><td style="font-size:11px;color:${C.muted};padding:2px 0 8px">${esc(fmt(start, { weekday: 'short' }))}</td></tr>
                </table>
              </td>
            </tr></table>
          </td></tr>

          <!-- Details -->
          <tr><td style="padding:12px 32px 4px" class="px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows}
            </table>
          </td></tr>
${checklist}
${tip}
          <!-- Actions -->
          <tr><td style="padding:24px 32px 20px" class="px">
            ${buttons}
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:${C.muted}">
        You get one email per round or deadline, about a day before it.<br>
        <a href="${esc(settingsUrl)}" style="color:${C.muted};text-decoration:underline">Turn off reminder emails</a> &nbsp;&middot;&nbsp; <a href="${esc(calendarUrl)}" style="color:${C.muted};text-decoration:underline">Your calendar</a>
        <p style="margin:12px 0 0;color:${C.soft}">PlaceTrack &middot; your campus placement tracker</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hi ${firstName},`,
    '',
    `${company}: ${headline} (${soon}).`,
    '',
    ...details.map(([k, v, raw]) => `${k}: ${raw ? joinUrl : v}`),
    list.length ? `\nYour prep: ${doneCount} of ${list.length} done\n${list.map((c) => `${c.done ? '[x]' : '[ ]'} ${c.text}`).join('\n')}` : '',
    kind.tip ? `\nQuick tip: ${kind.tip}` : '',
    '',
    `Open in PlaceTrack: ${calendarUrl}`,
    `Turn off reminder emails: ${settingsUrl}`,
  ].join('\n');

  return { subject, html, text, preheader };
}

module.exports = { buildReminder };
