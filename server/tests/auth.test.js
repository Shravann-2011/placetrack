const { app, request, createUser, auth } = require('./helpers');
const User = require('../src/models/User');

describe('POST /api/auth/register', () => {
  test('creates a user, returns an access token and sets an httpOnly refresh cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'ASHA@College.edu ', password: 'password123' })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Asha', email: 'asha@college.edu' }); // trimmed + lowercased
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.tokenVersion).toBeUndefined();

    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/refreshToken=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  test('stores the password as a bcrypt hash, never in plain text', async () => {
    await createUser({ email: 'hash@test.dev', password: 'mysecret123' });
    const stored = await User.findOne({ email: 'hash@test.dev' }).select('+password');
    expect(stored.password).not.toBe('mysecret123');
    expect(stored.password).toMatch(/^\$2[aby]\$12\$/);
  });

  test('rejects invalid input with field-level errors', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: '123' })
      .expect(400);
    const fields = res.body.details.map((d) => d.field).sort();
    expect(fields).toEqual(['email', 'name', 'password']);
  });

  test('rejects a duplicate email with 409', async () => {
    await createUser({ email: 'dup@test.dev' });
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Again', email: 'dup@test.dev', password: 'password123' })
      .expect(409);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with the right password', async () => {
    const { user, password } = await createUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password }).expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  test('gives the same error for a wrong password and an unknown email', async () => {
    const { user } = await createUser();
    const wrong = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrongpass' }).expect(401);
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@test.dev', password: 'wrongpass' }).expect(401);
    expect(wrong.body.error).toBe('Invalid email or password');
    expect(unknown.body.error).toBe(wrong.body.error);
  });
});

describe('GET /api/auth/me', () => {
  test('requires a token', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  test('rejects a fake token', async () => {
    const res = await request(app).get('/api/auth/me').set(auth('abc.def.ghi')).expect(401);
    expect(res.body.error).toBe('Invalid token');
  });

  test('returns the logged-in user', async () => {
    const { token, user } = await createUser();
    const res = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    expect(res.body.user.email).toBe(user.email);
  });
});

describe('refresh and logout', () => {
  test('refresh issues a new access token using the cookie', async () => {
    const { agent } = await createUser();
    const res = await agent.post('/api/auth/refresh').expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  test('refresh without a cookie is rejected', async () => {
    await request(app).post('/api/auth/refresh').expect(401);
  });

  test('logout revokes refresh tokens issued before it', async () => {
    const { agent } = await createUser();
    // Keep a copy of the cookie as an attacker might
    const stolen = (await agent.post('/api/auth/refresh').expect(200)).headers['set-cookie'];

    await agent.post('/api/auth/logout').expect(200);

    const res = await request(app).post('/api/auth/refresh').set('Cookie', stolen).expect(401);
    expect(res.body.error).toBe('Refresh token is no longer valid');
  });
});
