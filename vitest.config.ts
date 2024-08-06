import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      provider: 'istanbul',
    },
    setupFiles: ['./vitest.setup.ts'],
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
});
