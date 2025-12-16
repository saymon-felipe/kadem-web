import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const api_origins = [
    env.VITE_API_DEV,
    env.VITE_API_HOMOLOG,
    env.VITE_API_PROD
  ].filter(Boolean).map(url => {
    try { return new URL(url).origin; } catch (e) { return null; }
  }).filter(Boolean);

  const origins_regex_part = api_origins.map(escapeRegExp).join('|');

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          runtimeCaching: [
            {
              urlPattern: new RegExp(`^(${origins_regex_part}).*\/api\/system$`),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-system-cache',
                expiration: {
                  maxEntries: 1,
                  maxAgeSeconds: 60 * 60 * 24
                }
              }
            },
            {
              urlPattern: new RegExp(`^(${origins_regex_part}).*\/system\/proxy-image`),
              handler: 'CacheFirst',
              options: {
                cacheName: 'youtube-images-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 30 * 24 * 60 * 60
                },
                cacheableResponse: {
                  statuses: [200]
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'runtime-images-cache',
                expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 }
              }
            },
            {
              urlPattern: ({ url }) => url.hostname === "img.logo.dev",
              handler: 'CacheFirst',
              options: {
                cacheName: 'logos-images-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: ({ url }) => url.hostname === 'placehold.co',
              handler: 'CacheFirst',
              options: {
                cacheName: 'placeholder-images-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: ({ url }) => url.hostname.includes('s3.sa-east-1.amazonaws.com'),
              handler: 'CacheFirst',
              options: {
                cacheName: 's3-images-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        },
        manifest: {
          name: 'Kadem',
          short_name: 'Kadem',
          description: '',
          theme_color: '#1F274C',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    }
  };
});
