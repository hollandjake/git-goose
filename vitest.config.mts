import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      provider: 'istanbul',
    },
    slowTestThreshold: 1000,
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
});
