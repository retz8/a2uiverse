import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The publish tests boot a marketplace over a fake agent and run the smoke test through it.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
