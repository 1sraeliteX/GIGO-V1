import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Serve static assets in dev; in build, outDir is public/ itself so skip copying.
  publicDir: command === 'serve' ? 'public' : false,
  build: {
    outDir: 'public',
    emptyOutDir: false,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
}));
