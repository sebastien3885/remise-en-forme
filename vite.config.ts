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
      includeAssets: ['icones/icone.svg'],
      manifest: {
        name: 'Remise en forme',
        short_name: 'Forme',
        description: 'Suivi personnel des seances et de l alimentation',
        lang: 'fr',
        start_url: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          {
            src: 'icones/icone.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
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
