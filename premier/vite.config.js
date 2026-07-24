import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served at /Worldcup/england/ on GitHub Pages — keep asset URLs relative
  base: './',
  plugins: [react()],
});
