import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal on purpose. The API is called directly at its own origin (CORS is
// configured server-side with credentials) rather than through a dev proxy,
// so development exercises the exact same cross-origin + cookie path as
// production will.
export default defineConfig({
  plugins: [react()],
});
