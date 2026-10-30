module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    // The shared package lives at <repo>/packages/shared, not <repo>/services/shared. The
    // previous target resolved to a directory that has never existed, so any suite importing
    // @memory-game/shared failed to run. Mapping to src (not dist) means tests exercise the
    // shared source with no build step.
    '^@memory-game/shared$': '<rootDir>/../../packages/shared/src',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
