// OpenAPI 3 description of the PlaceTrack API, served at /api/docs (Swagger UI).
// Written as a plain object, so there are no comment annotations to keep in sync.
const { STAGES, SOURCES, JOB_TYPES } = require('../constants');

const error = (example) => ({
  description: example,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { error: example } } },
});
const validation = {
  description: 'Validation failed',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
};
const json = (schema, description = 'OK') => ({ description, content: { 'application/json': { schema } } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Application ID' };

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'PlaceTrack API',
    version: '1.0.0',
    description:
      'REST API for PlaceTrack, a job/internship tracker for Indian campus placements.\n\n' +
      '**Auth flow:** `POST /auth/login` returns an `accessToken` (15 min) and sets an httpOnly `refreshToken` cookie (7 days). ' +
      'Click **Authorize** and paste the access token to try protected routes. When it expires, call `POST /auth/refresh`.\n\n' +
      '**Rate limits:** 300 requests / 15 min per IP overall; 20 / 15 min for login and register.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Auth', description: 'Register, log in, refresh and log out' },
    { name: 'Applications', description: 'Job/internship applications (always scoped to the logged-in user)' },
    { name: 'System' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'array',
            items: { type: 'object', properties: { field: { type: 'string', example: 'email' }, message: { type: 'string', example: 'Enter a valid email' } } },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6af45dce32d5520a16150cfb' },
          name: { type: 'string', example: 'Asha Rao' },
          email: { type: 'string', format: 'email', example: 'asha@college.edu' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: { user: { $ref: '#/components/schemas/User' }, accessToken: { type: 'string', example: 'eyJhbGciOi...' } },
      },
      ApplicationInput: {
        type: 'object',
        required: ['company', 'role'],
        properties: {
          company: { type: 'string', maxLength: 100, example: 'Zoho' },
          role: { type: 'string', maxLength: 100, example: 'Member Technical Staff' },
          type: { type: 'string', enum: JOB_TYPES, default: 'Full-time' },
          stage: { type: 'string', enum: STAGES, default: 'Applied' },
          source: { type: 'string', enum: SOURCES, default: 'Campus' },
          location: { type: 'string', example: 'Chennai' },
          ctc: { type: 'number', nullable: true, minimum: 0, example: 8.4, description: 'LPA, or ₹ thousand/month stipend for internships. `null` clears it.' },
          jobLink: { type: 'string', example: 'https://careers.zohocorp.com/123', description: 'http(s) only. Empty string clears it.' },
          appliedDate: { type: 'string', format: 'date', example: '2026-11-02' },
          dueDate: { type: 'string', format: 'date', nullable: true, example: '2026-11-15', description: 'Next deadline. `null` clears it.' },
          notes: { type: 'string', maxLength: 2000 },
        },
      },
      Application: {
        allOf: [
          { $ref: '#/components/schemas/ApplicationInput' },
          {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              user: { type: 'string', description: 'Owner ID' },
              stageHistory: {
                type: 'array',
                items: { type: 'object', properties: { stage: { type: 'string', enum: STAGES }, changedAt: { type: 'string', format: 'date-time' } } },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      Stats: {
        type: 'object',
        properties: {
          totals: {
            type: 'object',
            properties: {
              total: { type: 'integer' }, active: { type: 'integer' }, offers: { type: 'integer' }, rejected: { type: 'integer' },
              responseRate: { type: 'number', example: 0.75 }, dueThisWeek: { type: 'integer' },
            },
          },
          byStage: { type: 'object', additionalProperties: { type: 'integer' } },
          funnel: { type: 'array', items: { type: 'object', properties: { stage: { type: 'string' }, count: { type: 'integer' } } } },
          weekly: { type: 'array', items: { type: 'object', properties: { weekStart: { type: 'string', format: 'date-time' }, count: { type: 'integer' } } } },
          bySource: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string' }, total: { type: 'integer' }, responded: { type: 'integer' }, offers: { type: 'integer' }, rate: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Health check', responses: { 200: json({ type: 'object', properties: { status: { type: 'string', example: 'ok' } } }) } },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Create an account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['name', 'email', 'password'],
                properties: { name: { type: 'string', example: 'Asha Rao' }, email: { type: 'string', example: 'asha@college.edu' }, password: { type: 'string', minLength: 8, example: 'password123' } },
              },
            },
          },
        },
        responses: { 201: json({ $ref: '#/components/schemas/AuthResponse' }, 'Created; also sets the refreshToken cookie'), 400: validation, 409: error('An account with this email already exists'), 429: error('Too many login attempts, please try again in 15 minutes') },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Log in',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'demo@placetrack.test' }, password: { type: 'string', example: 'demo12345' } } } } },
        },
        responses: { 200: json({ $ref: '#/components/schemas/AuthResponse' }, 'OK; also sets the refreshToken cookie'), 400: validation, 401: error('Invalid email or password'), 429: error('Too many login attempts, please try again in 15 minutes') },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'], summary: 'Get a new access token using the refresh cookie',
        description: 'Rotates the refresh cookie too. No body needed.',
        responses: { 200: json({ $ref: '#/components/schemas/AuthResponse' }), 401: error('Refresh token is no longer valid') },
      },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Log out', description: 'Clears the cookie and revokes all refresh tokens issued before now.', responses: { 200: json({ type: 'object', properties: { message: { type: 'string', example: 'Logged out' } } }) } },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'The logged-in user', security: [{ bearerAuth: [] }], responses: { 200: json({ type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } }), 401: error('Not logged in') } },
    },
    '/applications': {
      get: {
        tags: ['Applications'], summary: 'List applications (search, filter, sort, paginate)', security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Matches company or role (case-insensitive)' },
          { name: 'stage', in: 'query', schema: { type: 'string', enum: STAGES } },
          { name: 'source', in: 'query', schema: { type: 'string', enum: SOURCES } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: JOB_TYPES } },
          { name: 'dueWithinDays', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 60 }, description: 'Due Soon: active applications with a deadline from today to N days ahead, soonest first' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['-appliedDate', 'appliedDate', '-updatedAt', 'company', '-company', 'dueDate', '-ctc'], default: '-appliedDate' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        ],
        responses: {
          200: json({
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/Application' } },
              pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } },
            },
          }),
          400: validation, 401: error('Not logged in'),
        },
      },
      post: {
        tags: ['Applications'], summary: 'Create an application', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApplicationInput' } } } },
        responses: { 201: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/Application' } } }, 'Created'), 400: validation, 401: error('Not logged in') },
      },
    },
    '/applications/stats': {
      get: { tags: ['Applications'], summary: 'Dashboard statistics', security: [{ bearerAuth: [] }], responses: { 200: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/Stats' } } }), 401: error('Not logged in') } },
    },
    '/applications/{id}': {
      parameters: [idParam],
      get: { tags: ['Applications'], summary: 'Get one application', security: [{ bearerAuth: [] }], responses: { 200: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/Application' } } }), 400: error('Invalid _id'), 404: error('Application not found') } },
      patch: {
        tags: ['Applications'], summary: 'Update an application (only the fields sent)', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApplicationInput' }, example: { notes: 'Revise OS and DBMS', dueDate: '2026-11-20' } } } },
        responses: { 200: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/Application' } } }), 400: validation, 404: error('Application not found') },
      },
      delete: { tags: ['Applications'], summary: 'Delete an application', security: [{ bearerAuth: [] }], responses: { 204: { description: 'Deleted' }, 404: error('Application not found') } },
    },
    '/applications/{id}/stage': {
      parameters: [idParam],
      patch: {
        tags: ['Applications'], summary: 'Move to another stage (Kanban)', description: 'Also adds an entry to stageHistory.', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['stage'], properties: { stage: { type: 'string', enum: STAGES } } } } } },
        responses: { 200: json({ type: 'object', properties: { data: { $ref: '#/components/schemas/Application' } } }), 400: validation, 404: error('Application not found') },
      },
    },
  },
};
