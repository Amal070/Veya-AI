import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/voice': 'http://127.0.0.1:8000',
      '/interview': 'http://127.0.0.1:8000',
      '/resume': 'http://127.0.0.1:8000',
      '/audio': 'http://127.0.0.1:8000',
      '/veya': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})
