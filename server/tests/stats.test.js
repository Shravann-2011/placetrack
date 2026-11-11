const { app, request, createUser, auth, daysFromNow } = require('./helpers');

async function setup() {
  const { token } = await createUser();
  const add = async (body, stages = []) => {
    const res = await request(app).post('/api/applications').set(auth(token)).send({ role: 'SDE', ...body }).expect(201);
    for (const stage of stages) {
      await request(app).patch(`/api/applications/${res.body.data._id}/stage`).set(auth(token)).send({ stage }).expect(200);
    }
  };
  await add({ company: 'A', source: 'Campus', dueDate: daysFromNow(2) });               // no reply yet
  await add({ company: 'B', source: 'Campus' }, ['Aptitude/OA', 'Technical']);           // skipped GD
  await add({ company: 'C', source: 'Referral' }, ['Aptitude/OA', 'Rejected']);          // replied, rejected
  await add({ company: 'D', source: 'Referral' }, ['Aptitude/OA', 'GD', 'Technical', 'HR', 'Offer']);
  await add({ company: 'E', source: 'LinkedIn', stage: 'Rejected' });                   // created as rejected
  return token;
}

describe('GET /api/applications/stats', () => {
  test('requires login', async () => {
    await request(app).get('/api/applications/stats').expect(401);
  });

  test('returns zeros for a new user', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/api/applications/stats').set(auth(token)).expect(200);
    expect(res.body.data.totals).toMatchObject({ total: 0, active: 0, offers: 0, responseRate: 0 });
    expect(res.body.data.weekly).toHaveLength(8);
  });

  test('computes totals, funnel and response rate by source', async () => {
    const token = await setup();
    const { data } = (await request(app).get('/api/applications/stats').set(auth(token)).expect(200)).body;

    expect(data.totals).toMatchObject({ total: 5, active: 2, offers: 1, rejected: 2, dueThisWeek: 1 });
    expect(data.totals.responseRate).toBeCloseTo(4 / 5); // everyone except A replied

    // Skipping a round still counts as passing it (B skipped GD but reached Technical)
    const funnel = Object.fromEntries(data.funnel.map((f) => [f.stage, f.count]));
    expect(funnel).toEqual({ Applied: 5, 'Aptitude/OA': 3, GD: 2, Technical: 2, HR: 1, Offer: 1 });

    const bySource = Object.fromEntries(data.bySource.map((s) => [s.source, s]));
    expect(bySource.Referral).toMatchObject({ total: 2, responded: 2, offers: 1, rate: 1 });
    expect(bySource.Campus).toMatchObject({ total: 2, responded: 1, rate: 0.5 });
    expect(bySource['Job Portal']).toBeUndefined(); // sources with no applications are hidden

    expect(data.weekly.at(-1).count).toBe(5); // all applied this week
  });
});
