const { app, request } = require('./helpers');

describe('General API behaviour', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error).toMatch(/Not found/);
  });

  test('malformed JSON returns 400 without leaking parser details', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad json')
      .expect(400);
    expect(res.body).toEqual({ error: 'Malformed JSON body' });
  });
});
