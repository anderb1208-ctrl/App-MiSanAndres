/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  setupFiles: ['<rootDir>/src/tests/setupEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupClima.ts'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
};
