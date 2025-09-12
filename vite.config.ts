import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Optimize bundle size
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split React and related libraries
            if (id.includes('react')) {
              return 'react-vendor';
            }
            // Split large libraries
            if (id.includes('@fortawesome') || id.includes('leaflet')) {
              return 'ui-vendor';
            }
            // All other vendor libraries
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Optimize CSS
    cssCodeSplit: true,
    // Enable minification with esbuild (default)
    minify: 'esbuild',
  },
})