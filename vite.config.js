import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.svg', 'icons.svg', 'logo.png', 'logo_black_bg.png'],
      manifest: {
        name: 'TrackMyFlip',
        short_name: 'TrackMyFlip',
        description: 'Professional Yard Sale Companion and Flipping Tracker',
        theme_color: '#0f3a8b',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/logo.png',
            sizes: 'any',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('react/') || id.includes('react-dom/')) return 'vendor-react';
            return 'vendor-core';
          }
        }
      }
    }
  }
});
