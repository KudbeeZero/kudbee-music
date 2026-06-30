import { defineConfig } from 'vitest/config';

// Engine tests for the HERMES Hit Factory. Pure logic — runs in a node
// environment, no DOM needed (storage falls back to an in-memory store).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/hermes/__tests__/**/*.test.ts'],
  },
});
