// Reads a pasted placement message (email, WhatsApp forward, notice) and pulls out the
// company, role, pay, eligibility, links and every dated round. Rule-based, no AI:
//  1. clean the text (WhatsApp *bold*, emojis, bullets)
//  2. dates/times are read by chrono-node (Indian DD/MM order, in the student's time zone)
//  3. each date's round type comes from the nearest keyword ("GD on Monday, interviews on Tuesday")
//     or from a heading line above it ("Online Assessment" / "Date: 20.11" / "Time: 2 PM")
//  4. a time on its own line ("Time: 9:30 AM") joins the date above it
//  5. labels ("Role:", "CTC:", "Venue:") and common sentence patterns fill in the rest
//  6. the wording hints at the stage: shortlisted / selected / regret to inform
// Anything it is not sure about is left empty for the student to fill in on the review screen.
const chrono = require('chrono-node');

const MAX_LENGTH = 10000;

// Common campus recruiters, used when the message has no "Company:" label
const KNOWN_COMPANIES = [
  'Tata Consultancy Services', 'TCS', 'Infosys', 'Wipro', 'HCLTech', 'HCL', 'Tech Mahindra', 'Cognizant', 'Accenture',
  'Capgemini', 'Deloitte', 'IBM', 'LTIMindtree', 'Mindtree', 'Hexaware', 'Mphasis', 'Zoho', 'Freshworks', 'Razorpay',
  'Swiggy', 'Zomato', 'Flipkart', 'Amazon', 'Microsoft', 'Google', 'Adobe', 'Oracle', 'SAP', 'Cisco', 'Intel', 'Qualcomm',
  'Samsung', 'PhonePe', 'Paytm', 'CRED', 'Meesho', 'Myntra', 'Ola', 'Uber', 'Goldman Sachs', 'JP Morgan', 'Morgan Stanley',
  'Deutsche Bank', 'Barclays', 'American Express', 'Walmart', 'Atlassian', 'Salesforce', 'ServiceNow', 'Juspay', 'Postman',
  'BrowserStack', 'Accolite', 'Persistent', 'Zensar', 'Bosch', 'Siemens', 'EY', 'KPMG', 'PwC', 'ThoughtWorks', 'Virtusa',
];

// Words that look like a company name in "X is conducting a drive" but are the college itself
const NOT_A_COMPANY = /\b(placement|cell|training|tpo|t&p|department|college|campus|students?|dear|greetings|university|institute|team|we|our|the|all|hi|hello|batch|drive|congratulations|shortlisted|you)\b/i;

// Round keywords. The one closest to a date decides that date's type; ties go to the earlier rule.
const ROUND_RULES = [
  { type: 'Registration deadline', re: /\b(regist\w*|apply|applications?|last date|deadline|forms?|fill|submit|on or before|clos(?:e|es|ing)|enrol\w*)\b/gi },
  { type: 'Offer deadline', re: /\b(accept\w*|offer letter|offer deadline|join(?:ing)? confirmation|confirm (?:your )?(?:offer|acceptance))\b/gi },
  { type: 'Pre-placement talk', re: /\b(pre[- ]placement|ppt|company presentation|info(?:rmation)? session|webinar|orientation)\b/gi },
  { type: 'Group discussion', re: /\b(group discussions?|gd)\b/gi },
  { type: 'HR interview', re: /\b(hr round|hr interviews?|hr discussion|managerial round)\b/gi },
  { type: 'Online assessment', re: /\b(online test|online assessment|aptitude|coding test|coding round|coding challenge|assessments?|oa|tests?|hackerrank|hackerearth|amcat|cocubes|mettl|ion|exam|written)\b/gi },
  { type: 'Technical interview', re: /\b(technical|interviews?|tech round|f2f|face[- ]to[- ]face)\b/gi },
];
const DEADLINES = ['Registration deadline', 'Offer deadline'];
// Dates that are worth knowing but are not a round to prepare for
const OTHER_TITLES = [
  { re: /\bresults?\b|\bannounce/i, title: 'Results', include: false },
  { re: /\bjoining date\b|\bdate of joining\b|\bdoj\b|\bjoin(?:ing)? on\b/i, title: 'Joining date', include: false },
  { re: /\bdrive\b|\bvisit/i, title: 'Campus drive', include: true },
];
const RESCHEDULED = /\b(postponed|rescheduled|preponed|shifted|moved|changed)\b/i;
const ONLINE = /\b(online|virtual|remote|zoom|google meet|ms teams|teams link|hackerrank|hackerearth|amcat|cocubes|mettl|tcs ion)\b/i;
const ON_CAMPUS = /\b(offline|in[- ]person|on[- ]campus|seminar hall|auditorium|hall|lab|block|room)\b/i;
const STAGE_FOR_ROUND = { 'Online assessment': 'Aptitude/OA', 'Group discussion': 'GD', 'Technical interview': 'Technical', 'HR interview': 'HR' };

const clean = (s) => s.replace(/\s+/g, ' ').replace(/^[\s:–—-]+|[\s.,;:–—-]+$/g, '').trim();
const titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// WhatsApp formatting, emojis and bullets get in the way of every pattern below
function normalize(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[\p{Extended_Pictographic}️‍→⇒➜➔]/gu, ' ')
    .replace(/\*+/g, '') // *bold*
    .replace(/(^|\s)[_~]+|[_~]+(?=\s|$|[:.,])/gm, '$1') // _italic_ ~strike~ (not the _ inside links)
    .replace(/^[ \t]*(?:[•●▪◦‣>]|[-–]\s|\d{1,2}[.)]\s)[ \t]*/gm, '') // bullets and "1." numbering
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

// A label's value ends at its line, or at the end of its sentence ("Role: Backend Intern. Register by...").
// Abbreviations like "Pvt." and "Ltd." don't end a sentence.
const SENTENCE_END = /(?<!\b(?:Pvt|Ltd|Inc|Co|Corp|No|Sr|Jr|Dr|Mr|Ms|St|Tech|Dept))\.\s+(?=[A-Z0-9])/;
function findLabel(text, labels, { allowPipes = false } = {}) {
  const re = new RegExp(`(?:^|\\n|\\b)(?:${labels.join('|')})\\s*[:\\-–]\\s*([^\\n${allowPipes ? '' : '|'};]+)`, 'i');
  const m = text.match(re);
  if (!m) return null;
  const value = clean(m[1].split(SENTENCE_END)[0]);
  return value ? { value, match: value } : null;
}

const LEGAL_SUFFIX = /[\s,]+(?:(?:pvt\.?|private)\s*(?:ltd\.?|limited)?|ltd\.?|limited|inc\.?|llp|corp\.?|corporation)\s*$/i;
const stripSuffix = (s) => { let out = s; while (LEGAL_SUFFIX.test(out)) out = out.replace(LEGAL_SUFFIX, ''); return out.trim(); };
const titleCaseIfLower = (s) => (s === s.toLowerCase() ? titleCase(s) : s);
const canonical = (name, known) => known.find((k) => k.toLowerCase() === name.toLowerCase()) || name;
const NAME = '([A-Z][\\w&.]*(?:\\s+(?:[A-Z][\\w&.]*|&))*)';

function findCompany(text, knownNames) {
  const label = findLabel(text, ['company(?: name)?', 'organi[sz]ation', 'recruiter', 'employer', 'name of (?:the )?company']);
  if (label) {
    const value = stripSuffix(titleCaseIfLower(label.value.split(/\s{2,}| - /)[0]));
    return { value, match: value };
  }
  // Names the student already tracks, then well-known recruiters (longest name first)
  const candidates = [...new Set([...knownNames, ...KNOWN_COMPANIES])].sort((a, b) => b.length - a.length);
  for (const name of candidates) {
    const m = text.match(new RegExp(`\\b${escapeRe(name)}\\b`, 'i'));
    if (m) return { value: canonical(name, knownNames), match: m[0] };
  }
  // "drive for Acme Labs" / "selected by Acme" / "Acme Labs is visiting campus"
  const patterns = [
    new RegExp(`\\b(?:drive|recruitment|hiring|selected|shortlisted|interview|internship|offer)\\s+(?:by|for|from|with|at|of)\\s+(?:the\\s+)?${NAME}`, 'g'),
    new RegExp(`\\b${NAME}\\s+(?:is\\s+|are\\s+)?(?:visiting|hiring|conducting|coming|recruiting|inviting)\\b`, 'g'),
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const value = stripSuffix(clean(m[1]).split(/\s+(?:for|as|on|in|at)\s+/)[0]);
      if (value.length > 1 && !NOT_A_COMPANY.test(value)) return { value, match: value };
    }
  }
  return null;
}

// Role words that end a job title ("Associate Software Engineer", "Data Analyst Intern")
const ROLE_NOUN = '(?:Engineers?|Developers?|Analysts?|Consultants?|Interns?|Trainees?|Associates?|Architects?|Scientists?|Managers?|Designers?|Executives?|Specialists?|Programmers?|Administrators?|Officers?|SDE(?:[- ]?\\d)?|MTS)';
const ROLE_STOP = /\s+(?:stipend|ctc|package|salary|location|with|at|in|on|from|for|and\s+the|is|will)\b.*$/i;
const ROLE_WORDS = '([A-Z][\\w+#/&-]*(?:\\s+(?:[A-Za-z][\\w+#/&-]*|&|-)){0,5})';

function findRole(text) {
  const label = findLabel(text, ['role', 'roles', 'position', 'designation', 'job title', 'job role', 'job profile', 'profile', 'post', 'opening']);
  if (label) {
    // "Role: Systems Engineer, CTC 3.6 LPA" -> stop where the next detail starts
    const value = clean(label.value.split(/\(|\|/)[0].replace(/[,;]?\s*\b(?:ctc|package|salary|stipend|location|eligibility|bond|batch)\b.*$/i, '')).replace(/\s+roles?$/i, '').slice(0, 80);
    return { value, match: value };
  }
  const tries = [
    new RegExp(`\\bfor\\s+the\\s+(?:role|position|post|profile)\\s+of\\s+(?:an?\\s+)?${ROLE_WORDS}`), // for the role of Data Analyst
    new RegExp(`\\bfor\\s+(?:the\\s+|an?\\s+)?${ROLE_WORDS}\\s+(?:roles?|positions?|profiles?|openings?)\\b`), // for the Data Analyst role
    new RegExp(`\\b(?:selected|shortlisted|offered|hired|position|join(?:ing)?)\\b[^.\\n]{0,40}?\\bas\\s+(?:an?\\s+)?${ROLE_WORDS}`), // selected ... as Project Engineer
    new RegExp(`\\b(?:hiring|recruiting|openings?)\\s+(?:for\\s+)?(?:the\\s+)?${ROLE_WORDS}\\s*(?:roles?|positions?|[.,\\n(])`),
    new RegExp(`\\b((?:[A-Z][\\w+#/&-]*\\s+){0,3}${ROLE_NOUN})\\b`), // last resort: any capitalised job title
  ];
  for (const re of tries) {
    const m = text.match(re);
    if (!m) continue;
    const value = clean(m[1].split(SENTENCE_END)[0].replace(/\.\s.*$/, '').replace(ROLE_STOP, ''));
    if (value.length > 1 && !NOT_A_COMPANY.test(value.split(' ')[0])) return { value, match: value };
  }
  return null;
}

// Pay: "CTC 6.5 LPA", "18-24 LPA", "₹6,50,000 p.a.", "Stipend: Rs. 25,000/- per month", "30K/month"
const MONEY = '(?:₹|rs\\.?|inr)?\\s*';
function findPay(text) {
  let m = text.match(new RegExp(`\\bstipend\\b[^\\n\\d₹]{0,25}${MONEY}([\\d,]+(?:\\.\\d+)?)\\s*(k)?\\s*(?:\\/-)?`, 'i'));
  if (m) {
    const amount = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
    if (amount >= 1000) return { stipendK: Math.round((amount / 1000) * 10) / 10, match: clean(m[0]) };
  }
  m = text.match(new RegExp(`${MONEY}([\\d,]+)\\s*(k)?\\s*(?:\\/-)?\\s*(?:\\/|per|p\\.?)\\s*(?:month|mo|m\\b|pm\\b)`, 'i'));
  if (m && /intern/i.test(text)) {
    const amount = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
    if (amount >= 1000) return { stipendK: Math.round((amount / 1000) * 10) / 10, match: clean(m[0]) };
  }
  m = text.match(new RegExp(`\\b(?:ctc|package|salary|compensation|pay)\\b[^\\n\\d₹]{0,20}${MONEY}(?:upto|up to)?\\s*([\\d.]+)\\s*(?:l\\b|lpa\\b|lakhs?\\b)?\\s*(?:(?:-|–|to)\\s*${MONEY}([\\d.]+))?\\s*(lpa|lakhs?\\s*(?:per annum|p\\.?\\s?a\\.?)?|l\\b)`, 'i'));
  if (m) return { lpa: Number(m[1]), upper: m[2] ? Number(m[2]) : null, match: clean(m[0]) };
  m = text.match(new RegExp(`${MONEY}([\\d,]{6,})\\s*(?:\\/-)?\\s*(?:per annum|p\\.?\\s?a\\.?|annually|per year|ctc)`, 'i'));
  if (m) return { lpa: Math.round((Number(m[1].replace(/,/g, '')) / 100000) * 100) / 100, match: clean(m[0]) };
  m = text.match(/\b([\d.]+)\s*(?:(?:-|–|to)\s*([\d.]+)\s*)?lpa\b/i);
  if (m) return { lpa: Number(m[1]), upper: m[2] ? Number(m[2]) : null, match: m[0] };
  return null;
}

function findLinks(text) {
  const re = /\b(?:https?:\/\/|www\.|forms\.gle\/|bit\.ly\/|docs\.google\.com\/|tinyurl\.com\/|lnkd\.in\/)[^\s<>()"'*]+/gi;
  return [...text.matchAll(re)].map((m) => {
    const raw = m[0].replace(/[.,;:!?)]+$/, '');
    return { url: /^https?:\/\//i.test(raw) ? raw : `https://${raw}`, match: raw };
  });
}

function findType(text) {
  const intern = /\bintern(ship)?s?\b/i.test(text);
  const fullTime = /\b(full[- ]?time|fte|ppo|permanent)\b/i.test(text);
  if (intern && fullTime) return 'Internship + Full-time';
  if (intern) return 'Internship';
  return 'Full-time';
}

// Eligibility, branches, batch and bond all go into the notes
function findNotes(text, pay) {
  const parts = [];
  const matches = [];
  const add = (label, found) => {
    if (!found) return;
    const value = found.value.replace(/^eligibility(?: criteria)?\s*[:\-–]\s*/i, '').slice(0, 200);
    if (parts.some((p) => p.includes(value))) return;
    parts.push(`${label}: ${value}`);
    matches.push(found.match);
  };
  let elig = findLabel(text, ['eligibility(?: criteria)?', 'criteria', 'who can apply'], { allowPipes: true });
  if (!elig) {
    const m = text.match(/[^\n.]*\b(cgpa|cpi|gpa|%\s*(?:throughout|aggregate|in 10th)|backlogs?|eligib\w*)\b[^\n.]*/i);
    if (m) elig = { value: clean(m[0]), match: m[0].trim() };
  }
  add('Eligibility', elig);
  add('Branches', findLabel(text, ['branches', 'branch', 'departments', 'streams', 'eligible branches']));
  add('Batch', findLabel(text, ['batch', 'year of passing', 'passing year', 'yop']));
  let bond = findLabel(text, ['bond', 'service agreement']);
  if (!bond) {
    const m = text.match(/[^\n.]*\b(bond|service agreement)\b[^\n.]*/i);
    if (m) bond = { value: clean(m[0]), match: m[0].trim() };
  }
  add('Bond', bond);
  if (pay?.upper) parts.push(`CTC range: ${pay.lpa}–${pay.upper} LPA`);
  return { notes: parts.join(' · ').slice(0, 2000), matches };
}

// Shortlisted / selected / rejected wording -> where this application now stands
function findStage(text, events) {
  if (/\b(regret to inform|not been (?:shortlisted|selected)|not shortlisted|not selected|unable to move forward|not be moving forward|unfortunately)\b/i.test(text)) return 'Rejected';
  if (/\b(?:you(?:'ve| have| are)?(?: been)? (?:shortlisted|cleared|qualified|selected for the next round|moved to the next round)|congratulations[^.\n]*\b(?:shortlisted|cleared|qualified)|your name is (?:in|on) the (?:shortlist|list))/i.test(text)) {
    const next = events.find((e) => STAGE_FOR_ROUND[e.type]);
    return next ? STAGE_FOR_ROUND[next.type] : null;
  }
  if (/\b(congratulations|you (?:have been|are|got) selected|been selected|pleased to offer|offer letter|offer of employment)\b/i.test(text)) return 'Offer';
  return null;
}

// Split into lines/sentences so each date is judged by the words around it
function segments(text) {
  return text.split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
}

// The round keyword closest to a date, looking only between the neighbouring dates
function nearestType(seg, from, to, at, atEnd) {
  let best = null;
  ROUND_RULES.forEach((rule, order) => {
    for (const m of seg.slice(from, to).matchAll(rule.re)) {
      const start = from + m.index;
      const end = start + m[0].length;
      const distance = end <= at ? at - end : Math.max(0, start - atEnd) + 0.5; // words before the date win ties
      if (!best || distance < best.distance || (distance === best.distance && order < best.order)) best = { type: rule.type, distance, order };
    }
  });
  return best?.type || null;
}
const classify = (seg) => nearestType(seg, 0, seg.length, seg.length, seg.length);

// Local calendar day + clock time in the student's time zone -> a real instant
const at = (day, hour, minute, tz) => new Date(Date.UTC(day.year, day.month - 1, day.day, hour, minute) - tz * 60e3);
const dayOf = (c) => ({ year: c.get('year'), month: c.get('month'), day: c.get('day') });
const clock = (c) => ({ hour: c.get('hour'), minute: c.get('minute') || 0 });
// A real date or time has a digit, a month/weekday name or "today/tomorrow" ("the HR" is not a time)
const LOOKS_LIKE_WHEN = /\d|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|today|tomorrow|tonight|noon|midnight/i;
const DURATION = /\b\d+\s*(?:mins?|minutes?|hrs?|hours?|days?|weeks?|months?|years?)\b/i; // "15 mins early", "6 month internship"
const hasDay = (r) => r.start.isCertain('day') || r.start.isCertain('weekday') || /today|tomorrow|tonight/i.test(r.text);

// Forwarded-email header lines ("From: … Sent: Monday, 14 Nov") carry dates that aren't rounds
const EMAIL_HEADER = /^(?:from|sent|to|cc|bcc|date|subject)\s*:|^on .{5,80} wrote:?$|^-{3,}\s*forwarded message/i;
function headerLines(segs) {
  const skip = new Set();
  segs.forEach((seg, i) => {
    if (/^(?:from|to|cc)\s*:.*@|^-{3,}\s*forwarded message|^on .{5,80} wrote:?$/i.test(seg)) {
      for (let j = Math.max(0, i - 3); j <= Math.min(segs.length - 1, i + 4); j++) if (EMAIL_HEADER.test(segs[j])) skip.add(j);
    }
  });
  return skip;
}

function findEvents(text, reference) {
  const tz = reference.timezone;
  const segs = segments(text);
  const headers = headerLines(segs);
  const parsed = segs.map((seg, i) => (headers.has(i) ? [] : chrono.en.GB.parse(seg, reference, { forwardDate: true })
    .filter((r) => !DURATION.test(r.text) && LOOKS_LIKE_WHEN.test(r.text) && (hasDay(r) || r.start.isCertain('hour'))))); // drop durations and stray words
  const raw = []; // events before times/venues are finalised
  let rescheduled = false;

  segs.forEach((seg, i) => {
    let results = parsed[i];
    if (!results.length) return;

    // "postponed from 19 Nov to 26 Nov": only the new date counts
    const change = seg.match(RESCHEDULED);
    if (change && results.some(hasDay)) {
      rescheduled = true;
      if (results.filter(hasDay).length > 1) results = results.filter((r) => !hasDay(r) || r.index > change.index);
    }

    results.forEach((r, k) => {
      const from = k > 0 ? results[k - 1].index + results[k - 1].text.length : 0;
      const to = k < results.length - 1 ? results[k + 1].index : seg.length;
      let type = nearestType(seg, from, to, r.index, r.index + r.text.length);
      // Just "interview" here, but the line above said which one ("shortlisted for the HR interview")
      if (type === 'Technical interview' && !/technical|tech round|f2f|face/i.test(seg.slice(from, to))) {
        for (let j = i - 1; j >= Math.max(0, i - 2); j--) {
          if (parsed[j].some(hasDay)) break;
          if (classify(segs[j]) === 'HR interview') { type = 'HR interview'; break; }
        }
      }
      // No keyword next to it: use a heading line just above ("Online Assessment" / "Date: 20.11.2026")
      for (let j = i - 1; !type && j >= Math.max(0, i - 2); j--) {
        if (parsed[j].some(hasDay)) break;
        type = classify(segs[j]);
      }

      if (hasDay(r)) {
        const timed = r.start.isCertain('hour');
        // "Registrations opened on 10 Nov" read on 15 Nov: chrono moves a year-less date to next
        // year; a round months away is far less likely than a date that has just passed
        const day = dayOf(r.start);
        if (!r.start.isCertain('year') && r.start.date() - reference.instant > 200 * 864e5) day.year -= 1;
        raw.push({
          seg: i, type, day, snippet: clean(seg).slice(0, 160), matches: [r.text],
          time: timed ? clock(r.start) : null,
          endTime: timed && r.end?.isCertain('hour') ? clock(r.end) : null,
        });
        return;
      }
      // A time with no date ("Time: 9:30 AM", "(10 AM – 11:30 AM)") belongs to the date just before it
      const anchor = [...raw].reverse().find((e) => i - e.seg <= 4);
      if (!anchor) return;
      const t = { time: clock(r.start), endTime: r.end?.isCertain('hour') ? clock(r.end) : null };
      if (!anchor.time && (!type || !anchor.type || anchor.type === type)) {
        Object.assign(anchor, t, { type: anchor.type || type });
        anchor.matches.push(r.text);
        anchor.extra = [...(anchor.extra || []), i]; // the time's line can say "(HackerRank)" or "in Hall 2"

      } else if (type && type !== anchor.type) {
        // "PPT at 9 AM, test at 11 AM" under one date: separate rounds on that day
        raw.push({ seg: i, type, day: anchor.day, ...t, snippet: clean(seg).slice(0, 160), matches: [r.text] });
      }
    });
  });

  attachPlaces(raw, segs);

  const events = raw.map((e) => {
    const type = e.type || 'Other';
    const deadline = DEADLINES.includes(type);
    let start;
    let end;
    let allDay = false;
    if (e.time) {
      start = at(e.day, e.time.hour, e.time.minute, tz);
      end = e.endTime ? at(e.day, e.endTime.hour, e.endTime.minute, tz) : new Date(+start + 60 * 60e3); // rounds default to 1 hour
      if (end <= start) end = new Date(+start + 60 * 60e3);
    } else if (deadline) {
      start = at(e.day, 23, 59, tz); // "register by 18 Nov" = end of that day
    } else {
      start = at(e.day, 0, 0, tz);
      allDay = true;
    }
    if (deadline || allDay) end = start;
    const other = type === 'Other' ? OTHER_TITLES.find((o) => o.re.test(e.snippet)) || (/\bdrive\b/i.test(text) && OTHER_TITLES[2]) : null;
    const past = +end < +reference.instant - 60 * 60e3; // already over: shown, but not ticked
    return {
      type, start: start.toISOString(), end: end.toISOString(), allDay,
      ...(other && { title: other.title }),
      include: !past && (other ? other.include : true),
      ...(past && { past: true }),
      ...(e.mode && !deadline && { mode: e.mode }),
      ...(e.location && !deadline && { location: e.location }),
      snippet: e.snippet, match: e.matches[0], matches: e.matches,
    };
  });

  // Same round at the same time mentioned twice -> keep one
  const seen = new Set();
  const unique = events
    .filter((e) => { const k = `${e.type}|${e.start}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  return { events: unique, rescheduled };
}

// "Venue: Seminar Hall" / "Mode: Online" lines go to the round they sit next to
function attachPlaces(raw, segs) {
  const rounds = raw.filter((e) => !DEADLINES.includes(e.type));
  if (!rounds.length) return;
  // Details usually follow their date ("Date: … / Time: … / Venue: …"), so prefer the round above
  const nearest = (i) => [...rounds].reverse().find((e) => e.seg <= i) || rounds.find((e) => e.seg > i);
  segs.forEach((seg, i) => {
    const venue = seg.match(/^(?:venue|reporting venue|place|address|test centre|test center)\s*[:\-–]\s*(.+)$/i);
    const mode = seg.match(/^(?:mode|mode of (?:interview|test|drive|assessment)|interview mode|test mode)\s*[:\-–]\s*(.+)$/i);
    if (!venue && !mode) return;
    const target = rounds.length === 1 ? rounds[0] : nearest(i);
    if (!target || Math.abs(target.seg - i) > 4) return;
    // A venue under a one-day schedule ("PPT at 9, test at 11 / Venue: Auditorium") is for every round that day
    const sameDay = rounds.filter((e) => e.seg === target.seg || (e.day.year === target.day.year && e.day.month === target.day.month && e.day.day === target.day.day));
    if (venue) for (const e of sameDay) if (!e.location) { e.location = clean(venue[1]).slice(0, 300); e.mode = e.mode || 'On campus'; }
    if (mode) target.mode = ONLINE.test(mode[1]) ? 'Online' : /off[- ]campus|company office/i.test(mode[1]) ? 'Off campus' : 'On campus';
  });
  // Clues inside the round's own sentence: "online test on HackerRank", "in the auditorium"
  for (const e of rounds) {
    const seg = [e.seg, ...(e.extra || [])].map((j) => segs[j]).join(' ');
    if (!e.mode) e.mode = ONLINE.test(seg) ? 'Online' : ON_CAMPUS.test(seg) ? 'On campus' : undefined;
    if (!e.location) {
      const place = seg.match(/\b(?:in|at)\s+(?:the\s+)?((?:[A-Z][\w-]*\s+){0,3}(?:auditorium|seminar hall|hall|lab|block|room)(?:\s*[\w-]*\d[\w-]*)?)/i);
      if (place) e.location = clean(place[1]);
    }
  }
}

/**
 * @param {string} text pasted message
 * @param {{ now?: Date, timezoneOffset?: number, knownCompanies?: string[] }} options
 *        timezoneOffset = minutes ahead of UTC (India: 330)
 */
function parsePlacementMessage(text, { now = new Date(), timezoneOffset = 330, knownCompanies = [] } = {}) {
  const original = String(text || '').slice(0, MAX_LENGTH);
  const input = normalize(original);
  const reference = { instant: now, timezone: timezoneOffset };
  const company = findCompany(input, knownCompanies);
  const role = findRole(input);
  const pay = findPay(input);
  const links = findLinks(input);
  const location = findLabel(input, ['location', 'job location', 'work location', 'place of posting', 'posting', 'base location']);
  const notes = findNotes(input, pay);
  let type = findType(input);
  if (pay?.stipendK != null && type === 'Full-time') type = 'Internship';

  const { events, rescheduled } = findEvents(input, reference);
  const upcoming = events.filter((e) => !e.past);
  const registration = upcoming.find((e) => e.type === 'Registration deadline');
  const stage = findStage(input, events);

  const application = {
    company: company?.value || '',
    role: role?.value || '',
    type,
    stage: stage || 'Applied',
    source: 'Campus',
    ctc: pay ? (pay.stipendK ?? pay.lpa) : null,
    location: location?.value || '',
    jobLink: links[0]?.url || '',
    dueDate: registration?.start || upcoming[0]?.start || null,
    notes: notes.notes,
  };
  // An offer message: fill the offer details too
  if (stage === 'Offer') {
    const acceptBy = events.find((e) => e.type === 'Offer deadline');
    const joining = events.find((e) => e.title === 'Joining date');
    application.offer = {
      ...(pay?.lpa != null && { fixedLpa: pay.lpa }),
      ...(location && { location: location.value }),
      ...(acceptBy && { acceptBy: acceptBy.start }),
      ...(joining && { joiningDate: joining.start }),
    };
  }

  // Text pieces the review screen highlights, so the student sees where each value came from.
  // Only pieces that appear word for word in what the student pasted can be highlighted.
  const matches = [
    company && { field: 'company', text: company.match },
    role && { field: 'role', text: role.match },
    pay && { field: 'ctc', text: pay.match },
    location && { field: 'location', text: location.match },
    ...notes.matches.map((t) => ({ field: 'eligibility', text: t })),
    ...links.map((l) => ({ field: 'link', text: l.match })),
    ...events.flatMap((e) => e.matches.map((t) => ({ field: 'date', text: t }))),
    ...events.filter((e) => e.location).map((e) => ({ field: 'location', text: e.location })),
  ].filter(Boolean).map((m) => {
    // Cleaning changed it ("*CTC:* ₹ 6.5 LPA" vs "CTC: ₹ 6.5 LPA"): highlight the part after the label
    if (original.includes(m.text)) return m;
    const tail = m.text.replace(/^[^:]*:\s*/, '');
    return tail && original.includes(tail) ? { ...m, text: tail } : null;
  }).filter((m) => m && m.text);

  const warnings = [];
  if (!application.company) warnings.push('Could not find the company name. Please type it in.');
  if (!application.role) warnings.push('Could not find the role. Please type it in.');
  if (!events.length) warnings.push('No dates found. You can still add the application and add rounds later.');
  if (rescheduled) warnings.push('This message changes a date. If you already added that round, edit it on the calendar instead of adding it again.');

  return { application, events: events.map(({ matches: _m, ...e }) => e), matches, warnings, suggestedStage: stage };
}

module.exports = { parsePlacementMessage, MAX_LENGTH };
