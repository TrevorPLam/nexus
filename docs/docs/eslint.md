# ESLint

Static analysis tool for JavaScript/TypeScript code quality, consistency, and
best practices.

## Version & Compatibility

**ESLint**: `^10.8.0` (catalog) | **typescript-eslint**: `^8.0.0` |
**eslint-plugin-import-x**: `^4.0.0`

**Node.js**: `^20.19.0 || ^22.13.0 || >=24` (ESLint 10 dropped v21, v23)

**ESLint 10 Breaking Changes**:

- Legacy `.eslintrc.*` completely removed (flat config only)
- Config lookup starts from each file's directory (monorepo-friendly)
- JSX references now tracked (no false unused-vars)
- `eslint:recommended` updated with additional rules

## Project Configuration

### Current Setup (Life OS)

```javascript
// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { createNodeResolver } from 'eslint-plugin-import-x';

const tsResolver = createTypeScriptImportResolver({
  alwaysTryTypes: true,
  project: './tsconfig.json',
});
const nodeResolver = createNodeResolver();

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '.turbo',
      '**/*.config.*',
    ],
  },
  // Base configs
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // JavaScript files
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        process: 'readonly',
        console: 'readonly',
      },
    },
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-cycle': 'error',
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
    settings: { 'import-x/resolver-next': [nodeResolver, tsResolver] },
  },
  // TypeScript files with type-aware rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        process: 'readonly',
        console: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tseslint.plugin, 'import-x': importX },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'import-x/no-cycle': 'error',
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: 'apps/web/**',
              from: 'apps/api/**',
              message: 'Web client should not import from API server code',
            },
            {
              target: 'apps/web/**',
              from: 'packages/database/**',
              message:
                'Web client should not import from database package (use api-client)',
            },
            {
              target: 'apps/mobile/**',
              from: 'apps/api/**',
              message: 'Mobile client should not import from API server code',
            },
            {
              target: 'apps/mobile/**',
              from: 'packages/database/**',
              message:
                'Mobile client should not import from database package (use mobile-data)',
            },
          ],
        },
      ],
    },
    settings: { 'import-x/resolver-next': [nodeResolver, tsResolver] },
  },
  // Mobile-specific (React Native)
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
        global: 'readonly',
        __DEV__: 'readonly',
      },
    },
  },
  // Prettier (must be last)
  prettier,
];
```

### Key Features

- **Type-aware linting**: `projectService: true` for deep type checks
- **Architecture enforcement**: `no-restricted-paths` prevents client→server
  imports
- **Dual resolvers**: Node + TypeScript for complete module resolution
- **Mobile globals**: React Native specific globals (`__DEV__`, `global`)
- **Prettier integration**: Disables conflicting formatting rules

## TypeScript-ESLint v8

### Config Levels

```javascript
import tseslint from 'typescript-eslint';

// Recommended (baseline)
tseslint.configs.recommended;

// Strict (opinionated, catches more bugs)
tseslint.configs.strict;

// Stylistic (code style only)
tseslint.configs.stylistic;

// Type-aware variants (require projectService)
tseslint.configs.recommendedTypeChecked;
tseslint.configs.strictTypeChecked;
tseslint.configs.stylisticTypeChecked;
```

### Type-Aware Setup

```javascript
{
  languageOptions: {
    parserOptions: {
      projectService: true,  // Auto-detects tsconfig per file
      tsconfigRootDir: import.meta.dirname,
    },
  },
}
```

**Performance Note**: Type-aware rules are slower. Strategy: run fast linting
locally (git hooks), type-aware in CI only.

### Critical Type-Aware Rules

- `@typescript-eslint/no-floating-promises`: Catches unhandled promise
  rejections
- `@typescript-eslint/await-thenable`: Prevents awaiting non-promises
- `@typescript-eslint/no-misused-promises`: Flags promises passed where
  callbacks expected

## Import-X Plugin

### Resolver Configuration (Flat Config)

```javascript
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { createNodeResolver } from 'eslint-plugin-import-x';

const tsResolver = createTypeScriptImportResolver({
  alwaysTryTypes: true, // Resolve @types even for packages without source
  project: './tsconfig.json', // Or glob: 'packages/*/tsconfig.json'
  bun: true, // Optional: resolve Bun modules
});

const nodeResolver = createNodeResolver();

export default [
  {
    settings: {
      'import-x/resolver-next': [nodeResolver, tsResolver], // Chain resolvers
    },
  },
];
```

### Key Rules

```javascript
{
  rules: {
    'import-x/no-unresolved': 'error',  // Catch missing imports
    'import-x/no-cycle': 'error',  // Prevent circular dependencies
    'import-x/order': ['error', {  // Enforce import order
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    }],
    'import-x/no-restricted-paths': ['error', {  // Architecture enforcement
      zones: [
        { target: 'apps/web/**', from: 'apps/api/**', message: 'Web → API forbidden' },
      ],
    }],
  },
}
```

## Monorepo Patterns

### Turborepo Integration

```json
// turbo.json
{
  "tasks": {
    "lint": {
      "dependsOn": ["^lint"], // Lint upstream packages first
      "inputs": [
        "$TURBO_DEFAULT$",
        ".env.*",
        "eslint.config.mjs",
        ".prettierrc"
      ]
    }
  }
}
```

**Command**: `pnpm lint` → `turbo run lint` (caches by inputs hash)

### Centralized Config Package

```javascript
// packages/eslint-config/base.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
];
```

```javascript
// apps/web/eslint.config.mjs
import baseConfig from '@repo/eslint-config/base';

export default [
  ...baseConfig,
  { rules: { 'no-console': 'warn' } }, // App-specific overrides
];
```

**Benefits**: Single source of truth, high cache hit ratios, easy updates.

### Root Orchestration (lint-staged)

```javascript
// eslint.config.mjs (root)
import baseConfig from '@repo/eslint-config/base';
import nextJsConfig from '@repo/eslint-config/next';

export default [
  ...baseConfig,
  // Map file patterns to configs
  ...nextJsConfig.map((c) => ({ ...c, files: ['apps/web/**/*.{ts,tsx}'] })),
];
```

## Performance Optimization

### Caching

```bash
eslint . --cache  # Stores .eslintcache
```

**Turbo caching**: Automatic via `inputs` in turbo.json

### Type-Aware Linting Strategy

**Fast path** (local dev):

```javascript
// Use recommended (non-type-checked)
...tseslint.configs.recommended
```

**Strict path** (CI):

```javascript
// Use strictTypeChecked
...tseslint.configs.strictTypeChecked
{
  languageOptions: { parserOptions: { projectService: true } },
}
```

**Alternative**: Run `tsc --noEmit` first (faster for pure type errors), then
ESLint for logic bugs.

### Targeted Linting

```bash
eslint src/ --ext .ts,.tsx  # Only TypeScript
eslint apps/web/src/  # Specific package
```

## Platform-Specific Configs

### React Native / Expo

```javascript
{
  files: ['apps/mobile/**/*.{ts,tsx}'],
  languageOptions: {
    globals: {
      ...globals.node,
      global: 'readonly',
      __DEV__: 'readonly',
    },
  },
}
```

**Expo SDK 53+**: Uses flat config by default. For SDK 52 and earlier, use
legacy config.

### Node.js Scripts

```javascript
{
  files: ['scripts/**/*.ts', '*.config.ts'],
  languageOptions: {
    globals: { ...globals.node, __dirname: 'readonly', __filename: 'readonly' },
  },
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Lint
on: [pull_request, push]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint # Runs turbo lint
```

### Best Practices

- **Cache dependencies**: `cache: 'pnpm'` in setup-node
- **Fail fast**: Lint before tests (cheap feedback)
- **Parallel jobs**: Lint separate packages in parallel
- **SARIF output**: Use `@microsoft/eslint-formatter-sarif` for PR annotations

## Troubleshooting

### Import Resolution Failures

**Symptom**: `import-x/no-unresolved` errors on valid imports

**Fixes**:

1. Verify `tsconfig.json` paths are correct
2. Check resolver chain order: `[nodeResolver, tsResolver]`
3. Ensure `alwaysTryTypes: true` for @types packages

### Slow Type-Aware Linting

**Symptom**: Lint takes >30s

**Fixes**:

1. Enable ESLint cache: `--cache`
2. Use `projectService: true` (auto-detects tsconfig per file)
3. Split configs: fast rules locally, type-aware in CI
4. Consider `tsc --noEmit` for type errors, ESLint for logic

### JSX False Positives

**Symptom**: Component imported but flagged as unused

**Fix**: ESLint 10+ tracks JSX references automatically. If using older version,
add `@eslint-react/jsx-uses-vars`.

### Config Not Applied

**Symptom**: Rules not running on specific files

**Fix**: ESLint 10 looks up config from each file's directory. Ensure
`eslint.config.mjs` exists in parent directories or use root config with `files`
patterns.

## Commands

```bash
# Project-specific
pnpm lint              # Turbo lint across all packages
pnpm --filter @life-os/web lint  # Lint specific package

# ESLint CLI
eslint . --fix         # Auto-fix issues
eslint . --cache       # Use cache
eslint . --max-warnings 0  # Treat warnings as errors
eslint src/ --print-config  # Debug config for file
```

## Anti-Patterns

| Pattern                                     | Why Bad                       | Better                          |
| ------------------------------------------- | ----------------------------- | ------------------------------- |
| Legacy `.eslintrc.json`                     | ESLint 10 removed support     | Flat config `eslint.config.mjs` |
| `@typescript-eslint/no-explicit-any: 'off'` | Defeats type safety           | Use sparingly with `warn`       |
| No `import-x/no-cycle`                      | Allows circular deps          | Enable to catch cycles          |
| Linting `dist/`, `build/`                   | Wastes time on generated code | Add to `ignores`                |
| ESLint formatting rules                     | Conflicts with Prettier       | Use `eslint-config-prettier`    |
| Type-aware on all files                     | Slow performance              | Split fast/strict configs       |

## Resources

- [ESLint v10 Release](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)
- [TypeScript-ESLint v8](https://typescript-eslint.io)
- [Import-X Plugin](https://github.com/un-ts/eslint-plugin-import-x)
- [Turborepo ESLint Guide](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks/eslint)
- [Expo ESLint Guide](https://docs.expo.dev/guides/using-eslint/)
