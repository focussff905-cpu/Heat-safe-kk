import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
  },
  server: {
    proxy: {
      '/tmd-api': {
        target: 'http://www.aws-observation.tmd.go.th',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tmd-api/, ''),
      },
    },
  },
})
