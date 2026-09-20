import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The turn tests boot the app and poll the journal with a 15 s deadline of their own
    // (`journalLines`); vitest's 5 s default cut that short, and under load — a bed running
    // beside the suite — a booted turn took 14 s (task 7.9).
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
