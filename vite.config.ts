import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      manifest: {
        name: 'Seabra Pressão Pro',
        short_name: 'Seabra Pro',
        description: 'Controle Inteligente da Pressão Arterial',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        id: './',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'https://raw.githubusercontent.com/noahseabra/seabra-pressao-pro/main/public/logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://raw.githubusercontent.com/noahseabra/seabra-pressao-pro/main/public/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: 'https://raw.githubusercontent.com/noahseabra/seabra-pressao-pro/main/public/logo.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Seabra Pressão Pro Dashboard'
          }
        ]
      }
    })
  ],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
