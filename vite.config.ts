import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Nom du depot GitHub. Il fixe l'adresse publique de l'application :
 *   https://<compte>.github.io/<NOM_DEPOT>/
 * C'est la seule ligne a changer si le depot est renomme (etape 5).
 */
const NOM_DEPOT = 'remise-en-forme'

export default defineConfig(({ mode }) => ({
  // En developpement on sert a la racine, en production sous le nom du depot.
  base: mode === 'production' ? `/${NOM_DEPOT}/` : '/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icones/icone.svg', 'icones/icone-192.png'],
      manifest: {
        name: 'Remise en forme',
        short_name: 'Forme',
        description: 'Suivi personnel des séances et de l’alimentation',
        lang: 'fr',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d1014',
        theme_color: '#0d1014',
        categories: ['health', 'fitness', 'lifestyle'],
        // Chrome sur Android réclame des PNG de 192 et 512 pour proposer
        // l'installation ; le SVG reste pour les écrans à forte densité.
        // L'icône `maskable` est à part : Android recadre les icônes
        // adaptatives, et un glyphe à bord perdu s'y ferait rogner.
        icons: [
          { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icones/icone-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icones/icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Séance du jour', short_name: 'Aujourd’hui', url: './#/aujourdhui' },
          { name: 'Noter un repas', short_name: 'Repas', url: './#/alimentation' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Toute navigation retombe sur index.html : l'application vit hors ligne.
        navigateFallback: 'index.html',
      },
    }),
  ],

  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}))
