const { parsePlacementMessage } = require('../src/parser/placementParser');

const NOW = new Date('2026-11-15T06:00:00Z'); // Sun 15 Nov 2026, 11:30 am IST
const parse = (text, opts = {}) => parsePlacementMessage(text, { now: NOW, ...opts });
// Format an ISO time in IST for readable assertions: "20 Nov 10:00"
const ist = (iso) => {
  const d = new Date(new Date(iso).getTime() + 330 * 60e3);
  return `${d.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
const rounds = (r) => r.events.map((e) => `${e.type} @ ${ist(e.start)}${e.allDay ? ' (all day)' : ''}`);

describe('Placement message parser', () => {
  test('1. a typical campus drive email', () => {
    const r = parse(`Infosys is visiting campus. Role: Systems Engineer, CTC 3.6 LPA. Eligibility: 60% throughout, no active backlogs.
Register by 18th Nov 11:59 PM: forms.gle/abc123. Online test on 20 Nov at 10 AM. Interviews on 25 Nov.`);
    expect(r.application).toMatchObject({ company: 'Infosys', role: 'Systems Engineer', ctc: 3.6, type: 'Full-time', jobLink: 'https://forms.gle/abc123' });
    expect(r.application.notes).toBe('Eligibility: 60% throughout, no active backlogs'); // label not doubled
    expect(rounds(r)).toEqual(['Registration deadline @ 18 Nov 23:59', 'Online assessment @ 20 Nov 10:00', 'Technical interview @ 25 Nov 00:00 (all day)']);
    expect(r.warnings).toEqual([]);
  });

  test('2. labelled notice with DD/MM/YYYY dates', () => {
    const r = parse(`Company Name: Zoho Corporation
Designation: Member Technical Staff
Package: 8.4 LPA
Job Location: Chennai
Last date to apply: 17/11/2026
Written test: 19/11/2026 at 9:30 AM`);
    expect(r.application).toMatchObject({ company: 'Zoho', role: 'Member Technical Staff', ctc: 8.4, location: 'Chennai' });
    expect(rounds(r)).toEqual(['Registration deadline @ 17 Nov 23:59', 'Online assessment @ 19 Nov 09:30']);
  });

  test('3. WhatsApp-style message, rupee amount per annum', () => {
    const r = parse(`*TCS Digital hiring* 🚀 Salary: ₹7,00,000 p.a. Apply before 16 Nov 5 pm at https://nextstep.tcs.com/drive.
Aptitude test 21 Nov, 10:00 AM to 12:00 PM (TCS iON).`);
    expect(r.application.company).toBe('TCS');
    expect(r.application.ctc).toBe(7);
    expect(r.application.jobLink).toBe('https://nextstep.tcs.com/drive');
    expect(rounds(r)).toEqual(['Registration deadline @ 16 Nov 17:00', 'Online assessment @ 21 Nov 10:00']);
    expect(ist(r.events[1].end)).toBe('21 Nov 12:00');
  });

  test('4. internship with a monthly stipend', () => {
    const r = parse(`Razorpay is hiring SDE Interns. Stipend: ₹60,000/month. Coding round on 22 Nov at 7 PM on HackerRank.`);
    expect(r.application).toMatchObject({ company: 'Razorpay', type: 'Internship', ctc: 60 });
    expect(rounds(r)).toEqual(['Online assessment @ 22 Nov 19:00']);
  });

  test('5. internship + full-time (PPO) wording', () => {
    const r = parse(`Swiggy: 6 month internship with PPO (full time conversion). Role: Backend Intern. Register by 20 Nov.`);
    expect(r.application.type).toBe('Internship + Full-time');
    expect(r.application.role).toBe('Backend Intern');
  });

  test('6. pre-placement talk, GD and HR round in one message', () => {
    const r = parse(`Deloitte campus drive:
Pre-placement talk on 23 Nov at 3 PM in the Main Auditorium.
Group discussion on 24 Nov at 11 AM.
HR round on 26 Nov at 2 PM.`);
    expect(rounds(r)).toEqual(['Pre-placement talk @ 23 Nov 15:00', 'Group discussion @ 24 Nov 11:00', 'HR interview @ 26 Nov 14:00']);
    expect(r.application.company).toBe('Deloitte');
  });

  test('7. relative dates: tomorrow', () => {
    const r = parse(`Reminder: Wipro online assessment tomorrow at 10 am.`);
    expect(rounds(r)).toEqual(['Online assessment @ 16 Nov 10:00']);
  });

  test('8. an offer letter with an acceptance deadline', () => {
    const r = parse(`Congratulations! Accolite is pleased to offer you the role of Associate Software Engineer. Please accept the offer by 30 Nov.`);
    expect(r.application.company).toBe('Accolite');
    expect(rounds(r)).toEqual(['Offer deadline @ 30 Nov 23:59']);
  });

  test('9. an unknown company found from "X is visiting"', () => {
    const r = parse(`Nimbus Analytics is visiting our campus for the Data Analyst role. Test on 28 Nov at 10 AM.`);
    expect(r.application.company).toBe('Nimbus Analytics');
    expect(r.application.role).toBe('Data Analyst');
  });

  test('10. prefers names the student already tracks', () => {
    const r = parse(`Update from Freshworks: interview on 27 Nov at 4 PM.`, { knownCompanies: ['Freshworks'] });
    expect(r.application.company).toBe('Freshworks');
    expect(rounds(r)).toEqual(['Technical interview @ 27 Nov 16:00']);
  });

  test('11. nothing recognisable: empty fields and helpful warnings, no crash', () => {
    const r = parse('Hi all, please check the portal for updates.');
    expect(r.application.company).toBe('');
    expect(r.events).toEqual([]);
    expect(r.warnings).toHaveLength(3);
  });

  test('12. works for a student in another time zone', () => {
    const r = parse('Infosys online test on 20 Nov at 10 AM.', { timezoneOffset: 0 }); // UTC
    expect(r.events[0].start).toBe('2026-11-20T10:00:00.000Z');
  });

  test('every highlighted match is real text from the message', () => {
    const text = 'Infosys is visiting campus. Role: Systems Engineer, CTC 3.6 LPA. Online test on 20 Nov at 10 AM.';
    const r = parse(text);
    for (const m of r.matches) expect(text).toContain(m.text);
  });
});

const { app, request, createUser, auth } = require('./helpers');
describe('Smarter reading (real-world message shapes)', () => {
  test('WhatsApp forward: *bold*, emojis, date and time on separate lines, venue', () => {
    const r = parse(`*🚨 Campus Drive Alert 🚨*
*Company:* Nimbus Analytics Pvt. Ltd.
*Role:* Associate Software Engineer
*CTC:* ₹ 6.5 LPA
*Eligibility:* CSE, ISE, ECE | 7 CGPA & above | No active backlogs
*Bond:* 2 years service agreement
📅 *Date:* 21st November 2026
⏰ *Time:* 9:30 AM
📍 *Venue:* Seminar Hall, Block C
Register here 👉 https://forms.gle/xyz123 before 18/11/2026, 5 PM`);
    expect(r.application).toMatchObject({ company: 'Nimbus Analytics', role: 'Associate Software Engineer', ctc: 6.5, jobLink: 'https://forms.gle/xyz123' });
    expect(r.application.notes).toBe('Eligibility: CSE, ISE, ECE | 7 CGPA & above | No active backlogs · Bond: 2 years service agreement');
    expect(rounds(r)).toEqual(['Registration deadline @ 18 Nov 17:00', 'Other @ 21 Nov 09:30']);
    expect(r.events[1]).toMatchObject({ title: 'Campus drive', mode: 'On campus', location: 'Seminar Hall, Block C' });
  });

  test('a drive schedule: each line its own round, college names are not the company', () => {
    const r = parse(`Dear Students,
Greetings from the Training & Placement Cell.
The Placement Cell is conducting a campus drive for Kalvium Technologies for the role of Full Stack Developer Intern. Stipend: Rs. 25,000/- per month, PPO based on performance.
21/11 - Pre-placement talk at 9:30 AM
22/11 - Aptitude test (online)
23/11 - Technical and HR interviews
Last date for registration: 17-11-2026`);
    expect(r.application).toMatchObject({ company: 'Kalvium Technologies', role: 'Full Stack Developer Intern', ctc: 25, type: 'Internship + Full-time' });
    expect(rounds(r)).toEqual(['Registration deadline @ 17 Nov 23:59', 'Pre-placement talk @ 21 Nov 09:30', 'Online assessment @ 22 Nov 00:00 (all day)', 'Technical interview @ 23 Nov 00:00 (all day)']);
    expect(r.events[2].mode).toBe('Online');
  });

  test('a heading line names the round; time ranges set the end; mode/venue go to the round above', () => {
    const r = parse(`Company Name : Oracle
Online Assessment
Date: 20.11.2026
Time: 2:00 PM to 4:00 PM
Mode: Online (HackerEarth)
Interview Date: 24/11/2026
Reporting Time: 8:30 AM
Venue: Placement Block, 2nd floor`);
    expect(rounds(r)).toEqual(['Online assessment @ 20 Nov 14:00', 'Technical interview @ 24 Nov 08:30']);
    expect(ist(r.events[0].end)).toBe('20 Nov 16:00');
    expect(r.events[0].mode).toBe('Online');
    expect(r.events[1]).toMatchObject({ mode: 'On campus', location: 'Placement Block, 2nd floor' });
  });

  test('two dates in one sentence get the keyword nearest to each', () => {
    const r = parse('Registrations for Deloitte close today at 5 PM. Shortlisted students will have a GD on Monday at 11 AM, followed by interviews on Tuesday.');
    expect(rounds(r)).toEqual(['Registration deadline @ 15 Nov 17:00', 'Group discussion @ 16 Nov 11:00', 'Technical interview @ 17 Nov 00:00 (all day)']);
    expect(r.suggestedStage).toBeNull(); // a general notice, not "you are shortlisted"
  });

  test('several rounds under one date, venue shared across that day', () => {
    const r = parse(`TCS Ninja drive - 20th Nov
PPT at 9 AM, aptitude test at 11 AM, interviews from 2 PM
Venue: Main Auditorium`);
    expect(rounds(r)).toEqual(['Pre-placement talk @ 20 Nov 09:00', 'Online assessment @ 20 Nov 11:00', 'Technical interview @ 20 Nov 14:00']);
    expect(r.events.every((e) => e.location === 'Main Auditorium')).toBe(true);
  });

  test('postponed drive keeps only the new date and warns', () => {
    const r = parse('Please note: the Capgemini drive scheduled on 19 Nov is postponed to 26 Nov, 9 AM. Contact 9876543210 for queries.');
    expect(rounds(r)).toEqual(['Other @ 26 Nov 09:00']);
    expect(r.warnings.join(' ')).toMatch(/changes a date/);
  });

  test('forwarded email: header dates ignored, past dates unticked, durations ignored', () => {
    const r = parse(`---------- Forwarded message ---------
From: Placement Office <placements@college.edu>
Date: Sat, 14 Nov 2026 at 10:15
Subject: Campus Recruitment - Juspay

Juspay is conducting an online coding challenge for the Software Development Engineer role on 19 Nov 2026 from 7 PM to 9 PM on HackerRank. Registrations opened on 10 Nov and close on 17 Nov at 6 PM.
Stipend: 40K per month (6 month internship) with PPO.`);
    expect(r.application).toMatchObject({ company: 'Juspay', role: 'Software Development Engineer', ctc: 40 });
    expect(rounds(r)).toEqual(['Registration deadline @ 10 Nov 23:59', 'Registration deadline @ 17 Nov 18:00', 'Online assessment @ 19 Nov 19:00']);
    expect(r.events[0]).toMatchObject({ past: true, include: false });
    expect(ist(r.application.dueDate)).toBe('17 Nov 18:00'); // the next deadline, not the past one
  });

  test('results and joining dates are listed but not ticked', () => {
    const r = parse('Amazon is hiring for SDE-1 and Support Engineer roles. CTC: 18-24 LPA. Apply by 19 Nov. Results will be announced on 30th Nov.');
    expect(r.application.notes).toContain('CTC range: 18–24 LPA');
    expect(r.events.find((e) => e.title === 'Results').include).toBe(false);
  });
});

describe('Stage from the wording', () => {
  test('"you have been shortlisted" -> the next round', () => {
    const r = parse('Congratulations! You have been shortlisted for the Technical Interview with Accolite. Your interview is scheduled on 18/11/2026 at 3:30 PM. Mode: Google Meet. Please be available 15 mins early.');
    expect(r.suggestedStage).toBe('Technical');
    expect(rounds(r)).toEqual(['Technical interview @ 18 Nov 15:30']);
    expect(r.events[0].mode).toBe('Online');
  });

  test('"the HR interview" is not a time, and "your interview" takes the type named before it', () => {
    const r = parse('Congratulations! You have been shortlisted for the HR interview with TCS. Your interview is on 20/11/2026 at 10:30 AM in Seminar Hall 2.');
    expect(rounds(r)).toEqual(['HR interview @ 20 Nov 10:30']);
    expect(r.events[0]).toMatchObject({ mode: 'On campus', location: 'Seminar Hall 2' });
    expect(r.suggestedStage).toBe('HR');
  });

  test('offer: stage, accept-by and joining date fill the offer details', () => {
    const r = parse('Congratulations! You have been selected by Wipro as Project Engineer. Please accept the offer letter on the portal before 25th Nov 2026. Joining date: 15 July 2027.');
    expect(r.application).toMatchObject({ company: 'Wipro', role: 'Project Engineer', stage: 'Offer' });
    expect(ist(r.application.offer.acceptBy)).toBe('25 Nov 23:59');
    expect(ist(r.application.offer.joiningDate)).toBe('15 Jul 00:00');
  });

  test('rejection', () => {
    const r = parse('Dear Candidate, thank you for your interest in Zoho. We regret to inform you that you have not been shortlisted for the next round.');
    expect(r.suggestedStage).toBe('Rejected');
    expect(r.events).toEqual([]);
  });
});

describe('The same round mentioned more than once', () => {
  test('a date line repeating the sentence above becomes one round with the full time', () => {
    const r = parse(`Infosys is conducting a Pre-Placement Talk on 20th November 2026 at 10:00 AM in the Main Auditorium.
PPT Date: 20/11/2026
PPT Time: 10:00 AM - 11:00 AM
Online test will be held on 21st November 2026 from 9 AM to 11 AM.
Online Test Date: 21-11-2026`);
    expect(rounds(r)).toEqual(['Pre-placement talk @ 20 Nov 10:00', 'Online assessment @ 21 Nov 09:00']);
    expect(ist(r.events[0].end)).toBe('20 Nov 11:00');
    expect(r.events[0].location).toBe('Main Auditorium');
  });
  test('reporting time is not a second round, the start time wins', () => {
    const r = parse(`TCS NQT: Online Assessment on 22 Nov 2026 at 10 AM.
Assessment Date: 22nd Nov 2026
Reporting time: 9:30 AM
The test link will be shared on 22 Nov morning.`);
    expect(rounds(r)).toEqual(['Online assessment @ 22 Nov 10:00']);
  });
  test('a reminder that repeats the test line is one test', () => {
    const r = parse(`Reminder: Zoho online test is tomorrow (16 Nov) at 2 PM.
Zoho Online Test – 16/11/2026 – 2:00 PM to 3:30 PM`);
    expect(rounds(r)).toEqual(['Online assessment @ 16 Nov 14:00']);
    expect(ist(r.events[0].end)).toBe('16 Nov 15:30');
  });
  test('an interview email with date and time on their own lines is one interview', () => {
    const r = parse(`Your technical interview with Capgemini is scheduled on 24 Nov 2026 at 11:30 AM.
Interview date: 24/11/2026
Interview time: 11:30 AM`);
    expect(rounds(r)).toEqual(['Technical interview @ 24 Nov 11:30']);
  });
  test('a one-day schedule gives each round its own time, and names same-kind rounds', () => {
    const r = parse(`Accenture schedule
Day 1 (25 Nov): Pre-placement talk 9 AM, Aptitude test 11 AM, Communication assessment 2 PM
Day 2 (26 Nov): Technical Interview from 10 AM`);
    expect(rounds(r)).toEqual(['Pre-placement talk @ 25 Nov 09:00', 'Online assessment @ 25 Nov 11:00', 'Online assessment @ 25 Nov 14:00', 'Technical interview @ 26 Nov 10:00']);
    expect(r.events.slice(1, 3).map((e) => e.title)).toEqual(['Aptitude test', 'Communication assessment']);
  });
  test('numbered rounds on the same day stay separate', () => {
    const r = parse('Wipro: Technical Round 1 on 26 Nov at 10 AM and Technical Round 2 on 26 Nov at 3 PM.');
    expect(r.events.map((e) => e.title)).toEqual(['Technical Round 1', 'Technical Round 2']);
  });
  test('"GD on 18 Nov and 19 Nov" is a GD on both days', () => {
    const r = parse('Shortlisted students for Deloitte GD on 18th Nov and 19th Nov (batch wise). Reporting time 9 AM.');
    expect(rounds(r)).toEqual(['Group discussion @ 18 Nov 09:00', 'Group discussion @ 19 Nov 09:00']);
  });
});

describe('POST /api/parse', () => {
  test('requires login', async () => {
    await request(app).post('/api/parse').send({ text: 'Infosys online test on 20 Nov at 10 AM' }).expect(401);
  });
  test('parses and points to an application the student already has', async () => {
    const { token } = await createUser();
    await request(app).post('/api/applications').set(auth(token)).send({ company: 'Zoho', role: 'MTS' }).expect(201);
    const res = await request(app).post('/api/parse').set(auth(token)).send({ text: 'Zoho: technical interview on 27 Nov at 4 PM in Room 3.', timezoneOffset: 330 }).expect(200);
    expect(res.body.data.application.company).toBe('Zoho');
    expect(res.body.data.events[0].type).toBe('Technical interview');
    expect(res.body.data.existing.map((a) => a.company)).toEqual(['Zoho']);
  });
  test('lists the rounds an application already has, so a repeat paste can skip them', async () => {
    const { token } = await createUser();
    const zoho = await request(app).post('/api/applications').set(auth(token)).send({ company: 'Zoho', role: 'MTS' }).expect(201);
    await request(app).post('/api/events').set(auth(token))
      .send({ application: zoho.body.data._id, type: 'Technical interview', start: '2026-11-27T10:30:00.000Z', end: '2026-11-27T11:30:00.000Z' }).expect(201);
    const res = await request(app).post('/api/parse').set(auth(token)).send({ text: 'Zoho: technical interview on 27 Nov at 4 PM in Room 3.', timezoneOffset: 330 }).expect(200);
    expect(res.body.data.existing[0].events).toEqual([{ type: 'Technical interview', start: '2026-11-27T10:30:00.000Z' }]);
  });
  test('rejects empty and very long text', async () => {
    const { token } = await createUser();
    await request(app).post('/api/parse').set(auth(token)).send({ text: 'hi' }).expect(400);
    await request(app).post('/api/parse').set(auth(token)).send({ text: 'x'.repeat(10001) }).expect(400);
  });
});
