const { app, request, createUser, auth } = require('./helpers');
const Application = require('../src/models/Application');

const daysAgo = (n) => new Date(Date.now() - n * 864e5);
const createApp = (token, body) => request(app).post('/api/applications').set(auth(token)).send({ company: 'Zoho', role: 'MTS', ...body }).expect(201);

describe('Prep checklist and debrief on events', () => {
  test('saves a checklist and debrief, and ticks items', async () => {
    const { token } = await createUser();
    const { body: a } = await createApp(token);
    const ev = await request(app).post('/api/events').set(auth(token)).send({
      application: a.data._id, type: 'Technical interview', start: new Date(Date.now() + 864e5).toISOString(),
      end: new Date(Date.now() + 864e5 + 3600e3).toISOString(),
      checklist: [{ text: 'Revise DBMS joins' }, { text: 'Carry 3 resume copies' }],
    }).expect(201);
    expect(ev.body.data.checklist.map((c) => [c.text, c.done])).toEqual([['Revise DBMS joins', false], ['Carry 3 resume copies', false]]);

    const upd = await request(app).patch(`/api/events/${ev.body.data._id}`).set(auth(token)).send({
      checklist: [{ text: 'Revise DBMS joins', done: true }, { text: 'Carry 3 resume copies', done: false }],
      debrief: 'Asked about normalisation and a SQL GROUP BY query.',
    }).expect(200);
    expect(upd.body.data.checklist[0].done).toBe(true);
    expect(upd.body.data.debrief).toMatch(/normalisation/);
  });

  test('rejects empty items and more than 30 items', async () => {
    const { token } = await createUser();
    const { body: a } = await createApp(token);
    const base = { application: a.data._id, type: 'Online assessment', start: new Date().toISOString() };
    await request(app).post('/api/events').set(auth(token)).send({ ...base, checklist: [{ text: '  ' }] }).expect(400);
    await request(app).post('/api/events').set(auth(token)).send({ ...base, checklist: Array.from({ length: 31 }, (_, i) => ({ text: `item ${i}` })) }).expect(400);
  });
});

describe('"No update in 14 days" nudge', () => {
  // Make an application look old by rewriting its history directly in the database
  // (raw collection write: Mongoose treats createdAt as read-only and would silently skip it)
  const age = (id, days) => Application.collection.updateOne(
    { _id: new Application.base.Types.ObjectId(String(id)) },
    { $set: { 'stageHistory.0.changedAt': daysAgo(days), createdAt: daysAgo(days) } },
  );

  test('lists active applications untouched for 14+ days, oldest first', async () => {
    const { token } = await createUser();
    const quiet = (await createApp(token, { company: 'Quiet Co' })).body.data;
    const older = (await createApp(token, { company: 'Older Co' })).body.data;
    await createApp(token, { company: 'Fresh Co' });                          // just applied
    const offer = (await createApp(token, { company: 'Offer Co', stage: 'Offer' })).body.data;
    await age(quiet._id, 15); await age(older._id, 30); await age(offer._id, 30);

    const { body } = await request(app).get('/api/applications/stats').set(auth(token)).expect(200);
    expect(body.data.stale.map((s) => [s.company, s.days])).toEqual([['Older Co', 30], ['Quiet Co', 15]]);
    expect(body.data.totals.stale).toBe(2);
  });

  test('an upcoming round means it is not stale', async () => {
    const { token } = await createUser();
    const a = (await createApp(token, { company: 'Waiting Co' })).body.data;
    await age(a._id, 20);
    await request(app).post('/api/events').set(auth(token)).send({ application: a._id, type: 'HR interview', start: new Date(Date.now() + 2 * 864e5).toISOString(), end: new Date(Date.now() + 2 * 864e5 + 1800e3).toISOString() }).expect(201);
    const { body } = await request(app).get('/api/applications/stats').set(auth(token)).expect(200);
    expect(body.data.stale).toEqual([]);
  });

  test('"Followed up" resets the timer', async () => {
    const { token } = await createUser();
    const a = (await createApp(token, { company: 'Chased Co' })).body.data;
    await age(a._id, 20);
    await request(app).patch(`/api/applications/${a._id}`).set(auth(token)).send({ followedUpAt: new Date().toISOString() }).expect(200);
    const { body } = await request(app).get('/api/applications/stats').set(auth(token)).expect(200);
    expect(body.data.stale).toEqual([]);
  });
});

describe('Offer details', () => {
  test('saves offer details for comparison', async () => {
    const { token } = await createUser();
    const a = (await createApp(token, { stage: 'Offer' })).body.data;
    const res = await request(app).patch(`/api/applications/${a._id}`).set(auth(token)).send({
      offer: { fixedLpa: 7.5, variableLpa: 1, joiningBonus: 50000, bondMonths: 24, bondPenalty: 200000, location: 'Chennai', joiningDate: '2027-07-01', acceptBy: '2026-12-01' },
    }).expect(200);
    expect(res.body.data.offer).toMatchObject({ fixedLpa: 7.5, variableLpa: 1, bondMonths: 24, location: 'Chennai' });
    expect(res.body.data.offer.acceptBy).toBe('2026-12-01T00:00:00.000Z');
  });

  test('rejects negative pay and fractional bond months', async () => {
    const { token } = await createUser();
    const a = (await createApp(token, { stage: 'Offer' })).body.data;
    await request(app).patch(`/api/applications/${a._id}`).set(auth(token)).send({ offer: { fixedLpa: -1 } }).expect(400);
    await request(app).patch(`/api/applications/${a._id}`).set(auth(token)).send({ offer: { bondMonths: 1.5 } }).expect(400);
  });

  test('saving the offer again replaces it (cleared fields are removed)', async () => {
    const { token } = await createUser();
    const a = (await createApp(token, { stage: 'Offer' })).body.data;
    await request(app).patch(`/api/applications/${a._id}`).set(auth(token)).send({ offer: { fixedLpa: 6, bondMonths: 12 } }).expect(200);
    const res = await request(app).patch(`/api/applications/${a._id}`).set(auth(token)).send({ offer: { fixedLpa: 6.5, bondMonths: null } }).expect(200);
    expect(res.body.data.offer.fixedLpa).toBe(6.5);
    expect(res.body.data.offer.bondMonths ?? null).toBeNull();
  });
});
