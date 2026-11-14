// Date helpers, clash detection and calendar exports for the Calendar page.
import { DEADLINE_TYPES } from './constants';

const DAY = 864e5;
export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

// Weeks start on Monday
export const startOfWeek = (d) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); };
// The 6x7 grid shown for a month (always 42 days, so the layout never jumps)
export function monthGrid(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '\u202f');
export const fmtDay = (d, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('en-IN', opts);
export const fmtMonth = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export const isDeadline = (e) => DEADLINE_TYPES.includes(e.type) || e.kind === 'due' || +new Date(e.end) === +new Date(e.start);
export const timeLabel = (e) => e.allDay ? 'All day' : isDeadline(e) ? `Due ${fmtTime(e.start)}` : `${fmtTime(e.start)} – ${fmtTime(e.end)}`;

// Timed events whose times overlap (deadlines and all-day items never clash).
// Returns a Set of the ids involved in at least one clash.
export function findClashIds(events) {
  const timed = events.filter((e) => !e.done && !e.allDay && !isDeadline(e)).sort((a, b) => new Date(a.start) - new Date(b.start));
  const ids = new Set();
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length && new Date(timed[j].start) < new Date(timed[i].end); j++) {
      ids.add(timed[i]._id); ids.add(timed[j]._id);
    }
  }
  return ids;
}

export function eventTitle(e) {
  const company = e.application?.company;
  return e.title || (company ? `${company}: ${e.type}` : e.type);
}

// ---- Exports so students get reminders in the calendar app they already use ----
const icsDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// Deadlines get a 30-minute slot ending at the deadline, so calendar apps show them properly
const exportSpan = (e) => isDeadline(e)
  ? [new Date(+new Date(e.start) - 30 * 60e3), new Date(e.start)]
  : [new Date(e.start), new Date(e.end)];

export function googleCalendarUrl(e) {
  const [s, en] = exportSpan(e);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(e),
    dates: `${icsDate(s)}/${icsDate(en)}`,
    details: [e.application?.role && `Role: ${e.application.role}`, e.mode && `Mode: ${e.mode}`, e.notes, 'Added from PlaceTrack'].filter(Boolean).join('\n'),
    location: e.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const icsText = (s = '') => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);

// .ics file with a reminder 1 hour before each event (works with Google, Apple and Outlook calendars)
export function buildIcs(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PlaceTrack//Placement calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:PlaceTrack placements'];
  for (const e of events) {
    const [s, en] = exportSpan(e);
    lines.push('BEGIN:VEVENT', `UID:${e._id}@placetrack`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(s)}`, `DTEND:${icsDate(en)}`,
      `SUMMARY:${icsText(eventTitle(e))}`,
      `DESCRIPTION:${icsText([e.application?.role && `Role: ${e.application.role}`, e.mode && `Mode: ${e.mode}`, e.notes].filter(Boolean).join('\n'))}`,
      ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(eventTitle(e))}`, 'TRIGGER:-PT1H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadFile(name, text, type = 'text/calendar') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export { DAY };
