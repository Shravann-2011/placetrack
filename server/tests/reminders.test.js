// Reminder emails: the real Brevo API is never called. global.fetch is replaced
// with a fake that records what would have been sent.
const { app, request, createUser, auth } = require('./helpers');
const Event = require('../src/models/Event');
const { runDueReminders, buildReminder } = require('../src/services/reminders');
const { parseFrom } = require('../src/services/mailer');

const HOUR = 60 * 60 * 1000;
let sent;
let fetchMock;

beforeEach(() => {
  process.env.BREVO_API_KEY = 'test-key';
  process.env.MAIL_FROM = 'PlaceTrack <alerts@example.com>';
  process.env.CRON_SECRET = 'cron-secret';
  sent = [];
  fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
    sent.push({ url, headers: opts.headers, body: JSON.parse(opts.body) });
    return new Response(JSON.stringify({ messageId: 'x' }), { status: 201 });
  });
});
afterEach(() => fetchMock.mockRestore());

async function setup(stage = 'Applied') {
  const u = await createUser();
  const res = await request(app).post('/api/applications').set(auth(u.token)).send({ company: 'TCS', role: 'Ninja', stage }).expect(201);
  return { ...u, appId: res.body.data._id };
}
const addEvent = (u, inHours, extra = {}) => {
  const start = new Date(Date.now() + inHours * HOUR).toISOString();
  return request(app).post('/api/events').set(auth(u.token))
    .send({ application: u.appId, type: 'Online assessment', start, end: start, ...extra }).expect(201);
};

describe('Reminder emails', () => {
  test('sends one email for a round in the next 24 hours, and never twice', async () => {
    const u = await setup();
    await addEvent(u, 20, { checklist: [{ text: 'Revise DBMS', done: true }, { text: 'Mock test', done: false }] });
    const first = await runDueReminders();
    expect(first).toMatchObject({ sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(sent[0].headers['api-key']).toBe('test-key');
    expect(sent[0].body.sender).toEqual({ name: 'PlaceTrack', email: 'alerts@example.com' });
    expect(sent[0].body.to[0].email).toBe(u.user.email);
    expect(sent[0].body.subject).toMatch(/^Online assessment: TCS, (today|tomorrow) at /);
    expect(sent[0].body.htmlContent).toContain('Take the TCS online assessment');
    expect(sent[0].body.htmlContent).not.toContain('Mock test'); // no prep checklist in the email

    const second = await runDueReminders();
    expect(second.sent).toBe(0);
    expect(sent).toHaveLength(1);
  });

  test('ignores rounds that are too far away, already past, or done', async () => {
    const u = await setup();
    await addEvent(u, 30);
    await addEvent(u, -2);
    await addEvent(u, 5, { done: true });
    expect((await runDueReminders()).sent).toBe(0);
  });

  test('no email if the student turned reminders off, or the application is finished', async () => {
    const u = await setup();
    await request(app).patch('/api/auth/me').set(auth(u.token)).send({ reminders: { email: false } }).expect(200);
    await addEvent(u, 3);
    const v = await setup('Rejected');
    await addEvent(v, 3);
    const r = await runDueReminders();
    expect(r).toMatchObject({ sent: 0, skipped: 2 });
  });

  test('a failed send is retried on the next run', async () => {
    const u = await setup();
    await addEvent(u, 3);
    fetchMock.mockResolvedValueOnce(new Response('bad key', { status: 401 }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await runDueReminders()).failed).toBe(1);
    expect((await runDueReminders()).sent).toBe(1);
    console.error.mockRestore();
  });

  test('moving a round to a new date means a fresh reminder', async () => {
    const u = await setup();
    const ev = (await addEvent(u, 3)).body.data;
    await runDueReminders();
    const later = new Date(Date.now() + 10 * HOUR).toISOString();
    await request(app).patch(`/api/events/${ev._id}`).set(auth(u.token)).send({ start: later, end: later }).expect(200);
    expect((await Event.findById(ev._id)).remindedAt).toBeNull();
    expect((await runDueReminders()).sent).toBe(1);
  });

  test('does nothing when email is not set up', async () => {
    delete process.env.BREVO_API_KEY;
    const u = await setup();
    await addEvent(u, 3);
    expect(await runDueReminders()).toMatchObject({ disabled: true, sent: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('deadline wording, IST times and escaped HTML', () => {
    const now = new Date('2026-11-15T06:00:00Z'); // 11:30 AM IST
    const event = { type: 'Registration deadline', start: new Date('2026-11-16T18:29:00Z'), allDay: false, application: { company: '<b>Acme</b>' }, checklist: [] };
    const mail = buildReminder(event, { name: 'Asha Rao' }, now);
    expect(mail.subject).toBe('<b>Acme</b> registration closes tomorrow at 11:59 PM');
    expect(mail.preheader).toBe('Tomorrow at 11:59 PM');
    expect(mail.html).not.toContain('Add to Google Calendar'); // deadlines don't get a calendar slot
    expect(mail.html).toContain('&lt;b&gt;Acme&lt;/b&gt;');
    expect(mail.html).not.toContain('<b>Acme</b>');
    expect(mail.text).toContain('Hi Asha');
  });

  test('an untitled "Other" event reads as "Event"; a meeting link becomes a Join button', () => {
    const now = new Date('2026-11-15T06:00:00Z');
    const mail = buildReminder({
      type: 'Other', start: new Date('2026-11-15T06:16:00Z'), end: new Date('2026-11-15T07:16:00Z'), mode: 'Online',
      location: 'https://meet.google.com/abc-defg-hij', application: { company: 'Computacenter', role: 'SDE' }, checklist: [],
    }, { name: 'Shravan Kumar' }, now);
    expect(mail.subject).toBe('Event: Computacenter, today at 11:46 AM');
    expect(mail.html).toContain('starting in 16 min');
    expect(mail.html).toContain('Join the meeting');
    expect(mail.html).toContain('Google Meet');
    expect(mail.html).toContain('calendar.google.com/calendar/render');
    expect(mail.html).not.toMatch(/>Other</);
  });

  test('each kind of reminder has its own wording and button', () => {
    const now = new Date('2026-11-15T06:00:00Z'); // 11:30 AM IST
    const base = { start: new Date('2026-11-16T04:30:00Z'), end: new Date('2026-11-16T05:30:00Z'), application: { company: 'Infosys', role: 'SE', jobLink: 'https://forms.gle/abc' } };
    const mail = (type, extra = {}) => buildReminder({ ...base, type, ...extra }, { name: 'Asha' }, now);

    const ppt = mail('Pre-placement talk', { location: 'https://zoom.us/j/123' });
    expect(ppt.subject).toBe('Pre-placement talk: Infosys, tomorrow at 10:00 AM');
    expect(ppt.html).toContain('Join the Infosys pre-placement talk tomorrow at 10:00');
    expect(ppt.html).toContain('>Join the talk<');
    expect(ppt.html).toContain('Zoom');

    const oa = mail('Online assessment', { location: 'https://www.hackerrank.com/test/x' });
    expect(oa.html).toContain('>Open the test<');
    expect(oa.html).toContain('HackerRank');

    const gd = mail('Group discussion', { location: 'Seminar Hall 2' });
    expect(gd.html).toContain('Try to be there by 9:45');
    expect(gd.html).toContain('>View in PlaceTrack<'); // no link to join, so the button opens the calendar

    const reg = mail('Registration deadline');
    expect(reg.html).toContain('>Open the registration form<');
    expect(reg.html).toContain('https://forms.gle/abc');

    const offer = mail('Offer deadline');
    expect(offer.subject).toBe('Reply to your Infosys offer by 10:00 AM tomorrow');
    expect(offer.html).toContain('>Compare my offers<');
  });

  test('sender parsing', () => {
    expect(parseFrom('me@x.com')).toEqual({ name: 'PlaceTrack', email: 'me@x.com' });
    expect(parseFrom('Shravan <me@x.com>')).toEqual({ name: 'Shravan', email: 'me@x.com' });
  });
});

describe('Cron endpoint', () => {
  test('needs the right key', async () => {
    await request(app).get('/api/cron/reminders').expect(401);
    await request(app).get('/api/cron/reminders').query({ key: 'wrong' }).expect(401);
    delete process.env.CRON_SECRET;
    await request(app).get('/api/cron/reminders').query({ key: '' }).expect(401);
  });

  test('runs the reminders with the key (query or header)', async () => {
    const u = await setup();
    await addEvent(u, 3);
    const res = await request(app).get('/api/cron/reminders').query({ key: 'cron-secret' }).expect(200);
    expect(res.body.data.sent).toBe(1);
    await request(app).get('/api/cron/reminders').set('x-cron-key', 'cron-secret').expect(200);
    await request(app).head('/api/cron/reminders?key=cron-secret').expect(200); // uptime monitors often use HEAD
  });
});

describe('Settings', () => {
  test('reminders are on by default and can be switched off', async () => {
    const u = await createUser();
    const me = await request(app).get('/api/auth/me').set(auth(u.token)).expect(200);
    expect(me.body.user.reminders).toEqual({ email: true });
    const res = await request(app).patch('/api/auth/me').set(auth(u.token)).send({ reminders: { email: false } }).expect(200);
    expect(res.body.user.reminders.email).toBe(false);
    await request(app).patch('/api/auth/me').set(auth(u.token)).send({}).expect(400);
    await request(app).patch('/api/auth/me').set(auth(u.token)).send({ reminders: { email: 'yes' } }).expect(400);
  });

  test('test email goes to your own address', async () => {
    const u = await createUser();
    const res = await request(app).post('/api/auth/me/test-email').set(auth(u.token)).expect(200);
    expect(sent[0].body.to[0].email).toBe(u.user.email);
    expect(sent[0].body.subject).toMatch(/^\[Test\]/);
    expect(res.body.message).toContain(u.user.email);
  });

  test('test email reports when email is not set up', async () => {
    delete process.env.MAIL_FROM;
    const u = await createUser();
    await request(app).post('/api/auth/me/test-email').set(auth(u.token)).expect(501);
  });
});
