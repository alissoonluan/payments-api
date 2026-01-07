import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!main.ts',
    '!app.module.ts',
    '!**/*.module.ts',
    '!infra/config/**',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/ports/**',
    '!**/dtos/**',
    '!**/*.enums.ts',
    '!**/repositories/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@infra/(.*)$': '<rootDir>/infra/$1',
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/modules/**/domain/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/modules/**/application/use-cases/**/*.ts': {
      branches: 83,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

export default config;
