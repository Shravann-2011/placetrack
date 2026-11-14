const { app, request, createUser, auth } = require('./helpers');

const at = (day, hh = 10, mm = 0) => new Date(Date.UTC(2026, 10, day, hh, mm)).toISOString(); // November 2026

async function setup() {
  const u = await createUser();
  const res = await request(app).post('/api/applications').set(auth(u.token)).send({ company: 'Zoho', role: 'MTS' }).expect(201);
  return { ...u, appId: res.body.data._id };
}
const addEvent = (token, body) => request(app).post('/api/events').set(auth(token)).send(body);

describe('Events', () => {
  test('require login', async () => {
    await request(app).get('/api/events').query({ from: at(1), to: at(30) }).expect(401);
  });

  test('create a timed event; it comes back with its company', async () => {
    const { token, appId } = await setup();
    const res = await addEvent(token, { application: appId, type: 'Online assessment', start: at(20, 10), end: at(20, 11), mode: 'Online' }).expect(201);
    expect(res.body.data).toMatchObject({ type: 'Online assessment', mode: 'Online', done: false });
    expect(res.body.data.application.company).toBe('Zoho');
    expect(res.body.clashes).toEqual([]);
  });

  test('a deadline without an end gets end = start', async () => {
    const { token, appId } = await setup();
    const res = await addEvent(token, { application: appId, type: 'Registration deadline', start: at(18, 23, 59) }).expect(201);
    expect(res.body.data.end).toBe(res.body.data.start);
  });

  test('rejects bad input: unknown type, end before start', async () => {
    const { token, appId } = await setup();
    await addEvent(token, { application: appId, type: 'Party', start: at(20) }).expect(400);
    const res = await addEvent(token, { application: appId, type: 'HR interview', start: at(20, 12), end: at(20, 11) }).expect(400);
    expect(res.body.details[0].field).toBe('end');
  });

  test("cannot attach an event to someone else's application", async () => {
    const a = await setup();
    const b = await createUser();
    await addEvent(b.token, { application: a.appId, type: 'Other', start: at(20) }).expect(404);
  });

  test('overlapping timed events are reported as clashes; deadlines never clash', async () => {
    const { token, appId } = await setup();
    await addEvent(token, { application: appId, type: 'Online assessment', start: at(21, 10), end: at(21, 12) }).expect(201);
    await addEvent(token, { application: appId, type: 'Registration deadline', start: at(21, 11) }).expect(201);
    const clash = await addEvent(token, { application: appId, type: 'Technical interview', start: at(21, 11), end: at(21, 12) }).expect(201);
    expect(clash.body.clashes.map((e) => e.type)).toEqual(['Online assessment']);
    const touching = await addEvent(token, { application: appId, type: 'HR interview', start: at(21, 12), end: at(21, 13) }).expect(201);
    expect(touching.body.clashes.map((e) => e.type)).toEqual([]); // ends exactly when the other starts
  });

  test('list by date range, in time order, only my own', async () => {
    const { token, appId } = await setup();
    const other = await setup();
    await addEvent(token, { application: appId, type: 'HR interview', start: at(25, 15), end: at(25, 16) });
    await addEvent(token, { application: appId, type: 'Online assessment', start: at(10, 9), end: at(10, 10) });
    await addEvent(token, { application: appId, type: 'Other', start: at(28) }); // outside the range below
    await addEvent(other.token, { application: other.appId, type: 'Other', start: at(12) });
    const res = await request(app).get('/api/events').query({ from: at(1, 0), to: at(26, 0) }).set(auth(token)).expect(200);
    expect(res.body.data.map((e) => e.type)).toEqual(['Online assessment', 'HR interview']);
  });

  test('range is required and limited to 100 days', async () => {
    const { token } = await setup();
    await request(app).get('/api/events').set(auth(token)).expect(400);
    await request(app).get('/api/events').query({ from: '2026-01-01', to: '2026-12-31' }).set(auth(token)).expect(400);
  });

  test('update, mark done, delete', async () => {
    const { token, appId } = await setup();
    const { body } = await addEvent(token, { application: appId, type: 'Group discussion', start: at(22, 14), end: at(22, 15) });
    const upd = await request(app).patch(`/api/events/${body.data._id}`).set(auth(token)).send({ done: true, location: 'Seminar Hall 2' }).expect(200);
    expect(upd.body.data).toMatchObject({ done: true, location: 'Seminar Hall 2' });
    await request(app).delete(`/api/events/${body.data._id}`).set(auth(token)).expect(204);
    await request(app).patch(`/api/events/${body.data._id}`).set(auth(token)).send({ done: false }).expect(404);
  });

  test('deleting an application deletes its events', async () => {
    const { token, appId } = await setup();
    await addEvent(token, { application: appId, type: 'Other', start: at(20) });
    await request(app).delete(`/api/applications/${appId}`).set(auth(token)).expect(204);
    const res = await request(app).get('/api/events').query({ from: at(1, 0), to: at(30, 0) }).set(auth(token)).expect(200);
    expect(res.body.data).toEqual([]);
  });
});
