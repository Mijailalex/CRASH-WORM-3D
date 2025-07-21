// ============================================================================
// 🎭 CRASH WORM 3D - PLAYWRIGHT CONFIGURATION
// ============================================================================
// Ubicación: playwright.config.js
// Configuración completa de Playwright para testing E2E del juego

import { defineConfig, devices } from '@playwright/test';

// ========================================
// 🌍 CONFIGURACIÓN DE ENTORNOS
// ========================================

const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  // ========================================
  // 📁 ARCHIVOS DE TEST
  // ========================================
  
  testDir: './tests/e2e',
  testMatch: /.*\.e2e\.(js|ts|jsx|tsx)$/,
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],

  // ========================================
  // ⚙️ CONFIGURACIÓN GENERAL
  // ========================================
  
  // Timeout global para tests
  timeout: 60000,
  
  // Timeout para expect assertions
  expect: {
    timeout: 10000,
    // Configuración para screenshots en assertions
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'strict'
    },
    toMatchSnapshot: {
      threshold: 0.2
    }
  },
  
  // Configuración de paralelización
  fullyParallel: !isCI, // En CI usar secuencial para estabilidad
  forbidOnly: isCI, // Fallar en CI si hay test.only
  retries: isCI ? 2 : 0, // Retry en CI
  workers: isCI ? 1 : 2, // Workers según entorno
  
  // ========================================
  // 📊 REPORTES
  // ========================================
  
  reporter: [
    // Reporter por defecto con colores
    ['list'],
    
    // HTML report para análisis detallado
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    
    // JUnit para CI/CD
    ['junit', { 
      outputFile: 'test-results/e2e-results.xml' 
    }],
    
    // JSON para procesamiento
    ['json', { 
      outputFile: 'test-results/e2e-results.json' 
    }],
    
    // Allure (si está instalado)
    ...(process.env.ALLURE_RESULTS_DIR ? [['allure-playwright']] : [])
  ],

  // ========================================
  // 📁 CONFIGURACIÓN DE SALIDA
  // ========================================
  
  // Directorio para artifacts de test
  outputDir: 'test-results/',
  
  // Configuración de screenshots y videos
  use: {
    // URL base para tests
    baseURL,
    
    // Configuración de viewport
    viewport: { width: 1280, height: 720 },
    
    // Screenshots en failures
    screenshot: 'only-on-failure',
    
    // Videos solo en primera retry
    video: 'retain-on-failure',
    
    // Traces para debugging
    trace: 'retain-on-failure',
    
    // Headers por defecto
    extraHTTPHeaders: {
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    },
    
    // Configuración de navegador
    ignoreHTTPSErrors: true,
    
    // Configuración de tiempo
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Configuración específica para juego
    launchOptions: {
      // Habilitar WebGL y audio
      args: [
        '--enable-webgl',
        '--enable-web-audio',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=TranslateUI',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    }
  },

  // ========================================
  // 🖥️ CONFIGURACIÓN DE NAVEGADORES Y DISPOSITIVOS
  // ========================================
  
  projects: [
    // ========================================
    // 🖥️ DESKTOP BROWSERS
    // ========================================
    
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: /.*\.(e2e|spec)\.(js|ts)$/
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: /.*\.(e2e|spec)\.(js|ts)$/
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
      testMatch: /.*\.(e2e|spec)\.(js|ts)$/
    },

    // ========================================
    // 📱 MOBILE DEVICES
    // ========================================
    
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Configuración específica para juego móvil
        hasTouch: true,
        isMobile: true
      },
      testMatch: /.*\.mobile\.(e2e|spec)\.(js|ts)$/
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true
      },
      testMatch: /.*\.mobile\.(e2e|spec)\.(js|ts)$/
    },

    // ========================================
    // 💻 CONFIGURACIONES ESPECÍFICAS
    // ========================================
    
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        viewport: { width: 2560, height: 1440 }
      },
      testMatch: /.*\.visual\.(e2e|spec)\.(js|ts)$/
    },
    
    {
      name: 'low-end-device',
      use: {
        ...devices['Galaxy S5'],
        // Simular dispositivo de gama baja
        launchOptions: {
          args: [
            '--memory-pressure-off',
            '--max_old_space_size=512'
          ]
        }
      },
      testMatch: /.*\.performance\.(e2e|spec)\.(js|ts)$/
    },

    // ========================================
    // 🎮 CONFIGURACIONES PARA GAMING
    // ========================================
    
    {
      name: 'gamepad-testing',
      use: {
        ...devices['Desktop Chrome'],
        // Configuración para testing de gamepad
        permissions: ['gamepad'],
        launchOptions: {
          args: [
            '--enable-gamepad',
            '--enable-gamepad-extensions'
          ]
        }
      },
      testMatch: /.*\.gamepad\.(e2e|spec)\.(js|ts)$/
    },
    
    {
      name: 'webgl-testing',
      use: {
        ...devices['Desktop Chrome'],
        // Configuración optimizada para WebGL
        launchOptions: {
          args: [
            '--enable-webgl',
            '--enable-webgl2-compute-context',
            '--enable-webgl-draft-extensions',
            '--force-webgl'
          ]
        }
      },
      testMatch: /.*\.webgl\.(e2e|spec)\.(js|ts)$/
    }
  ],

  // ========================================
  // 🌐 CONFIGURACIÓN DE SERVIDOR WEB
  // ========================================
  
  webServer: [
    {
      // Servidor principal del juego
      command: 'npm run preview',
      port: 4173,
      reuseExistingServer: !isCI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        VITE_API_URL: 'http://localhost:8080',
        VITE_WEBSOCKET_URL: 'ws://localhost:8081'
      }
    },
    {
      // Servidor de API (si existe)
      command: 'cd server && npm run start:test',
      port: 8080,
      reuseExistingServer: !isCI,
      timeout: 60000,
      env: {
        NODE_ENV: 'test',
        PORT: '8080'
      }
    }
  ],

  // ========================================
  // 🔧 CONFIGURACIÓN GLOBAL
  // ========================================
  
  globalSetup: './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js',
  
  // ========================================
  // 📊 CONFIGURACIÓN DE MÉTRICAS
  // ========================================
  
  metadata: {
    'game-version': '1.0.0',
    'test-environment': process.env.NODE_ENV || 'test',
    'ci': isCI ? 'true' : 'false',
    'os': process.platform,
    'node-version': process.version
  }
});

// ========================================
// 💡 CONFIGURACIÓN ADICIONAL PARA GAME TESTING
// ========================================

/*
ESTRUCTURA DE TESTS RECOMENDADA:

tests/e2e/
├── game/
│   ├── gameplay.e2e.js          # Tests de mecánicas básicas
│   ├── multiplayer.e2e.js       # Tests de multijugador
│   ├── performance.e2e.js       # Tests de performance
│   └── audio-visual.e2e.js      # Tests de audio/gráficos
├── ui/
│   ├── navigation.e2e.js        # Tests de navegación
│   ├── menus.e2e.js            # Tests de menús
│   └── settings.e2e.js         # Tests de configuración
├── mobile/
│   ├── touch-controls.mobile.e2e.js  # Controles táctiles
│   └── responsive.mobile.e2e.js      # Diseño responsive
├── accessibility/
│   ├── keyboard-navigation.e2e.js    # Navegación por teclado
│   └── screen-reader.e2e.js          # Compatibilidad screen reader
└── visual/
    ├── screenshots.visual.e2e.js     # Tests de regresión visual
    └── animations.visual.e2e.js      # Tests de animaciones

EJEMPLO DE TEST DE JUEGO:

```javascript
// tests/e2e/game/gameplay.e2e.js
import { test, expect } from '@playwright/test';

test.describe('Crash Worm 3D - Gameplay Básico', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Esperar que el juego cargue completamente
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => window.gameLoaded === true);
  });

  test('Debe iniciar el juego correctamente', async ({ page }) => {
    // Verificar elementos de UI
    await expect(page.locator('.game-ui')).toBeVisible();
    await expect(page.locator('.player-stats')).toBeVisible();
    
    // Verificar que el canvas WebGL está funcionando
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Verificar contexto WebGL
    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    });
    expect(hasWebGL).toBe(true);
  });

  test('Controles del jugador funcionan', async ({ page }) => {
    // Test de movimiento con teclado
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(100);
    
    // Verificar que el jugador se movió
    const playerMoved = await page.evaluate(() => {
      return window.game?.player?.hasMoved || false;
    });
    expect(playerMoved).toBe(true);
  });

  test('Audio funciona correctamente', async ({ page }) => {
    // Verificar que el contexto de audio está activo
    const audioContext = await page.evaluate(() => {
      return window.AudioContext || window.webkitAudioContext;
    });
    expect(audioContext).toBeDefined();
    
    // Test de reproducción de sonido
    await page.click('.play-sound-button');
    
    const audioPlaying = await page.evaluate(() => {
      return window.audioManager?.isPlaying() || false;
    });
    expect(audioPlaying).toBe(true);
  });
});
```

CONFIGURACIÓN DE PERFORMANCE TESTING:

```javascript
// tests/e2e/game/performance.e2e.js
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('FPS se mantiene estable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Monitorear FPS por 10 segundos
    const fpsData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const fps = [];
        let lastTime = performance.now();
        let frameCount = 0;
        
        function measureFPS() {
          const currentTime = performance.now();
          frameCount++;
          
          if (currentTime - lastTime >= 1000) {
            fps.push(frameCount);
            frameCount = 0;
            lastTime = currentTime;
            
            if (fps.length >= 10) {
              resolve(fps);
              return;
            }
          }
          requestAnimationFrame(measureFPS);
        }
        
        requestAnimationFrame(measureFPS);
      });
    });
    
    // Verificar que FPS promedio es >= 30
    const avgFPS = fpsData.reduce((a, b) => a + b, 0) / fpsData.length;
    expect(avgFPS).toBeGreaterThanOrEqual(30);
  });
});
```

SCRIPTS PARA PACKAGE.JSON:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:chrome": "playwright test --project=chromium-desktop",
    "test:e2e:mobile": "playwright test --project=mobile-chrome",
    "test:e2e:visual": "playwright test --project=high-dpi",
    "test:e2e:report": "playwright show-report",
    "test:e2e:install": "playwright install"
  }
}
```
*/