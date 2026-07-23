import { jsdomConfig } from '@life-os/vitest-config';

export default {
  ...jsdomConfig,
  test: {
    ...jsdomConfig.test,
    setupFiles: ['./src/test/setup.ts'],
  },
};
