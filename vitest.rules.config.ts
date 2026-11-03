import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/rules/**/*.test.ts', 'tests/emulator/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000
  }
});
