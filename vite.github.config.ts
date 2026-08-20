import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/luma-trix/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Luma — Conversations in Motion',
        short_name: 'Luma',
        description: 'Private conversations, Moments, communities, voice and video calls.',
        theme_color: '#181510',
        background_color: '#181510',
        display: 'standalone',
        orientation: 'any',
        scope: base,
        start_url: base,
        categories: ['social', 'communication'],
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${base}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'New chat', short_name: 'New chat', description: 'Start a conversation', url: `${base}?action=new-chat`, icons: [{ src: `${base}icons/icon-192.png`, sizes: '192x192' }] },
          { name: 'Calls', short_name: 'Calls', description: 'Open recent calls', url: `${base}?section=calls`, icons: [{ src: `${base}icons/icon-192.png`, sizes: '192x192' }] }
        ]
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
      }
    })
  ]
})
