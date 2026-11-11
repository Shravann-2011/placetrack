module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/env.js'],           // env vars, before anything loads
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'], // in-memory MongoDB per test file
  testTimeout: 30000, // first run downloads a MongoDB binary
  collectCoverageFrom: ['src/**/*.js', '!src/docs/**'],
};
