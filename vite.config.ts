import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Relative asset URLs: the same build works at the root locally and under /<repo>/ on GitHub Pages.
  base: './',
  resolve: {
    alias: {
      '@shared': fromRoot('./src/shared'),
      '@engine': fromRoot('./src/engine'),
      '@game': fromRoot('./src/game'),
    },
  },
  server: { host: true },
  test: { include: ['src/**/*.test.ts'] },
});
