import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    modulePreload: false
  },
  test: {
    globals: true,
    environment: 'node'
  }
});
