// vite.config.ts
import { defineConfig } from 'vite';
import doctest from 'vite-plugin-doctest';

export default defineConfig({
  plugins: [doctest()],
  build: {
    minify: false,
    lib: {
      entry: 'src/index.ts',
      name: 'Middleware Pipe',
      fileName: 'middleware-pipe',
      formats: ['es','cjs','umd'],
    },
    rollupOptions: {
      // Externalize dependencies you don't want bundled
      external: [],
      output: {

      },
    },
  },
});
