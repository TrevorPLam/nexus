import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export const baseConfig = defineConfig({
  test: {
    globals: true,
    watch: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts', 'vitest.config.ts'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});

export const nodeConfig = defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'node',
  },
});

export const jsdomConfig = defineConfig({
  plugins: [react()],
  test: {
    ...baseConfig.test,
    environment: 'jsdom',
    coverage: {
      ...baseConfig.test?.coverage,
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'vitest.config.ts',
        'src/test/setup.ts',
      ],
    },
  },
});
