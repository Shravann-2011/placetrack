// Reads a pasted placement message (email, WhatsApp, notice) and pulls out the
// company, role, pay, links and every dated round. Rule-based, no AI:
//  - dates/times are read by chrono-node (Indian DD/MM order, in the student's time zone)
//  - the words around each date decide what kind of round it is
//  - labels like "Role:" / "CTC:" and common patterns fill in the rest
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

// Which round a date belongs to, decided by words near the date (checked in this order)
const ROUND_RULES = [
  { type: 'Registration deadline', re: /\b(register|registration|apply|application|last date|deadline|form|fill|submit|on or before)\b/i },
  { type: 'Offer deadline', re: /\b(accept|acceptance|offer letter|offer deadline|join(ing)? confirmation)\b/i },
  { type: 'Pre-placement talk', re: /\b(pre[- ]placement|ppt|company presentation|info(rmation)? session|webinar)\b/i },
  { type: 'Group discussion', re: /\b(group discussion|gd)\b/i },
  { type: 'HR interview', re: /\b(hr round|hr interview|hr discussion)\b/i },
  { type: 'Online assessment', re: /\b(online test|online assessment|aptitude|coding test|coding round|assessment|oa|test|hackerrank|amcat|cocubes|ion|exam)\b/i },
  { type: 'Technical interview', re: /\b(technical|interview|interviews|tech round|round 2|f2f|face to face)\b/i },
];
const DEADLINES = ['Registration deadline', 'Offer deadline'];

const clean = (s) => s.replace(/\s+/g, ' ').replace(/^[\s:–—-]+|[\s.,;:–—-]+$/g, '').trim();
const titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findLabel(text, labels) {
  const re = new RegExp(`(?:^|\\n|\\b)(?:${labels.join('|')})\\s*[:\\-–]\\s*([^\\n|;]+)`, 'i');
  const m = text.match(re);
  if (!m) return null;
  // A label's value ends at the end of its sentence: "Role: Backend Intern. Register by..."
  const value = clean(m[1].split(/\.\s+(?=[A-Z0-9])/)[0]);
  return { value, match: m[0].trim().slice(0, m[0].trim().indexOf(value) + value.length) || m[0].trim() };
}

function findCompany(text, knownNames) {
  const label = findLabel(text, ['company(?: name)?', 'organi[sz]ation', 'recruiter', 'employer']);
  if (label) return { value: titleCaseIfLower(label.value.split(/\s{2,}| - /)[0]), match: label.match };

  // Names the student already tracks, then well-known recruiters (longest name first)
  const candidates = [...new Set([...knownNames, ...KNOWN_COMPANIES])].sort((a, b) => b.length - a.length);
  for (const name of candidates) {
    const m = text.match(new RegExp(`\\b${escapeRe(name)}\\b`, 'i'));
    if (m) return { value: canonical(name, knownNames), match: m[0] };
  }

  // "Acme Labs is visiting campus" / "Campus drive by Acme Labs"
  const visiting = text.match(/\b([A-Z][\w&.]*(?:\s+[A-Z][\w&.]*){0,3})\s+(?:is\s+)?(?:visiting|hiring|conducting|coming)\b/);
  if (visiting) return { value: clean(visiting[1]), match: visiting[0] };
  const by = text.match(/\b(?:drive|recruitment|hiring)\s+(?:by|for|from)\s+([A-Z][\w&.]*(?:\s+[A-Z][\w&.]*){0,3})/);
  if (by) return { value: clean(by[1]), match: by[0] };
  return null;
}
const titleCaseIfLower = (s) => (s === s.toLowerCase() ? titleCase(s) : s);
const canonical = (name, known) => known.find((k) => k.toLowerCase() === name.toLowerCase()) || name;

function findRole(text) {
  const label = findLabel(text, ['role', 'position', 'designation', 'job title', 'job role', 'profile', 'post']);
  if (label) return { value: label.value.split(/,|\(| - /)[0].trim(), match: label.match };
  // "...for the Data Analyst role" / "...for the position of Data Analyst"
  const forThe = text.match(/\bfor\s+(?:the\s+)?([A-Z][\w+#./-]*(?:\s+[A-Z][\w+#./-]*){0,4})\s+(?:role|position|profile)\b/)
    || text.match(/\bfor\s+the\s+(?:role|position)\s+of\s+([A-Z][\w+#./-]*(?:\s+[A-Za-z][\w+#./-]*){0,4})/);
  if (forThe) return { value: clean(forThe[1]), match: forThe[0] };
  const m = text.match(/\b(?:hiring|recruiting|openings?)\s+(?:for\s+)?(?:the\s+)?(?:role\s+of\s+|position\s+of\s+)?([A-Z][\w+#./-]*(?:\s+[A-Za-z][\w+#./-]*){0,4}?)\s*(?:role|position|roles|positions|[.,\n(])/);
  return m ? { value: clean(m[1]), match: m[0] } : null;
}

// Pay: "CTC 6.5 LPA", "package of ₹6,50,000 p.a.", "stipend ₹25,000/month"
function findPay(text) {
  let m = text.match(/\bstipend\b[^\n\d₹]{0,20}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k)?\s*(?:\/|per)\s*(?:month|mo|pm)/i);
  if (m) {
    const amount = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
    return { stipendK: Math.round((amount / 1000) * 10) / 10, match: m[0] };
  }
  m = text.match(/\b(?:ctc|package|salary|compensation|pay)\b[^\n\d₹]{0,20}(?:₹|rs\.?|inr)?\s*(?:upto|up to)?\s*([\d.]+)\s*(?:-|to)?\s*(?:[\d.]+)?\s*(lpa|lakhs?\s*(?:per annum|p\.?\s?a\.?)?|l\b)/i);
  if (m) return { lpa: Number(m[1]), match: m[0] };
  m = text.match(/(?:₹|rs\.?|inr)\s*([\d,]{6,})\s*(?:\/-)?\s*(?:per annum|p\.?\s?a\.?|annually|per year)/i);
  if (m) return { lpa: Math.round((Number(m[1].replace(/,/g, '')) / 100000) * 100) / 100, match: m[0] };
  m = text.match(/\b([\d.]+)\s*lpa\b/i);
  if (m) return { lpa: Number(m[1]), match: m[0] };
  return null;
}

function findLinks(text) {
  const re = /\b(?:https?:\/\/|www\.|forms\.gle\/|bit\.ly\/|docs\.google\.com\/|tinyurl\.com\/)[^\s<>()"']+/gi;
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

function findEligibility(text) {
  const m = text.match(/[^\n.]*\b(cgpa|cpi|gpa|percentage|%\s*(?:throughout|aggregate)|backlogs?|eligib\w*)\b[^\n]*/i);
  // "Eligibility: 60% ..." -> "60% ..." (the caller adds its own "Eligibility:" label)
  return m ? { value: clean(m[0]).replace(/^eligibility(?: criteria)?\s*[:\-–]\s*/i, '').slice(0, 200), match: m[0].trim() } : null;
}

// Split into sentences/lines so each date is judged by the words around it
function segments(text) {
  return text.split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
}

function classify(segment) {
  for (const rule of ROUND_RULES) if (rule.re.test(segment)) return rule.type;
  return 'Other';
}

function findEvents(text, reference) {
  const events = [];
  for (const seg of segments(text)) {
    const results = chrono.en.GB.parse(seg, reference, { forwardDate: true });
    if (!results.length) continue;
    const type = classify(seg);
    for (const r of results) {
      // Ignore stray numbers chrono reads as dates but that carry no day ("at 10")
      if (!r.start.isCertain('day') && !r.start.isCertain('weekday') && !/today|tomorrow|tonight/i.test(r.text)) continue;
      const hasTime = r.start.isCertain('hour');
      const deadline = DEADLINES.includes(type);
      let start = r.start.date();
      let end = r.end ? r.end.date() : null;
      let allDay = false;
      if (!hasTime) {
        if (deadline) start = endOfDayIn(start, reference.timezone); // "register by 18 Nov" = end of that day
        else allDay = true;
      }
      if (deadline) end = start;
      else if (!end) end = allDay ? start : new Date(+start + 60 * 60e3); // timed rounds default to 1 hour
      events.push({ type, start: start.toISOString(), end: end.toISOString(), allDay, snippet: clean(seg).slice(0, 160), match: r.text });
    }
  }
  // Same round and same time mentioned twice -> keep one
  const seen = new Set();
  return events
    .filter((e) => { const k = `${e.type}|${e.start}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

// 11:59 pm on the same calendar day, in the student's time zone
function endOfDayIn(date, tzMinutes) {
  const local = new Date(+date + tzMinutes * 60e3);
  local.setUTCHours(23, 59, 0, 0);
  return new Date(+local - tzMinutes * 60e3);
}

/**
 * @param {string} text pasted message
 * @param {{ now?: Date, timezoneOffset?: number, knownCompanies?: string[] }} options
 *        timezoneOffset = minutes ahead of UTC (India: 330)
 */
function parsePlacementMessage(text, { now = new Date(), timezoneOffset = 330, knownCompanies = [] } = {}) {
  const input = String(text || '').slice(0, MAX_LENGTH);
  const reference = { instant: now, timezone: timezoneOffset };
  const company = findCompany(input, knownCompanies);
  const role = findRole(input);
  const pay = findPay(input);
  const links = findLinks(input);
  const location = findLabel(input, ['location', 'job location', 'work location', 'place of posting', 'venue city']);
  const eligibility = findEligibility(input);
  let type = findType(input);
  if (pay?.stipendK != null && type === 'Full-time') type = 'Internship';

  const events = findEvents(input, reference);
  const registration = events.find((e) => e.type === 'Registration deadline');

  const application = {
    company: company?.value || '',
    role: role?.value || '',
    type,
    stage: 'Applied',
    source: 'Campus',
    ctc: pay ? (pay.stipendK ?? pay.lpa) : null,
    location: location?.value || '',
    jobLink: links[0]?.url || '',
    dueDate: registration?.start || events[0]?.start || null,
    notes: eligibility ? `Eligibility: ${eligibility.value}` : '',
  };

  // Text pieces the review screen highlights, so the student sees where each value came from
  const matches = [
    company && { field: 'company', text: company.match },
    role && { field: 'role', text: role.match },
    pay && { field: 'ctc', text: pay.match },
    location && { field: 'location', text: location.match },
    eligibility && { field: 'eligibility', text: eligibility.match },
    ...links.map((l) => ({ field: 'link', text: l.match })),
    ...events.map((e) => ({ field: 'date', text: e.match })),
  ].filter(Boolean);

  const warnings = [];
  if (!application.company) warnings.push('Could not find the company name. Please type it in.');
  if (!application.role) warnings.push('Could not find the role. Please type it in.');
  if (!events.length) warnings.push('No dates found. You can still add the application and add rounds later.');

  return { application, events, matches, warnings };
}

module.exports = { parsePlacementMessage, MAX_LENGTH };
