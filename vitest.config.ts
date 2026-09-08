import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { doctest } from 'vite-plugin-doctest';

export default defineConfig({
  plugins: [doctest({ /* options */ })],
  resolve: {
    alias: {
      // The doctests embedded in README.md / docs/*.md import the package by its
      // published name so the snippets stay copy-pasteable for readers. Point that
      // name at the sources so `npm test` works on a clean clone, with no build step.
      '@mt3o/middleware-pipe': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
  test: {
    includeSource: [
      './src/**/*.[jt]s?(x)',
      './**/*.md',
      './test/**/*.[jt]s?(x)',
    ],
    exclude: [
      'dist/**',
      'node_modules/**',
      '**/*.test-d.ts',
    ],
    coverage: {
      exclude: [
        'dist/**',
      ],
    },
  },
});
