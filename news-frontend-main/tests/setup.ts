// src/tests/setup.ts
export {};

// Define a custom interface for the global object
declare global {
  var VITE_OPENAI_API_KEY: string;
  var testUtils: Record<string, unknown>;
}

// Set up environment variables
process.env.VITE_OPENAI_API_KEY = 'test-api-key';
process.env.VITE_DEEPSEEK_API_KEY = 'test-api-key';

// Set up global test utilities
global.testUtils = {};

// Global test hooks
if (typeof beforeAll === 'function') {
  beforeAll(() => {
    console.log('Starting tests...');
  });
}

if (typeof afterAll === 'function') {
  afterAll(() => {
    console.log('Finished tests...');
  });
}

// Mock localStorage for tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});