import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Engine tests for the HERMES Hit Factory. Pure logic — runs in a node
// environment, no DOM needed (storage falls back to an in-memory store).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/hermes/__tests__/**/*.test.ts'],
  },
  // Mirrors tsconfig.json's "@/*": ["./*"] — Next.js resolves it for the app build,
  // but plain vitest doesn't read tsconfig paths on its own. Nothing needed this
  // until now (every lib/hermes/*.ts import used relative paths); exampleSong.ts's
  // `@/examples/...` import is the first one a test (badges.test.ts) pulls in.
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
