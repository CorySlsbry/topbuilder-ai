import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.spec.ts'],
    exclude: ['node_modules', 'dist', '.next', 'tests/e2e/**', 'tests/firestore-rules.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
