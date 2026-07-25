import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Served from GitHub Pages at /Worldcup/england/ — its own scope, so the
// England service worker never collides with the World Cup app's at /Worldcup/.
const BASE = '/Worldcup/england/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: "The Eagle's Nest · England Campaign 26/27",
        short_name: "Eagle's Nest",
        description: 'Premier League + Championship sweep — conscription, orders, standings',
        theme_color: '#0E0B07',
        background_color: '#0E0B07',
        display: 'standalone',
        orientation: 'portrait',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: `${BASE}icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${BASE}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: `${BASE}index.html`,
        // Live scores and the league feed must never be served stale from cache
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/site\.api\.espn\.com\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'england-league-feed',
              expiration: { maxEntries: 10, maxAgeSeconds: 1800 },
            },
          },
        ],
      },
    }),
  ],
});
