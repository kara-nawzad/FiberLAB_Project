import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'engine',
      environment: 'node',
      include: ['src/engine/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'app',
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.tsx'],
    },
  },
]);
