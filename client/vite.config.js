import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forward /api calls to the Express server. The browser thinks everything
    // comes from one origin, so cookies just work and no CORS setup is needed in dev.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
