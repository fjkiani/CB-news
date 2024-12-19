// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend/src'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/integration/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  setupFiles: ['dotenv/config'],
  moduleDirectories: ['node_modules', 'backend/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};