const { app, request, createUser, auth, daysFromNow } = require('./helpers');

const create = (token, body) =>
  request(app).post('/api/applications').set(auth(token)).send({ company: 'Infosys', role: 'Systems Engineer', ...body });

describe('Applications: auth and validation', () => {
  test('all routes require login', async () => {
    await request(app).get('/api/applications').expect(401);
    await request(app).post('/api/applications').send({ company: 'X', role: 'Y' }).expect(401);
  });

  test('rejects invalid fields', async () => {
    const { token } = await createUser();
    const res = await create(token, { company: '', stage: 'Interview', ctc: -1, jobLink: 'nope', dueDate: 'tomorrow' }).expect(400);
    expect(res.body.details.map((d) => d.field).sort()).toEqual(['company', 'ctc', 'dueDate', 'jobLink', 'stage']);
  });

  test('blocks javascript: links (XSS protection)', async () => {
    const { token } = await createUser();
    await create(token, { jobLink: 'javascript:alert(1)' }).expect(400);
    await create(token, { jobLink: 'https://careers.example.com/123' }).expect(201);
  });
});

describe('Applications: create and read', () => {
  test('creates with sensible defaults and starts the stage history', async () => {
    const { token } = await createUser();
    const res = await create(token).expect(201);
    expect(res.body.data).toMatchObject({ stage: 'Applied', source: 'Campus', type: 'Full-time' });
    expect(res.body.data.stageHistory.map((h) => h.stage)).toEqual(['Applied']);
  });

  test('ignores an attempt to set the owner in the body', async () => {
    const { token, user } = await createUser();
    const res = await create(token, { user: '000000000000000000000000' }).expect(201);
    expect(res.body.data.user).toBe(user._id);
  });

  test("users only ever see their own applications", async () => {
    const a = await createUser();
    const b = await createUser();
    const { body } = await create(a.token).expect(201);
    await create(b.token, { company: 'Secret Corp' });

    const list = await request(app).get('/api/applications').set(auth(a.token)).expect(200);
    expect(list.body.data.map((x) => x.company)).toEqual(['Infosys']);

    // B can't read, edit or delete A's application, and gets 404, not 403
    await request(app).get(`/api/applications/${body.data._id}`).set(auth(b.token)).expect(404);
    await request(app).patch(`/api/applications/${body.data._id}`).set(auth(b.token)).send({ notes: 'hacked' }).expect(404);
    await request(app).delete(`/api/applications/${body.data._id}`).set(auth(b.token)).expect(404);
  });

  test('an invalid id returns 400', async () => {
    const { token } = await createUser();
    await request(app).get('/api/applications/123').set(auth(token)).expect(400);
  });
});

describe('Applications: list, search, filter, paginate', () => {
  let token;
  beforeEach(async () => {
    ({ token } = await createUser());
    const seed = [
      { company: 'TCS', role: 'Digital', source: 'Referral', dueDate: daysFromNow(2) },
      { company: 'Zoho', role: 'MTS', stage: 'Technical', dueDate: daysFromNow(0) },
      { company: 'Accenture', role: 'ASE', stage: 'Rejected', dueDate: daysFromNow(1) },
      { company: 'Wipro', role: 'Project Engineer', dueDate: daysFromNow(30) },
      { company: 'C++ Labs', role: 'Intern', type: 'Internship' },
    ];
    for (const s of seed) await create(token, s).expect(201);
  });

  const list = (query) => request(app).get('/api/applications').query(query).set(auth(token)).expect(200);

  test('paginates', async () => {
    const res = await list({ page: 2, limit: 2 });
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  test('searches company and role, case-insensitively', async () => {
    expect((await list({ search: 'zoho' })).body.data.map((a) => a.company)).toEqual(['Zoho']);
    expect((await list({ search: 'engineer' })).body.data.map((a) => a.company)).toEqual(['Wipro']);
  });

  test('treats regex characters in search as plain text', async () => {
    expect((await list({ search: 'C++' })).body.data.map((a) => a.company)).toEqual(['C++ Labs']);
  });

  test('filters by stage, source and type', async () => {
    expect((await list({ stage: 'Technical' })).body.data).toHaveLength(1);
    expect((await list({ source: 'Referral' })).body.data[0].company).toBe('TCS');
    expect((await list({ type: 'Internship' })).body.data[0].company).toBe('C++ Labs');
  });

  test('sorts', async () => {
    const res = await list({ sort: 'company' });
    expect(res.body.data.map((a) => a.company)).toEqual(['Accenture', 'C++ Labs', 'TCS', 'Wipro', 'Zoho']);
  });

  test('Due Soon: includes today, excludes closed and far-off deadlines, soonest first', async () => {
    const res = await list({ dueWithinDays: 7 });
    expect(res.body.data.map((a) => a.company)).toEqual(['Zoho', 'TCS']);
  });

  test('rejects bad query values', async () => {
    await request(app).get('/api/applications').query({ limit: 500 }).set(auth(token)).expect(400);
    await request(app).get('/api/applications').query({ stage: 'Nope' }).set(auth(token)).expect(400);
  });
});

describe('Applications: update and delete', () => {
  test('PATCH changes only the fields sent', async () => {
    const { token } = await createUser();
    const { body } = await create(token, { stage: 'GD', ctc: 6 });
    const res = await request(app).patch(`/api/applications/${body.data._id}`).set(auth(token)).send({ notes: 'Prep DSA' }).expect(200);
    expect(res.body.data).toMatchObject({ notes: 'Prep DSA', stage: 'GD', ctc: 6 });
  });

  test('an empty PATCH is rejected', async () => {
    const { token } = await createUser();
    const { body } = await create(token);
    await request(app).patch(`/api/applications/${body.data._id}`).set(auth(token)).send({}).expect(400);
  });

  test('null clears optional fields', async () => {
    const { token } = await createUser();
    const { body } = await create(token, { ctc: 5, dueDate: daysFromNow(3), jobLink: 'https://a.in' });
    const res = await request(app).patch(`/api/applications/${body.data._id}`).set(auth(token))
      .send({ ctc: null, dueDate: null, jobLink: '' }).expect(200);
    expect(res.body.data).toMatchObject({ ctc: null, dueDate: null, jobLink: '' });
  });

  test('stage changes are recorded in the timeline', async () => {
    const { token } = await createUser();
    const { body } = await create(token);
    const id = body.data._id;
    await request(app).patch(`/api/applications/${id}/stage`).set(auth(token)).send({ stage: 'Aptitude/OA' }).expect(200);
    const res = await request(app).patch(`/api/applications/${id}/stage`).set(auth(token)).send({ stage: 'Technical' }).expect(200);
    expect(res.body.data.stageHistory.map((h) => h.stage)).toEqual(['Applied', 'Aptitude/OA', 'Technical']);
  });

  test('an invalid stage is rejected', async () => {
    const { token } = await createUser();
    const { body } = await create(token);
    await request(app).patch(`/api/applications/${body.data._id}/stage`).set(auth(token)).send({ stage: 'Hired' }).expect(400);
  });

  test('DELETE removes it', async () => {
    const { token } = await createUser();
    const { body } = await create(token);
    await request(app).delete(`/api/applications/${body.data._id}`).set(auth(token)).expect(204);
    await request(app).get(`/api/applications/${body.data._id}`).set(auth(token)).expect(404);
  });
});
