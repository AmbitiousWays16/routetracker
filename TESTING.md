# Testing Guide

This document provides comprehensive information about testing in the RouteTracker application.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)

## Overview

RouteTracker uses a comprehensive testing strategy with multiple layers of testing:

- **Unit Tests**: Testing individual functions and components in isolation
- **Integration Tests**: Testing how different parts of the application work together
- **End-to-End Tests**: Testing complete user workflows through the browser
- **Performance Tests**: Benchmarking critical functions for performance regression

### Testing Stack

- **Vitest**: Fast unit and integration test runner with built-in benchmarking
- **React Testing Library**: Component testing
- **Playwright**: End-to-end browser testing
- **@vitest/coverage-v8**: Code coverage reporting

## Test Types

### Unit Tests

Unit tests focus on testing individual functions, components, or modules in isolation.

**Location**: `src/test/`

**Examples**:
- `utils.test.ts` - Utility function tests
- `emailService.test.ts` - Email service tests
- `mapUtils.test.ts` - Map utility tests

### Component Tests

Component tests verify that React components render correctly and handle user interactions.

**Examples**:
- `ProxyMapImage.test.tsx` - Map image component tests
- `TokenRedirectHandler.test.tsx` - Authentication redirect tests

### Integration Tests

Integration tests verify that multiple units work together correctly.

**Example**: `handleCalculateRoute.test.ts` - Tests route calculation with authentication and API calls

### End-to-End Tests

E2E tests simulate real user interactions through the browser.

**Location**: `e2e/`

**Examples**:
- `auth.spec.ts` - Authentication flow tests

### Performance Tests

Performance benchmarks ensure critical functions remain fast and prevent performance regressions.

**Location**: `src/test/*.bench.ts`

**Examples**:
- `performance.bench.ts` - Benchmarks for utility functions

## Running Tests

### Unit and Integration Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with interactive UI
npm run test:ui
```

### Performance Benchmarks

```bash
# Run performance benchmarks
npm run test:bench
```

### End-to-End Tests

```bash
# Run E2E tests headlessly
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { chunk } from '@/lib/utils';

describe('chunk', () => {
  it('should split array into chunks of specified size', () => {
    const result = chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should handle empty arrays', () => {
    const result = chunk([], 2);
    expect(result).toEqual([]);
  });
});
```

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Mocking

#### Firebase Mocking

```typescript
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' },
  },
  db: {},
}));
```

#### Fetch API Mocking

```typescript
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ data: 'test' }),
  } as Response)
);
```

### Test Fixtures

Use the mock data factories in `src/test/fixtures/mockData.ts`:

```typescript
import { createMockUser, createMockTrip } from '@/test/fixtures/mockData';

const mockUser = createMockUser({ email: 'custom@example.com' });
const mockTrip = createMockTrip({ miles: 50 });
```

## Test Coverage

### Current Coverage Targets

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Generating Coverage Reports

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory:

- `coverage/index.html` - HTML report (open in browser)
- `coverage/lcov.info` - LCOV format for CI/CD
- `coverage/coverage-final.json` - JSON format

### What's Excluded from Coverage

- Test files (`*.test.ts`, `*.spec.ts`)
- UI component wrappers (`src/components/ui/`)
- Type definitions (`src/types/`)
- Entry points (`src/main.tsx`, `src/App.tsx`)

## CI/CD Integration

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### GitHub Actions Workflow

The CI/CD pipeline (`.github/workflows/ci.yml`) runs:

1. **Linting**: Code style checks
2. **Unit Tests**: All unit and integration tests
3. **Coverage**: Generates coverage reports
4. **Build**: Ensures the application builds successfully

### Coverage Reports on PRs

Pull requests automatically get a coverage report comment showing:

- Current coverage percentages
- Whether coverage meets the 80% threshold
- Coverage changes compared to the base branch

## Best Practices

### General Guidelines

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Keep Tests Simple**: One test should verify one behavior
3. **Use Descriptive Names**: Test names should clearly describe what they test
4. **Arrange-Act-Assert**: Structure tests in three clear phases
5. **Avoid Test Interdependence**: Each test should run independently

### Testing Anti-Patterns to Avoid

❌ **Don't test implementation details**
```typescript
// Bad
expect(component.state.count).toBe(1);

// Good
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

❌ **Don't write brittle tests**
```typescript
// Bad - breaks if class name changes
expect(element.className).toBe('btn-primary');

// Good - tests behavior
expect(element).toHaveRole('button');
```

❌ **Don't use too many mocks**
```typescript
// Bad - over-mocking loses integration value
vi.mock('everything');

// Good - mock only external dependencies
vi.mock('@/lib/firebase');
```

### When to Write Tests

- ✅ **Always**: Core business logic functions
- ✅ **Always**: Bug fixes (write test that fails, then fix)
- ✅ **Usually**: Complex components with state
- ✅ **Usually**: API integrations
- ⚠️ **Sometimes**: Simple presentational components
- ⚠️ **Sometimes**: UI wrapper components

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Firebase: Error (auth/invalid-api-key)"

**Solution**: Mock Firebase before importing modules that use it:
```typescript
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));
```

**Issue**: "Module not found" errors

**Solution**: Check that path aliases are configured in `vitest.config.ts`:
```typescript
resolve: {
  alias: { "@": path.resolve(__dirname, "./src") },
}
```

**Issue**: Tests timeout

**Solution**: Increase timeout or check for unresolved promises:
```typescript
it('slow test', async () => {
  // ...
}, { timeout: 10000 });
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
