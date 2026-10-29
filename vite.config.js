import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        injectManifest: { globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'] },
        manifest: {
          name: 'Kadem',
          short_name: 'Kadem',
          description: 'Organize seus projetos, tarefas e informações em um só lugar.',
          lang: 'pt-BR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#1F274C',
          background_color: '#1F274C',
          icons: [
            {
              src: 'kadem-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          // Manter diagnóstico de falhas no PWA publicado; remover logs comuns.
          drop_console: ['log', 'debug', 'trace'],
          drop_debugger: true,
        },
      },
      sourcemap: false
    },
    server: {
      allowedHosts: ['reclining-banknote-clumsily.ngrok-free.dev'],
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
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
