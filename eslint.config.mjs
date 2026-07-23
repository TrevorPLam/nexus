import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/node_modules/react-native/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '.turbo',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      '**/vitest.config.ts',
      '**/node_modules/@react-native/**',
      '**/node_modules/react-native/Libraries/**',
    ],
  },
  // Base JavaScript rules
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
        module: 'readonly',
        console: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
      },
    },
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/no-cycle': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
    settings: {
      'import-x/resolver': {
        node: true,
        typescript: true,
      },
    },
  },
  // TypeScript files
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
        module: 'readonly',
        console: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import-x': importX,
    },
    rules: {
      // Type-aware rules for critical paths
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'import-x/no-cycle': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      // Client packages (web, mobile) should not import from server packages (api, worker, database)
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
              from: 'apps/worker/**',
              message: 'Web client should not import from worker code',
            },
            {
              target: 'apps/web/**',
              from: 'packages/database/**',
              message: 'Web client should not import from database package (use api-client)',
            },
            {
              target: 'apps/mobile/**',
              from: 'apps/api/**',
              message: 'Mobile client should not import from API server code',
            },
            {
              target: 'apps/mobile/**',
              from: 'apps/worker/**',
              message: 'Mobile client should not import from worker code',
            },
            {
              target: 'apps/mobile/**',
              from: 'packages/database/**',
              message: 'Mobile client should not import from database package (use mobile-data)',
            },
            {
              target: 'packages/api-client/**',
              from: 'apps/api/**',
              message: 'API client should not import from API server code',
            },
            {
              target: 'packages/api-client/**',
              from: 'packages/database/**',
              message: 'API client should not import from database package',
            },
          ],
        },
      ],
    },
    settings: {
      'import-x/resolver': {
        node: true,
        typescript: true,
      },
    },
  },
  // Mobile-specific config (React Native)
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
        module: 'readonly',
        console: 'readonly',
        global: 'readonly',
        __DEV__: 'readonly',
      },
    },
  },
  // Prettier integration (must be last)
  prettier,
];
