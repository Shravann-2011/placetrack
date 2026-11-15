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
    expect(rounds(r)).toEqual(['Registration deadline @ 18 Nov 23:59', 'Online assessment @ 20 Nov 10:00', 'Technical interview @ 25 Nov 12:00 (all day)']);
    expect(r.warnings).toEqual([]);
  });

  test('2. labelled notice with DD/MM/YYYY dates', () => {
    const r = parse(`Company Name: Zoho Corporation
Designation: Member Technical Staff
Package: 8.4 LPA
Job Location: Chennai
Last date to apply: 17/11/2026
Written test: 19/11/2026 at 9:30 AM`);
    expect(r.application).toMatchObject({ company: 'Zoho Corporation', role: 'Member Technical Staff', ctc: 8.4, location: 'Chennai' });
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
  test('rejects empty and very long text', async () => {
    const { token } = await createUser();
    await request(app).post('/api/parse').set(auth(token)).send({ text: 'hi' }).expect(400);
    await request(app).post('/api/parse').set(auth(token)).send({ text: 'x'.repeat(10001) }).expect(400);
  });
});
