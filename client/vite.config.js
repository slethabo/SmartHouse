import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // npm workspaces run Vite from client/, but connection settings live at the project root.
  envDir: fileURLToPath(new URL('../', import.meta.url)),
  server: {
    port: 5173,

  },
  build: { outDir: 'dist', sourcemap: false },
});
