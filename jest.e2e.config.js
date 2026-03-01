const path = require('path');
const envSetup = path.resolve(__dirname, 'jest.env-setup.js');

module.exports = {
  displayName: 'e2e',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: [envSetup],
  setupFilesAfterEnv: ['<rootDir>/jest.e2e.setup.js'],
};
