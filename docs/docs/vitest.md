# Vitest

## Overview

Vitest is a blazing-fast unit test framework powered by Vite. It provides a
native ESM-first testing experience with Jest-compatible APIs, built-in
TypeScript support, and out-of-the-box performance optimizations.

## Latest Stable Version

**Version**: `4.1.10` (July 2026)

**Compatibility**:

- Node.js: 18.0.0+, 20.0.0+, 22.0.0+
- Browsers: Chrome, Firefox, Safari, Edge (via @vitest/browser)
- Package Managers: npm, pnpm, yarn, bun

**Key Features**:

- Native ESM support
- Jest-compatible API
- Built-in TypeScript support
- Vite-powered transformations
- In-source testing
- Snapshot testing
- Coverage via c8/istanbul
- Watch mode with HMR
- Multi-threading via tinypool

## Core Concepts

- **Test Files**: Files matching `*.test.ts`, `*.spec.ts`, or in `__tests__`
  directories
- **Test Context**: Provides test utilities like `describe`, `it`, `expect`
- **Assertions**: `expect()` API for value matching
- **Mocks**: Functions that replace real implementations
- **Snapshots**: Serializing values for regression testing
- **Coverage**: Code coverage reporting
- **Watch Mode**: Automatic re-running on file changes
- **UI Mode**: Visual test runner interface

## Key Features

- **Vite-Powered**: Uses Vite's config and transformation pipeline
- **Jest Compatible**: Drop-in replacement for most Jest projects
- **TypeScript Native**: No extra configuration needed
- **Fast**: Uses esbuild for transpilation, worker threads for parallel
  execution
- **Smart Watch**: Only re-runs affected tests
- **Coverage**: Built-in coverage via c8/istanbul
- **Browser Mode**: Run tests in real browsers
- **In-Source Testing**: Write tests alongside source code
- **Snapshot Testing**: Built-in snapshot support
- **UI Mode**: Visual test runner with time travel

## Basic Usage

```bash
# Install Vitest
npm install -D vitest

# Run tests
vitest

# Run tests in watch mode
vitest --watch

# Run tests once
vitest run

# Run specific test file
vitest src/utils.test.ts

# Run tests matching pattern
vitest --grep "add"
```

## Installation

```bash
# Basic installation
npm install -D vitest

# With coverage
npm install -D vitest @vitest/coverage-v8

# With browser support
npm install -D vitest @vitest/browser

# With Testing Library
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

## Configuration

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/', 'dist/'],
  },
});
```

### package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Test Structure

### Basic Test

```typescript
import { describe, it, expect } from 'vitest';

describe('Math utils', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('should subtract two numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });
});
```

### Async Tests

```typescript
it('should fetch user data', async () => {
  const user = await fetchUser(1);
  expect(user).toBeDefined();
  expect(user.name).toBe('John');
});

it('should handle errors', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('Invalid user ID');
});
```

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('should render button text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick handler', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    screen.getByText('Click me').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## Assertions

### Common Matchers

```typescript
expect(value).toBe(3); // Strict equality
expect(value).toEqual({ a: 1 }); // Deep equality
expect(value).toBeDefined(); // Not undefined
expect(value).toBeNull(); // Null
expect(value).toBeTruthy(); // Truthy
expect(value).toBeFalsy(); // Falsy
expect(value).toBeGreaterThan(5); // >
expect(value).toBeLessThan(10); // <
expect(value).toContain('substring'); // String/array contains
expect(value).toMatch(/regex/); // Regex match
expect(value).toThrow(); // Throws error
expect(array).toHaveLength(3); // Array length
expect(object).toHaveProperty('key'); // Object property
```

### Async Matchers

```typescript
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

### Custom Matchers

```typescript
import { expect } from 'vitest';
import '@testing-library/jest-dom';

expect(element).toBeInTheDocument();
expect(element).toHaveTextContent('Hello');
expect(element).toHaveClass('active');
expect(element).toBeDisabled();
```

## Mocking

### Function Mocks

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(1);

// Mock implementation
const mockFn = vi.fn(() => 'mocked value');
expect(mockFn()).toBe('mocked value');

// Mock return value
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));
```

### Module Mocks

```typescript
import { vi } from 'vitest';
import { fetchUser } from './api';

vi.mock('./api', () => ({
  fetchUser: vi.fn(() => Promise.resolve({ id: 1, name: 'John' })),
}));

it('should use mocked API', async () => {
  const user = await fetchUser(1);
  expect(user).toEqual({ id: 1, name: 'John' });
});
```

### Partial Mocks

```typescript
import { vi } from 'vitest';
import * as utils from './utils';

vi.spyOn(utils, 'calculate').mockReturnValue(42);

it('should use spy', () => {
  const result = utils.calculate();
  expect(result).toBe(42);
});
```

## Advanced Patterns

### Setup and Teardown

```typescript
describe('Database tests', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database();
    db.connect();
  });

  afterEach(() => {
    db.disconnect();
  });

  beforeAll(() => {
    // Run once before all tests
  });

  afterAll(() => {
    // Run once after all tests
  });
});
```

### Parameterized Tests

```typescript
describe.each([
  { a: 1, b: 2, expected: 3 },
  { a: 2, b: 3, expected: 5 },
  { a: -1, b: 1, expected: 0 },
])('add($a, $b)', ({ a, b, expected }) => {
  it(`should return ${expected}`, () => {
    expect(add(a, b)).toBe(expected);
  });
});
```

### Snapshot Testing

```typescript
it('should match snapshot', () => {
  const component = render(<Button>Click me</Button>)
  expect(component.container).toMatchSnapshot()
})

// Inline snapshots
it('should match inline snapshot', () => {
  const data = { foo: 'bar' }
  expect(data).toMatchInlineSnapshot(`
    {
      "foo": "bar",
    }
  `)
})
```

### In-Source Testing

```typescript
// src/utils.ts
export function add(a: number, b: number): number {
  return a + b;
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it('should add numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
}
```

## Anti-Patterns

### 1. Testing Implementation Details

**BAD**:

```typescript
it('should set internal state', () => {
  component.setState({ count: 1 });
  expect(component.state.count).toBe(1);
});
```

**GOOD**:

```typescript
it('should increment count when button clicked', () => {
  render(<Counter />)
  fireEvent.click(screen.getByText('Increment'))
  expect(screen.getByText('Count: 1')).toBeInTheDocument()
})
```

**Why**: Test behavior, not implementation.

### 2. Not Cleaning Up Mocks

**BAD**:

```typescript
vi.mock('./api');
// Tests run
// Mocks persist to next test
```

**GOOD**:

```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});
```

**Why**: Mocks can leak between tests and cause false failures.

### 3. Over-Mocking

**BAD**:

```typescript
vi.mock('./api');
vi.mock('./utils');
vi.mock('./helpers');
```

**GOOD**:

```typescript
// Only mock external dependencies
vi.mock('./api');
```

**Why**: Over-mocking makes tests brittle and less useful.

### 4. Testing Too Much

**BAD**:

```typescript
it('should handle all edge cases', () => {
  // 50 lines of test code
});
```

**GOOD**:

```typescript
it('should handle valid input', () => {
  // Focused test
});

it('should handle invalid input', () => {
  // Separate test
});
```

**Why**: Small, focused tests are easier to debug and maintain.

### 5. Not Using Async/Await

**BAD**:

```typescript
it('should fetch data', () => {
  fetchUser().then((user) => {
    expect(user).toBeDefined();
  });
});
```

**GOOD**:

```typescript
it('should fetch data', async () => {
  const user = await fetchUser();
  expect(user).toBeDefined();
});
```

**Why**: Async/await is cleaner and handles errors better.

### 6. Ignoring Coverage

**BAD**:

```typescript
// No coverage configuration
```

**GOOD**:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80
  }
}
```

**Why**: Coverage ensures code quality and identifies untested paths.

## Performance Optimization

### 1. Use Worker Threads

```typescript
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
```

### 2. Limit Test Files

```typescript
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'e2e/'],
  },
});
```

### 3. Use Shallow Rendering

```typescript
import { render } from '@testing-library/react';
// Shallow render for component testing
```

### 4. Cache Dependencies

Vitest automatically caches dependencies. Ensure `node_modules` is not in
`.gitignore`.

### 5. Use Coverage Exclusions

```typescript
coverage: {
  exclude: ['node_modules/', 'src/test/', 'src/types/', '*.config.ts'];
}
```

## Integration with Tools

### Testing Library

```bash
npm install -D @testing-library/react @testing-library/jest-dom
```

```typescript
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
```

### MSW (Mock Service Worker)

```bash
npm install -D msw
```

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ id: 1, name: 'John' }));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Playwright (E2E)

```bash
npm install -D @playwright/test
```

```typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/My App/);
});
```

## Common Commands

```bash
# Run tests
vitest

# Run tests once
vitest run

# Watch mode
vitest --watch

# UI mode
vitest --ui

# Coverage
vitest run --coverage

# Run specific file
vitest src/utils.test.ts

# Run matching pattern
vitest --grep "add"

# Run in specific environment
vitest --environment jsdom

# Debug mode
vitest --debug

# Reporters
vitest --reporter=verbose
```

## Troubleshooting

### Common Issues

**"Module not found" errors**:

- Check Vite config for alias resolution
- Ensure file extensions are correct
- Verify tsconfig.json paths

**Slow test execution**:

- Use worker threads
- Limit test files with include/exclude
- Avoid heavy setup in beforeEach

**Mock not working**:

- Ensure mock is called before test
- Check mock path is correct
- Use vi.resetAllMocks() in afterEach

**Coverage not working**:

- Install @vitest/coverage-v8
- Check coverage configuration
- Exclude test files from coverage

### Debugging

```bash
# Debug mode
vitest --debug

# Inspect with Node debugger
node --inspect-brk node_modules/vitest/bin/vitest.js

# Verbose output
vitest --reporter=verbose
```

## Best Practices

1. **Test behavior, not implementation**
2. **Keep tests small and focused**
3. **Use descriptive test names**
4. **Clean up mocks in afterEach**
5. **Use async/await for async tests**
6. **Set coverage thresholds**
7. **Use Testing Library for React**
8. **Mock external dependencies only**
9. **Use parameterized tests for similar cases**
10. **Run tests in watch mode during development**
11. **Use UI mode for debugging**
12. **Separate unit and integration tests**
13. **Use snapshot testing carefully**
14. **Keep test data simple**
15. **Run tests in CI**

## Resources

- [Official Vitest Documentation](https://vitest.dev)
- [Vitest GitHub Repository](https://github.com/vitest-dev/vitest)
- [Testing Library](https://testing-library.com)
- [MSW Documentation](https://mswjs.io)
- [Jest Migration Guide](https://vitest.dev/guide/migration.html)
