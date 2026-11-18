import { defineConfig } from 'vite';
// PAGES=1 when building for GitHub Pages at /family-app/. Local/dev and the zip stay relative.
export default defineConfig({
  base: process.env.PAGES === '1' ? '/family-app/' : './',
  server: { host: true, port: 5180 },
  preview: { port: 5180 },
});
