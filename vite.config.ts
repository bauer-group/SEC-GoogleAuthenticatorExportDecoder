import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// GitHub Pages base path - set via environment variable or default to '/'
// For GitHub Pages: /SEC-GoogleAuthenticatorExportDecoder/
// For custom domain or Docker: /
const base = process.env.GITHUB_PAGES === 'true'
  ? '/SEC-GoogleAuthenticatorExportDecoder/'
  : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon-192x192.png',
        'icon-512x512.png',
        'locales/**/*.json'
      ],
      manifest: {
        name: 'Google Authenticator Export Decoder',
        short_name: 'Auth Decoder',
        description: 'Scan Google Authenticator export QR codes and export TOTP secrets to CSV, JSON, or Bitwarden format',
        theme_color: '#4285f4',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: base,
        scope: base,
        id: base,
        categories: ['utilities', 'security'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Precache all built assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Also precache translation files
        globIgnores: ['**/node_modules/**'],
        // Navigation fallback for SPA
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Clean old caches on update
        cleanupOutdatedCaches: true,
        // Client claims for immediate activation
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          // Cache translation files with StaleWhileRevalidate
          {
            urlPattern: /\/locales\/.*\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'translations-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache Google Fonts files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache images
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      // Development options for easier testing
      devOptions: {
        enabled: false, // Set to true to test PWA in development
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    target: 'ES2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'],
          qrcode: ['html5-qrcode'],
          protobuf: ['protobufjs']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173
  },
  test: {
    // Exclude legacy template-project from tests
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/template-project/**'
    ]
  }
});
