import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Worldcup/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'World Cup Sweep 2026',
        short_name: 'WC Sweep',
        description: 'World Cup 2026 sweep draw, leaderboard & fixtures',
        theme_color: '#1a472a',
        background_color: '#1a472a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.football-data\.org\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'football-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/crests\.football-data\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'team-crests-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
});
