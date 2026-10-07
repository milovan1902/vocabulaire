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
      // CHANTIER 156 — « prompt » : la page est prévenue qu'une version attend,
      // et le bandeau « Recharger » l'applique tout de suite.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'icon-192.png',
        'icon-512.png',
        'icon-512-maskable.png',
        'apple-touch-icon.png',
        'favicon.png',
      ],
      manifest: {
        name: 'Neuro Anglais',
        short_name: 'Neuro Anglais',
        description: 'Révision de vocabulaire anglais par répétition espacée.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F253C',
        theme_color: '#0F253C',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // Android recadre l'icône : celle-ci a le motif dans le cercle de
          // sécurité, l'autre garderait un bord rogné.
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        /* CHANTIER 216 — ttf : les polices du Cinéma muet et de la Bibliothèque, pour le hors ligne. */
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,ttf,webp}'],
        /*
         * CHANTIER 149 — LE PREMIER CHARGEMENT NE TÉLÉCHARGE PLUS TOUS LES DOS.
         *
         * Les images de `src/assets` (dos des paquets, profils de l'ouverture)
         * ne sont plus pré-chargées à l'installation : elles se chargent quand
         * un écran les affiche, puis restent en cache (règle ci-dessous). Les
         * icônes de `public/` (onglets, réglages) restent pré-chargées :
         * elles pèsent peu et servent sur tous les écrans.
         */
        globIgnores: ['**/assets/*.{png,webp,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/[^/]+\.(png|webp|jpe?g)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-paquets',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        /*
         * CHANTIER 104 — /api/ N'EST PAS DE L'APPLICATION.
         *
         * En mode `generateSW`, le service worker répond à toute NAVIGATION
         * par `index.html` : c'est ce qui permet d'ouvrir l'application hors
         * ligne depuis n'importe quelle adresse. Mais il avalait du même
         * geste les adresses des fonctions Cloudflare — ouvrir /api/parler
         * servait la coquille de l'application, donc une page blanche.
         *
         * Les appels `fetch` de l'écran « Parler » passaient, eux : ce ne
         * sont pas des navigations. La confusion ne portait donc que sur le
         * diagnostic — mais elle coûterait une demi-heure à chaque fois.
         */
        /*
         * CHANTIER 138 — même chose pour /confidentialite.html.
         *
         * CHANTIER 137 — la page publique de suppression de compte est un
         * vrai fichier : le service worker ne doit pas la remplacer par
         * l'application quand on l'ouvre depuis la fiche Google Play.
         */
        navigateFallbackDenylist: [/^\/api\//, /^\/suppression-compte/, /^\/confidentialite/],
      },
    }),
  ],
});
