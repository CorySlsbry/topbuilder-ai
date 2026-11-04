import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Separate config for Security Rules tests. Requires the Firestore emulator
// running on localhost:8080. Run via `pnpm --filter web test:rules` after
// `firebase emulators:start --only firestore`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/firestore-rules.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
