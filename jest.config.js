const path = require('path');
const envSetup = path.resolve(__dirname, 'jest.env-setup.js');

module.exports = {
  projects: [
    {
      displayName: 'unit',
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: '.',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      collectCoverageFrom: ['src/**/*.(t|j)s'],
      coverageDirectory: 'coverage',
      testEnvironment: 'node',
      setupFiles: [envSetup],
    },
    {
      displayName: 'e2e',
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: '.',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      setupFiles: [envSetup],
      testTimeout: 60000,
      testEnvironment: 'node',
    },
  ],
};
