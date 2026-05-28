import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'admin-spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (
            !req.url.startsWith('/api') &&
            !req.url.startsWith('/@') &&
            !req.url.startsWith('/node_modules') &&
            !req.url.includes('.')
          ) {
            req.url = '/admin.html'
          }
          next()
        })
      },
    },
  ],
  root: '.',
  build: {
    outDir: 'dist-admin',
    rollupOptions: {
      input: './admin.html',
    },
  },
  server: {
    host: true,
    port: 5174,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
