/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  // The library only touches `react-native`'s AppState. Swap it for a
  // controllable stub so hooks can be tested without the heavy RN preset.
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/test-utils/react-native.mock.ts',
  },
  // reflect-metadata must load before any decorated class is evaluated (tsyringe DI).
  setupFiles: ['reflect-metadata'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/test-utils/**',
    '!src/index.ts',
    '!src/di/index.ts',
    '!src/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
