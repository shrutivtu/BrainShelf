import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isTauri = process.env.TAURI_ENV_PLATFORM != null;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
});
