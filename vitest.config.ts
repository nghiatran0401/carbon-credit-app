import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    alias: {
      '@': '/src',
      // Allow test files to import modules that use `import 'server-only'`
      // (a Next.js guard that has no runtime equivalent in Vitest).
      'server-only': '/tests/helpers/server-only-mock.ts',
    },
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
