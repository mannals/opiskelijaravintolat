import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          // Add other HTML files here
        },
        output: {
          dir: resolve(__dirname, 'dist'),
          // Copy the public directory to the dist directory
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    base: './',
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'script',
            devOptions: {
                enabled: true
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,ttf}'],
                sourcemap: true,
            },
            includeAssets: ['favicon.ico', 'apple-touch-icon.svg', 'mask-icon.svg'],
            manifest: {
                name: 'Opiskelijaravintolat',
                short_name: 'Opiskelijaravintolat',
                description: 'Etsi opiskelijaravintoloita läheltäsi',
                display: 'standalone',
                start_url: './index.html',
                scope: './',
                theme_color: '#ffffff',
                background_color: '#ffffff',
                icons: [
                    {
                        src: './img/icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                      },
                      {
                        src: './img/icons/icon-256x256.png',
                        sizes: '256x256',
                        type: 'image/png',
                      },
                      {
                        src: './img/icons/icon-384x384.png',
                        sizes: '384x384',
                        type: 'image/png',
                      },
                      {
                        src: './img/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                      },
                      {
                        src: './img/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                      },
                ]
            }
        })
    ],
    publicDir: 'public',
    assetsInclude: ['favicon-*.ico', 'favicon.ico', 'icon-*.png']
})
