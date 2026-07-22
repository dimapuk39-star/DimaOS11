import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative assets work both on username.github.io and /repository-name/.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
