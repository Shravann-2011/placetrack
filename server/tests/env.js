// Test-only settings. Real secrets live in .env and are never used by tests.
process.env.NODE_ENV = 'test'; // also turns off rate limiting
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
