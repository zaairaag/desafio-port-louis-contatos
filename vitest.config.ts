import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/setup/global-setup.ts'],
          setupFiles: ['tests/setup/load-test-env.ts'],
          fileParallelism: false,
          pool: 'forks',
        },
      },
    ],
  },
});
