/* ============================================================================ */
/* 🎮 CRASH WORM 3D - CONFIGURACIÓN DE VITE */
/* ============================================================================ */
/* Ubicación: vite.config.js */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import eslint from 'vite-plugin-eslint';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// ========================================
// 🔧 CONFIGURACIÓN PRINCIPAL
// ========================================

export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  // Determine if this is a build or development
  const isBuild = command === 'build';
  const isDev = mode === 'development';
  const isAnalyze = mode === 'analyze';

  console.log(`🏗️ Building in ${mode} mode (${command})`);

  return {
    // ========================================
    // 🔌 PLUGINS
    // ========================================
    plugins: [
      // React plugin with SWC for faster builds
      react({
        // Enable React refresh in development
        fastRefresh: isDev,
        // JSX runtime configuration
        jsxImportSource: 'react',
        // SWC options
        swcOptions: {
          jsc: {
            transform: {
              react: {
                runtime: 'automatic',
                development: isDev,
                refresh: isDev
              }
            }
          }
        }
      }),

      // ESLint integration
      eslint({
        cache: true,
        include: ['src/**/*.{js,jsx,ts,tsx}'],
        exclude: ['node_modules', 'dist', 'build'],
        failOnWarning: isBuild,
        failOnError: isBuild
      }),

      // PWA Plugin
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            },
            {
              urlPattern: /\.(?:mp3|wav|ogg|m4a)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'audio-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ]
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'safari-pinned-tab.svg'],
        manifest: {
          name: 'Crash Worm 3D Adventure',
          short_name: 'CrashWorm3D',
          description: 'Un juego de plataformas 3D multijugador épico',
          theme_color: '#1e293b',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'landscape-primary',
          scope: '/',
          start_url: '/',
          categories: ['games', 'entertainment'],
          screenshots: [
            {
              src: '/screenshots/gameplay1.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Gameplay principal'
            },
            {
              src: '/screenshots/mobile1.png',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Vista móvil'
            }
          ],
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        devOptions: {
          enabled: isDev,
          type: 'module'
        }
      }),

      // Bundle analyzer for build analysis
      isAnalyze && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),

    // ========================================
    // 📁 PATH RESOLUTION
    // ========================================
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
        '@types': resolve(__dirname, 'src/types'),
        '@assets': resolve(__dirname, 'src/assets'),
        '@public': resolve(__dirname, 'public')
      }
    },

    // ========================================
    // 🌍 ENVIRONMENT VARIABLES
    // ========================================
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
      __DEV__: isDev,
      __PROD__: isBuild
    },

    // ========================================
    // 📦 DEPENDENCY OPTIMIZATION
    // ========================================
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        '@react-three/rapier',
        'tone',
        'howler',
        'mathjs',
        'lodash',
        'uuid',
        'crypto-js'
      ],
      exclude: [
        // Exclude large dependencies that should be loaded on demand
      ]
    },

    // ========================================
    // 🖥️ DEVELOPMENT SERVER
    // ========================================
    server: {
      host: true, // Allow external connections
      port: 3000,
      strictPort: true,
      cors: true,
      proxy: {
        // Proxy API calls to backend server
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false
        },
        '/socket.io': {
          target: env.VITE_WS_URL || 'ws://localhost:8080',
          ws: true,
          changeOrigin: true
        }
      },
      fs: {
        // Allow serving files from one level up from project root
        allow: ['..']
      },
      hmr: {
        overlay: true
      }
    },

    // ========================================
    // 🔍 PREVIEW SERVER
    // ========================================
    preview: {
      host: true,
      port: 4173,
      strictPort: true,
      cors: true
    },

    // ========================================
    // 🏗️ BUILD CONFIGURATION
    // ========================================
    build: {
      target: 'esnext',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isDev || isAnalyze,
      minify: isBuild ? 'esbuild' : false,

      // Rollup options
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor libraries
            'vendor-react': ['react', 'react-dom'],
            'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
            'vendor-physics': ['@react-three/rapier'],
            'vendor-audio': ['tone', 'howler'],
            'vendor-utils': ['mathjs', 'lodash', 'uuid', 'crypto-js'],

            // Game core systems
            'game-core': [
              'src/core/GameEngine.js',
              'src/core/AdvancedSystems.js',
              'src/core/PerformanceAndEffects.js'
            ],

            // Game components
            'game-components': [
              'src/components/Player.jsx',
              'src/components/GameWorld.jsx',
              'src/components/GameUI.jsx'
            ],

            // Game entities
            'game-entities': [
              'src/components/Platforms.jsx',
              'src/components/Enemies.jsx',
              'src/components/Collectibles.jsx',
              'src/components/ParticleEffects.jsx'
            ]
          },

          // Asset naming
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop()
              : 'unknown';
            return `js/[name]-[hash].js`;
          },
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `images/[name]-[hash].${ext}`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `fonts/[name]-[hash].${ext}`;
            }
            if (/mp3|wav|ogg|m4a/i.test(ext)) {
              return `audio/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          }
        },

        // External dependencies (CDN)
        external: isBuild ? [] : []
      },

      // Asset handling
      assetsInlineLimit: 4096, // 4kb

      // CSS code splitting
      cssCodeSplit: true,

      // Reports
      reportCompressedSize: isBuild,

      // Chunk size warnings
      chunkSizeWarningLimit: 1000, // 1MB

      // Build performance
      watch: isDev ? {} : null
    },

    // ========================================
    // 🎨 CSS CONFIGURATION
    // ========================================
    css: {
      devSourcemap: isDev,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      },
      modules: {
        localsConvention: 'camelCaseOnly'
      },
      postcss: {
        plugins: [
          // PostCSS plugins would go here
        ]
      }
    },

    // ========================================
    // 📊 PERFORMANCE CONFIGURATION
    // ========================================
    esbuild: {
      target: 'esnext',
      drop: isBuild ? ['console', 'debugger'] : [],
      pure: isBuild ? ['console.log', 'console.warn'] : [],
      minifyIdentifiers: isBuild,
      minifySyntax: isBuild,
      minifyWhitespace: isBuild,
      treeShaking: isBuild
    },

    // ========================================
    // 🔍 WORKER CONFIGURATION
    // ========================================
    worker: {
      format: 'es',
      plugins: [
        // Worker-specific plugins
      ]
    },

    // ========================================
    // 🧪 TEST CONFIGURATION
    // ========================================
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test/setup.js'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.js'
        ]
      }
    },

    // ========================================
    // 🔧 ADVANCED OPTIONS
    // ========================================

    // Base public path
    base: env.VITE_BASE_URL || '/',

    // Mode
    mode,

    // Log level
    logLevel: isDev ? 'info' : 'warn',

    // Clear screen
    clearScreen: true,

    // App type
    appType: 'spa',

    // Experimental features
    experimental: {
      renderBuiltUrl: (filename, { hostType }) => {
        if (hostType === 'js') {
          return { js: `/${filename}` };
        } else {
          return { css: `/${filename}` };
        }
      }
    }
  };
});
