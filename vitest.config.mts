import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      provider: 'istanbul',
    },
    setupFiles: ['./vitest.setup.ts'],
    minWorkers: (process.env.CI === 'true' ? 1 : undefined),
    maxWorkers: (process.env.CI === 'true' ? 1 : undefined),
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
});
