// ============================================================================
// 🧪 CRASH WORM 3D - VITEST CONFIGURATION
// ============================================================================
// Ubicación: vitest.config.js
// Configuración avanzada de testing para React + Three.js + Game Development

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  // ========================================
  // 🔌 PLUGINS
  // ========================================
  plugins: [
    react({
      // Configuración específica para testing
      jsxImportSource: 'react',
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          // Plugin para mock de módulos en tests
          'babel-plugin-transform-vite-meta-env'
        ]
      }
    })
  ],

  // ========================================
  // 📁 RESOLUCIÓN DE PATHS
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
      '@tests': resolve(__dirname, 'tests')
    }
  },

  // ========================================
  // 🧪 CONFIGURACIÓN DE VITEST
  // ========================================
  test: {
    // ========================================
    // 🌍 ENTORNO DE TESTING
    // ========================================
    environment: 'jsdom',
    globals: true,
    
    // Setup files
    setupFiles: [
      './tests/setup.js',
      './tests/mocks/index.js'
    ],
    
    // ========================================
    // 📁 ARCHIVOS DE TEST
    // ========================================
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'tests/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.vite',
      'coverage',
      'e2e',
      'playwright-tests',
      'src/**/*.stories.{js,jsx,ts,tsx}',
      'src/**/*.e2e.{js,jsx,ts,tsx}'
    ],

    // ========================================
    // ⏱️ TIMEOUTS Y PERFORMANCE
    // ========================================
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    // Configuración para tests de juego (pueden ser más lentos)
    slowTestThreshold: 5000,

    // ========================================
    // 📊 COVERAGE CONFIGURATION
    // ========================================
    coverage: {
      provider: 'v8',
      reporter: [
        'text',
        'text-summary',
        'html',
        'lcov',
        'json-summary'
      ],
      
      // Directorios y archivos a incluir en coverage
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.stories.{js,jsx,ts,tsx}',
        '!src/**/*.test.{js,jsx,ts,tsx}',
        '!src/**/*.spec.{js,jsx,ts,tsx}'
      ],
      
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
        'dist/',
        'build/',
        'public/',
        'src/main.jsx',
        'src/App.jsx',
        'src/**/*.d.ts',
        'src/assets/',
        'src/styles/',
        'vite.config.js',
        'vitest.config.js'
      ],
      
      // Thresholds de coverage
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 80,
          statements: 80
        },
        // Thresholds específicos para core del juego
        'src/core/': {
          branches: 80,
          functions: 85,
          lines: 90,
          statements: 90
        },
        // Thresholds más relajados para componentes UI
        'src/components/': {
          branches: 60,
          functions: 70,
          lines: 75,
          statements: 75
        }
      },
      
      // Reportes detallados
      reportsDirectory: './coverage',
      skipFull: false,
      all: true
    },

    // ========================================
    // 🎯 MOCKING CONFIGURATION
    // ========================================
    
    // Auto-mock de módulos externos
    deps: {
      external: [
        // Mantener estas librerías como externas (no bundlear)
        'three',
        'cannon-es',
        'tone'
      ]
    },

    // ========================================
    // 📱 CONFIGURACIÓN ESPECÍFICA POR ENTORNO
    // ========================================
    
    // Variables de entorno para tests
    env: {
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:8080',
      VITE_WEBSOCKET_URL: 'ws://localhost:8081',
      VITE_ENABLE_ANALYTICS: 'false',
      VITE_LOG_LEVEL: 'silent'
    },

    // ========================================
    // 🔧 CONFIGURACIÓN AVANZADA
    // ========================================
    
    // Pool de workers para paralelización
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    
    // Configuración de reporters
    reporter: [
      'verbose',
      'vitest-sonar-reporter',
      'junit',
      'json'
    ],
    
    outputFile: {
      'vitest-sonar-reporter': './coverage/sonar-report.xml',
      'junit': './coverage/junit.xml',
      'json': './coverage/test-results.json'
    },
    
    // ========================================
    // 🎮 CONFIGURACIÓN ESPECÍFICA PARA GAME DEV
    // ========================================
    
    // Configuración para tests de Three.js
    transformMode: {
      web: [/\.[jt]sx?$/],
      ssr: []
    },
    
    // Manejo de assets estáticos
    assetsInclude: [
      '**/*.glb',
      '**/*.gltf',
      '**/*.wav',
      '**/*.mp3',
      '**/*.png',
      '**/*.jpg'
    ],

    // ========================================
    // 🔍 WATCH MODE CONFIGURATION
    // ========================================
    
    watch: true,
    watchExclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**'
    ],
    
    // Configuración de cache
    cache: {
      dir: './node_modules/.vitest'
    },

    // ========================================
    // 🚨 ERROR HANDLING
    // ========================================
    
    // Configuración de retry para tests flaky
    retry: 2,
    
    // Bail en el primer error (útil para CI)
    bail: process.env.CI ? 1 : 0,
    
    // Configuración de logging
    logHeapUsage: true,
    
    // ========================================
    // 🔗 INTEGRACIÓN CON HERRAMIENTAS
    // ========================================
    
    // Configuración para UI de Vitest
    ui: true,
    uiBase: '/vitest/',
    
    // Configuración para debugging
    inspect: false,
    inspectBrk: false,
    
    // ========================================
    // 📊 BENCHMARK CONFIGURATION
    // ========================================
    
    benchmark: {
      include: [
        'src/**/*.{bench,benchmark}.{js,jsx,ts,tsx}',
        'tests/benchmarks/**/*.{js,jsx,ts,tsx}'
      ],
      exclude: [
        'node_modules',
        'dist',
        'coverage'
      ],
      reporters: ['verbose']
    }
  },

  // ========================================
  // 🔧 CONFIGURACIÓN DE BUILD PARA TESTS
  // ========================================
  
  esbuild: {
    target: 'node14'
  },
  
  define: {
    // Variables globales para tests
    __TEST__: true,
    __DEV__: true,
    __PROD__: false,
    
    // Feature flags para testing
    __ENABLE_MULTIPLAYER__: false,
    __ENABLE_ANALYTICS__: false,
    __ENABLE_PWA__: false,
    
    // URLs de testing
    __API_URL__: '"http://localhost:8080"',
    __WEBSOCKET_URL__: '"ws://localhost:8081"'
  },

  // ========================================
  // 📦 OPTIMIZACIÓN DE DEPENDENCIAS
  // ========================================
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event'
    ],
    exclude: [
      'three',
      'cannon-es'
    ]
  }
});

// ========================================
// 💡 CONFIGURACIÓN ADICIONAL
// ========================================

/*
SCRIPTS RECOMENDADOS PARA PACKAGE.JSON:

{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:coverage:ui": "vitest --ui --coverage",
    "test:unit": "vitest run src",
    "test:integration": "vitest run tests/integration",
    "test:benchmark": "vitest bench",
    "test:typecheck": "vitest typecheck",
    "test:ci": "vitest run --coverage --reporter=verbose --reporter=junit --outputFile=coverage/junit.xml"
  }
}

ARCHIVOS DE SETUP RECOMENDADOS:

1. tests/setup.js:
```javascript
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Mock de APIs del navegador no disponibles en jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de WebGL para Three.js
HTMLCanvasElement.prototype.getContext = vi.fn();
```

2. tests/mocks/index.js:
```javascript
import { vi } from 'vitest';

// Mock de Three.js
vi.mock('three', () => ({
  WebGLRenderer: vi.fn(),
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  BoxGeometry: vi.fn(),
  MeshBasicMaterial: vi.fn(),
  Mesh: vi.fn()
}));

// Mock de audio APIs
vi.mock('tone', () => ({
  Player: vi.fn(),
  start: vi.fn()
}));

// Mock de WebSocket
global.WebSocket = vi.fn();
```

CONFIGURACIÓN DE VS CODE:

.vscode/settings.json:
```json
{
  "vitest.enable": true,
  "vitest.commandLine": "npm run test",
  "testing.automaticallyOpenPeekView": "never"
}
```

CONFIGURACIÓN DE CI/CD:

GitHub Actions:
```yaml
- name: Run Tests
  run: |
    npm run test:ci
    npm run test:typecheck
  env:
    NODE_ENV: test
```
*/