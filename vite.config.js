import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configuración de React con optimizaciones
      include: "**/*.{jsx,tsx}",
      babel: {
        plugins: [
          // Plugin para styled-components
          [
            "babel-plugin-styled-components",
            {
              displayName: true,
              fileName: false
            }
          ]
        ]
      }
    })
  ],
  
  // Configuración de resolución de módulos
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@context': resolve(__dirname, 'src/context'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },

  // Configuración del servidor de desarrollo
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
    hmr: {
      overlay: true
    }
  },

  // Configuración de preview
  preview: {
    port: 4173,
    host: true,
    open: true
  },

  // Optimizaciones de build
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    
    // Configuración de rollup
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks para mejor caching
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'audio-vendor': ['tone', 'howler'],
          'animation-vendor': ['framer-motion', 'lottie-web'],
          'ui-vendor': ['styled-components', '@mui/material'],
          'utils-vendor': ['lodash', 'mathjs', 'uuid']
        }
      }
    },

    // Configuración de assets
    assetsDir: 'assets',
    assetsInlineLimit: 4096,
    
    // Configuración de CSS
    cssTarget: 'chrome80'
  },

  // Optimizaciones de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'framer-motion',
      'styled-components',
      'tone',
      'howler',
      'lodash',
      'mathjs'
    ],
    exclude: [
      // Excluir dependencias que pueden causar problemas
    ]
  },

  // Configuración de CSS
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    },
    modules: {
      localsConvention: 'camelCase'
    },
    postcss: {
      plugins: [
        // Configuración de Tailwind se hará después
      ]
    }
  },

  // Variables de entorno
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // Configuración de worker
  worker: {
    format: 'es',
    plugins: [react()]
  },

  // Configuración experimental
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      } else {
        return { relative: true }
      }
    }
  },

  // Configuración de logging
  logLevel: 'info',
  clearScreen: false,

  // Configuración para PWA (opcional)
  // Descomenta si quieres convertir en PWA
  /*
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      manifest: {
        name: 'Crash Worm 3D Adventure',
        short_name: 'CrashWorm3D',
        description: 'Epic 3D adventure game in your browser',
        theme_color: '#00FFFF',
        background_color: '#0a0e27',
        display: 'fullscreen',
        orientation: 'landscape',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
  */
})