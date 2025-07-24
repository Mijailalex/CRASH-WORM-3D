// ============================================================================
// 🔧 CRASH WORM 3D - CONFIGURACIÓN VITE OPTIMIZADA
// ============================================================================
// Ubicación: vite.config.js
// Configuración avanzada de Vite con optimizaciones de seguridad y performance

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// ============================================================================
// 🔧 CONFIGURACIÓN PRINCIPAL
// ============================================================================

export default defineConfig(({ command, mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  console.log(`🚀 Building for: ${mode} (${command})`);

  return {
    // ========================================
    // 📁 CONFIGURACIÓN DE PATHS
    // ========================================
    root: '.',
    base: env.VITE_BASE_URL || '/',
    publicDir: 'public',

    // Resolver aliases para imports limpios
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@core': resolve(__dirname, 'src/core'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@styles': resolve(__dirname, 'src/styles'),
        '@data': resolve(__dirname, 'src/data'),
        '@context': resolve(__dirname, 'src/context'),
        '@public': resolve(__dirname, 'public')
      }
    },

    // ========================================
    // 🔌 PLUGINS
    // ========================================
    plugins: [
      react({
        // Configuración React optimizada
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
        babel: {
          plugins: isProduction ? [
            // Plugin para remover console.log en producción
            ['babel-plugin-transform-remove-console', {
              exclude: ['error', 'warn', 'info']
            }]
          ] : [],
          presets: [
            ['@babel/preset-react', {
              runtime: 'automatic',
              development: isDevelopment,
              importSource: 'react'
            }]
          ]
        },
        // Fast Refresh mejorado
        fastRefresh: isDevelopment,
        include: /\.(jsx|js|ts|tsx)$/,
        exclude: /node_modules/
      }),

      // Plugin personalizado para build info
      {
        name: 'build-info',
        generateBundle() {
          // Inyectar información de build
          const buildInfo = {
            version: env.npm_package_version || '1.0.0',
            buildTime: new Date().toISOString(),
            environment: mode,
            commitHash: env.VITE_COMMIT_HASH || 'unknown',
            features: {
              webgl2: true,
              webxr: env.VITE_ENABLE_WEBXR === 'true',
              multiplayer: env.VITE_ENABLE_MULTIPLAYER !== 'false',
              analytics: env.VITE_ENABLE_ANALYTICS !== 'false',
              pwa: env.VITE_ENABLE_PWA !== 'false'
            }
          };

          // Crear archivo de build info
          this.emitFile({
            type: 'asset',
            fileName: 'build-info.json',
            source: JSON.stringify(buildInfo, null, 2)
          });
        }
      }
    ],

    // ========================================
    // 🏗️ CONFIGURACIÓN DE BUILD
    // ========================================
    build: {
      // Directorio de salida
      outDir: 'dist',
      assetsDir: 'assets',

      // Configuración de sourcemaps
      sourcemap: isDevelopment ? true : 'hidden',

      // Configuración de minificación
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          // Remover console logs en producción
          drop_console: true,
          drop_debugger: true,
          // Optimizaciones adicionales
          pure_funcs: ['console.log', 'console.debug'],
          passes: 2
        },
        mangle: {
          // Proteger nombres de funciones importantes
          reserved: ['GameEngine', 'Player', 'Enemy']
        },
        format: {
          // Remover comentarios
          comments: false
        }
      } : {},

      // Configuración de CSS
      cssCodeSplit: true,
      cssMinify: isProduction,

      // Configuración de chunks
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          // Estrategia de chunks optimizada
          manualChunks: {
            // Vendor chunk (librerías externas)
            vendor: [
              'react',
              'react-dom'
            ],
            // Three.js chunk
            three: [
              'three',
              '@react-three/fiber',
              '@react-three/drei',
              '@react-three/rapier'
            ],
            // Audio chunk
            audio: [
              'tone',
              'howler'
            ],
            // Utils chunk
            utils: [
              'lodash',
              'mathjs',
              'uuid',
              'crypto-js'
            ],
            // Animation chunk
            animation: [
              'framer-motion',
              '@react-spring/three'
            ]
          },

          // Nombres de archivos para cacheo optimal
          chunkFileNames: isProduction
            ? 'js/[name].[hash].js'
            : 'js/[name].js',
          entryFileNames: isProduction
            ? 'js/[name].[hash].js'
            : 'js/[name].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];

            // Organizar assets por tipo
            if (/\.(mp3|wav|ogg|m4a)$/i.test(assetInfo.name)) {
              return `audio/[name].[hash].${ext}`;
            }
            if (/\.(png|jpe?g|gif|svg|webp)$/i.test(assetInfo.name)) {
              return `images/[name].[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `fonts/[name].[hash].${ext}`;
            }
            if (/\.css$/i.test(assetInfo.name)) {
              return `css/[name].[hash].${ext}`;
            }

            return `assets/[name].[hash].${ext}`;
          }
        },

        // Configuraciones adicionales de Rollup
        external: [],

        // Plugins de Rollup
        plugins: []
      },

      // Configuración de assets
      assetsInlineLimit: 4096, // 4KB limite para inline assets

      // Configuración de chunks
      chunkSizeWarningLimit: 1000,

      // Configuración de watch (desarrollo)
      watch: isDevelopment ? {
        include: 'src/**',
        exclude: ['node_modules/**', 'dist/**']
      } : null,

      // Target de build
      target: [
        'es2020',
        'chrome80',
        'firefox78',
        'safari14',
        'edge88'
      ],

      // Configuración de polyfills
      polyfillModulePreload: true
    },

    // ========================================
    // 🔍 CONFIGURACIÓN DE DESARROLLO
    // ========================================
    server: {
      port: parseInt(env.VITE_PORT) || 3000,
      host: env.VITE_HOST || 'localhost',
      open: env.VITE_OPEN_BROWSER !== 'false',

      // Configuración HTTPS para desarrollo
      https: env.VITE_HTTPS === 'true' ? {
        key: env.VITE_HTTPS_KEY,
        cert: env.VITE_HTTPS_CERT
      } : false,

      // Configuración de proxy para API
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        },

        // Proxy para WebSocket del juego
        '/socket.io': {
          target: env.VITE_WEBSOCKET_URL || 'ws://localhost:8081',
          ws: true,
          changeOrigin: true
        }
      },

      // Configuración de CORS
      cors: {
        origin: [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'https://localhost:3000'
        ],
        credentials: true
      },

      // Configuración de headers de seguridad
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },

      // HMR (Hot Module Replacement)
      hmr: {
        port: parseInt(env.VITE_HMR_PORT) || 24678,
        overlay: true
      },

      // File watching
      watch: {
        usePolling: env.VITE_USE_POLLING === 'true',
        ignored: ['**/node_modules/**', '**/dist/**']
      }
    },

    // ========================================
    // 🏁 CONFIGURACIÓN DE PREVIEW
    // ========================================
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT) || 4173,
      host: env.VITE_PREVIEW_HOST || 'localhost',
      https: env.VITE_PREVIEW_HTTPS === 'true',
      open: env.VITE_PREVIEW_OPEN !== 'false',

      // Headers de seguridad para preview
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      }
    },

    // ========================================
    // 🔧 OPTIMIZACIÓN DE DEPENDENCIAS
    // ========================================
    optimizeDeps: {
      // Pre-bundling de dependencias
      include: [
        'react',
        'react-dom',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        '@react-three/rapier',
        'tone',
        'howler',
        'framer-motion',
        '@react-spring/three',
        'styled-components',
        'mathjs',
        'lodash',
        'uuid',
        'crypto-js',
        'lz-string'
      ],

      // Exclusiones
      exclude: [
        'electron'
      ],

      // Configuración de esbuild
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true
        }
      }
    },

    // ========================================
    // 🔒 CONFIGURACIÓN DE SEGURIDAD
    // ========================================

    // Variables de entorno
    envPrefix: ['VITE_', 'REACT_APP_'],
    envDir: '.',

    // ========================================
    // 🎯 CONFIGURACIÓN ESPECÍFICA DEL MODO
    // ========================================
    define: {
      // Variables globales
      __DEV__: isDevelopment,
      __PROD__: isProduction,
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(env.npm_package_version || '1.0.0'),
      __COMMIT_HASH__: JSON.stringify(env.VITE_COMMIT_HASH || 'unknown'),

      // Feature flags
      __ENABLE_MULTIPLAYER__: env.VITE_ENABLE_MULTIPLAYER !== 'false',
      __ENABLE_ANALYTICS__: env.VITE_ENABLE_ANALYTICS !== 'false',
      __ENABLE_PWA__: env.VITE_ENABLE_PWA !== 'false',
      __ENABLE_WEBXR__: env.VITE_ENABLE_WEBXR === 'true',

      // URLs de API
      __API_URL__: JSON.stringify(env.VITE_API_URL || 'http://localhost:8080'),
      __WEBSOCKET_URL__: JSON.stringify(env.VITE_WEBSOCKET_URL || 'ws://localhost:8081')
    },

    // ========================================
    // 📊 CONFIGURACIÓN DE PERFORMANCE
    // ========================================

    // Worker configuración
    worker: {
      format: 'es',
      plugins: []
    },

    // CSS configuración
    css: {
      devSourcemap: isDevelopment,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      },
      modules: {
        scopeBehaviour: 'local',
        generateScopedName: isProduction
          ? '[hash:base64:5]'
          : '[name]__[local]__[hash:base64:5]'
      },
      postcss: {
        plugins: [
          // Autoprefixer se incluye automáticamente
        ]
      }
    },

    // ========================================
    // 🔍 CONFIGURACIÓN DE LOGGING
    // ========================================
    logLevel: isDevelopment ? 'info' : 'warn',
    clearScreen: false,

    // ========================================
    // 📱 CONFIGURACIÓN EXPERIMENTAL
    // ========================================
    experimental: {
      // Renderizado en servidor (futuro)
      renderBuiltUrl: (filename, { hostType }) => {
        if (hostType === 'js') {
          return { js: `/${filename}` };
        }
        return { relative: true };
      }
    }
  };
});
