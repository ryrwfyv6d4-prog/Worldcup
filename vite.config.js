import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Worldcup/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: "Dan's Shed · World Cup Sweep '26",
        short_name: "Dan's Shed",
        description: "Dan's Shed — World Cup 2026 sweep draw, standings & fixtures",
        theme_color: '#0A1628',
        background_color: '#0A1628',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Worldcup/',
        start_url: '/Worldcup/',
        icons: [
          { src: '/Worldcup/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/Worldcup/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
