import { defineConfig } from 'vitest/config'; // or `import { defineConfig } from 'vite';`
import { doctest } from 'vite-plugin-doctest';
export default defineConfig({
  plugins: [doctest({ /* options */ })],
  test: {
    includeSource: [
      './src/**/*.[jt]s?(x)',
      './**/*.md',
      './test/**/*.[jt]s?(x)',
    ],
      exclude: [
          "dist/**",
          "node_modules/**",
          "**/*.test-d.ts"
      ],
      coverage:{
        exclude:[
            "dist/**",
        ]
      }
  },
});
