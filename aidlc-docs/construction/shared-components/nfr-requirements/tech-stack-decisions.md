# Tech Stack Decisions - Shared Components

## Overview
This document outlines technology choices and configurations for the Shared Components library.

---

## Core Technologies

### TypeScript
**Version**: 5.x (latest stable)
**Rationale**: 
- Strong type safety for shared library
- Excellent IDE support and autocomplete
- Compile-time error detection
- Industry standard for TypeScript libraries

**Configuration** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## Validation and Schema

### Zod
**Version**: 3.x (latest stable)
**Rationale**:
- TypeScript-first schema validation
- Excellent type inference
- Composable schemas
- Good performance
- Active maintenance and community

**Usage Pattern**:
```typescript
import { z } from 'zod';

// Define schema
export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100)
});

// Infer TypeScript type from schema
export type User = z.infer<typeof userSchema>;

// Validate at runtime
export function validateUser(data: unknown): Result<User> {
  const result = userSchema.safeParse(data);
  if (result.success) {
    return success(result.data);
  }
  return failure(new ValidationError('Invalid user data', {
    errors: result.error.errors
  }));
}
```

---

## Date/Time Handling

### date-fns
**Version**: 3.x (latest stable)
**Rationale**:
- Functional, immutable API
- Tree-shakeable (only import what you use)
- Excellent TypeScript support
- Comprehensive date utilities
- No timezone complexity (use native Date)
- Smaller bundle size than Moment.js or Luxon

**Usage Pattern**:
```typescript
import { format, addDays, differenceInSeconds } from 'date-fns';

// Format dates
const formatted = format(new Date(), 'MMM d, yyyy');

// Calculate differences
const seconds = differenceInSeconds(endDate, startDate);

// Add time periods
const futureDate = addDays(new Date(), 7);
```

---

## Testing Framework

### Jest
**Version**: 29.x (latest stable)
**Rationale**:
- Industry standard for TypeScript testing
- Built-in coverage reporting
- Fast parallel test execution
- Excellent mocking capabilities
- Great TypeScript support with ts-jest
- Snapshot testing for complex objects

**Configuration** (`jest.config.js`):
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

**Testing Libraries**:
- **ts-jest**: TypeScript preprocessor for Jest
- **@types/jest**: TypeScript definitions for Jest

---

## Code Quality Tools

### ESLint
**Version**: 8.x (latest stable)
**Rationale**:
- Industry standard linter
- Extensive rule set
- TypeScript support via @typescript-eslint
- Customizable and extensible

**Configuration** (`.eslintrc.js`):
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'complexity': ['warn', 10],
    'max-lines-per-function': ['warn', 50]
  }
};
```

### Prettier
**Version**: 3.x (latest stable)
**Rationale**:
- Consistent code formatting
- Zero configuration needed
- Integrates with ESLint
- Editor integration

**Configuration** (`.prettierrc.js`):
```javascript
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always'
};
```

---

## Documentation Tools

### TSDoc
**Rationale**:
- Standard for TypeScript documentation
- Supported by TypeScript compiler
- Good IDE integration
- Compatible with documentation generators

**Usage Pattern**:
```typescript
/**
 * Calculate game score based on difficulty, completion time, and attempts.
 * 
 * @param difficulty - Number of pairs in the game (12-48)
 * @param completionTime - Time to complete in seconds
 * @param attempts - Number of card flip attempts
 * @returns Calculated score (minimum 1.0)
 * 
 * @example
 * ```typescript
 * const score = calculateGameScore(24, 120, 30);
 * ```
 * 
 * @public
 */
export function calculateGameScore(
  difficulty: number,
  completionTime: number,
  attempts: number
): number {
  // Implementation
}
```

### TypeDoc (Optional)
**Version**: 0.25.x (latest stable)
**Rationale**:
- Generate HTML documentation from TSDoc comments
- Good TypeScript support
- Customizable themes
- Can be published to GitHub Pages

---

## Build and Bundling

### TypeScript Compiler (tsc)
**Rationale**:
- Native TypeScript compilation
- Generates type declarations (.d.ts)
- No additional bundler needed for library
- Fast incremental builds

**Build Scripts** (`package.json`):
```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist",
    "prebuild": "npm run clean"
  }
}
```

### Package Configuration
```json
{
  "name": "@memory-game/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Development Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "zod": "^3.22.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/parser": "^6.15.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "prettier": "^3.1.0",
    "eslint-config-prettier": "^9.1.0"
  }
}
```

### Rationale for Zero Runtime Dependencies
- **Zod**: Required for runtime validation (core functionality)
- **date-fns**: Required for date utilities (core functionality)
- **All others**: Dev dependencies only (testing, linting, building)
- **Result**: Minimal bundle size, no dependency conflicts

---

## Version Control and CI/CD

### Git Hooks (Husky)
**Version**: 8.x (latest stable)
**Rationale**:
- Enforce code quality before commits
- Run tests before push
- Prevent bad commits

**Configuration**:
```json
{
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0"
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

### Semantic Release
**Version**: 22.x (latest stable)
**Rationale**:
- Automated versioning based on commit messages
- Automatic CHANGELOG generation
- NPM package publishing
- GitHub releases

---

## Security Tools

### npm audit
**Built-in**: npm CLI
**Usage**: Run on every build to detect vulnerabilities

### Dependabot
**Platform**: GitHub
**Configuration**: Enable automated dependency updates

---

## Performance Tools

### benchmark.js (Optional)
**Version**: 2.x
**Rationale**:
- Benchmark critical functions
- Compare performance of different implementations
- Detect performance regressions

---

## Tech Stack Summary

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Language | TypeScript | 5.x | Type-safe development |
| Validation | Zod | 3.x | Runtime schema validation |
| Date/Time | date-fns | 3.x | Date utilities |
| Testing | Jest | 29.x | Unit testing |
| Linting | ESLint | 8.x | Code quality |
| Formatting | Prettier | 3.x | Code formatting |
| Documentation | TSDoc | - | API documentation |
| Build | tsc | 5.x | TypeScript compilation |
| Git Hooks | Husky | 8.x | Pre-commit checks |
| Versioning | Semantic Release | 22.x | Automated versioning |

**Total Runtime Dependencies**: 2 (Zod, date-fns)
**Total Dev Dependencies**: ~15 (testing, linting, building)

All technology choices prioritize type safety, developer experience, and minimal bundle size.
