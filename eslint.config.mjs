import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/build/**',
    '**/coverage/**',
  ]),
  js.configs.recommended,
  {
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/no-unresolved': 'error',
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
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
  prettier,
]);
