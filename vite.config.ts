import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    sveltekit({
      // Application Wails : pages SPA (ssr = false) compilées dans dist/, embarqué par main.go.
      adapter: adapter({ pages: 'dist', assets: 'dist', fallback: 'index.html' }),
    }),
  ],
  // wails3 dev se connecte en IPv4 : sans host explicite, Vite peut n'écouter que sur ::1 (localhost IPv6).
  server: { host: '127.0.0.1' },
  test: { include: ['src/**/*.test.ts'] },
});
