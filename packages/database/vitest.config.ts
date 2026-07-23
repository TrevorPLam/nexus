import { nodeConfig } from '@life-os/vitest-config';

export default {
  ...nodeConfig,
  test: {
    ...nodeConfig.test,
    coverage: {
      ...nodeConfig.test?.coverage,
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'vitest.config.ts',
        'drizzle/',
      ],
    },
  },
};
