import mixexport from '@mnrendra/rollup-plugin-mixexport';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import esbuild from 'rollup-plugin-esbuild';

export default [
  {
    input: 'index.ts',
    output: {
      dir: 'dist',
      entryFileNames: '[name].cjs',
      sourcemap: true,
      format: 'cjs',
    },
    external: [/node_modules/],
    plugins: [typescript({ outDir: 'dist' }), resolve(), esbuild(), mixexport()],
    onwarn({ code }) {
      if (code === 'MIXED_EXPORTS') return false; // to disable Rollup's 'MIXED_EXPORTS' warning log
    },
  },
  {
    input: 'index.ts',
    output: {
      dir: 'dist',
      entryFileNames: '[name].mjs',
      sourcemap: true,
      format: 'esm',
    },
    external: [/node_modules/],
    plugins: [typescript({ outDir: 'dist' }), resolve()],
  },
];
