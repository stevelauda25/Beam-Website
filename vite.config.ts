import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { heroRevealSnapshotPlugin } from './vite-plugins/heroRevealSnapshot.mjs';

export default defineConfig({
  /*
   * heroRevealSnapshotPlugin is `apply: 'serve'`: a dev-server-only route the
   * Motion Lab uses to save its Hero tuning as a reviewable file in the repo.
   * It is never instantiated for `vite build`, so it cannot reach production.
   */
  plugins: [react(), heroRevealSnapshotPlugin()],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
