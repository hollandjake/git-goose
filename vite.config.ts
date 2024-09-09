/// <reference types="vitest" />
import mixexport from '@mnrendra/rollup-plugin-mixexport';
import { resolve } from 'path';
import esbuild from 'rollup-plugin-esbuild';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
    },
    testTimeout: 0,
  },
  build: {
    target: 'es6',
    minify: false,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, './src/index.ts'),
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      plugins: [esbuild(), mixexport()],
      onwarn({ code }) {
        if (code === 'MIXED_EXPORTS') return false; // to disable Rollup's 'MIXED_EXPORTS' warning log
        return undefined;
      },
    },
    ssr: true,
  },
  plugins: [dts({ exclude: ['**/*.test.ts'] })],
});
