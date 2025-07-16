import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['three', 'tone', 'howler', 'mathjs', 'lodash']
  },
  server: {
    host: true,
    port: 3000
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
          fiber: ['@react-three/fiber', '@react-three/drei', '@react-three/rapier']
        }
      }
    }
  }
})