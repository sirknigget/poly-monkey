const path = require('path');
const envSetup = path.resolve(__dirname, 'jest.env-setup.js');

module.exports = {
  displayName: 'e2e',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testTimeout: 60000,
  testEnvironment: 'node',
  setupFiles: [envSetup],
};
