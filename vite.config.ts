// vite.config.ts
import { defineConfig } from 'vite';

// Note: vite-plugin-doctest is deliberately absent here. It is only needed to run
// the examples embedded in the markdown files (see vitest.config.ts); src/ has no
// in-source `import.meta.vitest` blocks, and including the plugin in the library
// build breaks the sourcemap chain, producing empty maps.
export default defineConfig({
  build: {
    minify: false,
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      // Must be a valid JS identifier: it becomes the global in the UMD build.
      name: 'MiddlewarePipe',
      fileName: 'middleware-pipe',
      formats: ['es', 'cjs', 'umd'],
    },
    rollupOptions: {
      // zod is a type-only import today, but keep it external so a future
      // runtime use never silently ends up inside the bundle.
      external: ['zod'],
      output: {
        globals: {
          zod: 'Zod',
        },
      },
    },
  },
});
