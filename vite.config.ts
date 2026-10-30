import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    sveltekit({
      // Serveur Node : pages SPA (ssr = false) + routes /api reliées à PostgreSQL.
      adapter: adapter(),
    }),
  ],
  // Docker : si les modifications ne remontent pas du volume monté, CHOKIDAR_USEPOLLING=1.
  server: { watch: process.env.CHOKIDAR_USEPOLLING ? { usePolling: true, interval: 300 } : undefined },
  test: { include: ['src/**/*.test.ts'] },
});
