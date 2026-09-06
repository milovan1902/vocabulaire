import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Chemins relatifs : l'application fonctionne aussi bien à la racine d'un
  // domaine que dans un sous-dossier, sans reconfiguration.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Vocabulaire anglais',
        short_name: 'Vocabulaire',
        description: 'Révision de vocabulaire anglais par répétition espacée.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FBFAF6',
        theme_color: '#16233F',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // webp ajouté : sans lui, les visuels de dos fournis avec
        // l'application ne sont pas mis en cache et disparaissent hors ligne.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,webp}'],
      },
    }),
  ],
});
