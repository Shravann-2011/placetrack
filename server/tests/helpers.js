const request = require('supertest');
const app = require('../src/app');

let counter = 0;

// Registers a fresh user and returns an authenticated supertest "agent" + token
async function createUser(overrides = {}) {
  counter += 1;
  const body = { name: 'Test Student', email: `student${counter}@test.dev`, password: 'password123', ...overrides };
  const agent = request.agent(app); // keeps cookies between requests, like a browser
  const res = await agent.post('/api/auth/register').send(body).expect(201);
  return { agent, token: res.body.accessToken, user: res.body.user, password: body.password };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const daysFromNow = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

module.exports = { app, request, createUser, auth, daysFromNow };
