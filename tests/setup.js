// ============================================================================
// 🧪 CRASH WORM 3D - TEST SETUP CONFIGURATION
// ============================================================================
// Ubicación: tests/setup.js
// Configuración global para todos los tests del proyecto

import '@testing-library/jest-dom';
import { expect, afterEach, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { configure } from '@testing-library/react';

// ========================================
// 🔧 CONFIGURACIÓN DE TESTING LIBRARY
// ========================================

configure({
  // Tiempo de espera por defecto para queries
  asyncUtilTimeout: 5000,
  
  // Función para obtener mensaje de error más descriptivos
  getElementError: (message, container) => {
    const prettierMessage = [
      message,
      'Rendered DOM:',
      container.innerHTML
    ].filter(Boolean).join('\n\n');
    
    return new Error(prettierMessage);
  },
  
  // Configuración de data-testid
  testIdAttribute: 'data-testid'
});

// ========================================
// 🧹 CLEANUP DESPUÉS DE CADA TEST
// ========================================

afterEach(() => {
  // Limpiar DOM después de cada test
  cleanup();
  
  // Limpiar todos los mocks
  vi.clearAllMocks();
  
  // Limpiar timers
  vi.clearAllTimers();
  
  // Restaurar implementaciones originales
  vi.restoreAllMocks();
});

// ========================================
// 🌍 CONFIGURACIÓN DE ENTORNO GLOBAL
// ========================================

beforeAll(() => {
  // Configurar variables de entorno para tests
  process.env.NODE_ENV = 'test';
  process.env.VITE_API_URL = 'http://localhost:8080';
  process.env.VITE_WEBSOCKET_URL = 'ws://localhost:8081';
  process.env.VITE_ENABLE_ANALYTICS = 'false';
  process.env.VITE_LOG_LEVEL = 'silent';
});

beforeEach(() => {
  // Usar fake timers en cada test
  vi.useFakeTimers();
  
  // Restaurar fecha a un valor fijo para tests consistentes
  const mockDate = new Date('2024-01-01T00:00:00.000Z');
  vi.setSystemTime(mockDate);
});

afterEach(() => {
  // Restaurar timers reales
  vi.useRealTimers();
});

afterAll(() => {
  // Limpiar cualquier estado global al final
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ========================================
// 🌐 MOCKS DE APIS DEL NAVEGADOR
// ========================================

// Mock de matchMedia (no disponible en jsdom)
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

// Mock de ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock de IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// ========================================
// 🎮 MOCKS ESPECÍFICOS PARA GAME DEV
// ========================================

// Mock de WebGL Context
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return {
      // WebGL Mock básico
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 1920,
      drawingBufferHeight: 1080,
      viewport: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      createShader: vi.fn(() => ({})),
      createProgram: vi.fn(() => ({})),
      createBuffer: vi.fn(() => ({})),
      createTexture: vi.fn(() => ({})),
      bindBuffer: vi.fn(),
      bindTexture: vi.fn(),
      bufferData: vi.fn(),
      texImage2D: vi.fn(),
      useProgram: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
      getExtension: vi.fn((name) => {
        // Mock de extensiones WebGL comunes
        const extensions = {
          'WEBGL_lose_context': {
            loseContext: vi.fn(),
            restoreContext: vi.fn()
          },
          'OES_vertex_array_object': {
            createVertexArrayOES: vi.fn(() => ({})),
            bindVertexArrayOES: vi.fn(),
            deleteVertexArrayOES: vi.fn()
          }
        };
        return extensions[name] || null;
      }),
      getSupportedExtensions: vi.fn(() => [
        'WEBGL_lose_context',
        'OES_vertex_array_object',
        'WEBGL_debug_renderer_info'
      ])
    };
  }
  
  if (contextType === '2d') {
    return {
      // Canvas 2D Mock básico
      canvas: document.createElement('canvas'),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn()
    };
  }
  
  return null;
});

// Mock de requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock de performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => []),
    navigation: {
      type: 0
    },
    timing: {
      navigationStart: Date.now() - 1000,
      loadEventEnd: Date.now()
    }
  }
});

// ========================================
// 🔊 MOCKS DE AUDIO
// ========================================

// Mock de AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 }
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 }
  })),
  destination: {},
  state: 'running',
  resume: vi.fn(() => Promise.resolve()),
  suspend: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
  decodeAudioData: vi.fn(() => Promise.resolve({})),
  createBuffer: vi.fn(() => ({})),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null
  }))
}));

global.webkitAudioContext = global.AudioContext;

// Mock de HTMLAudioElement
global.HTMLAudioElement.prototype.play = vi.fn(() => Promise.resolve());
global.HTMLAudioElement.prototype.pause = vi.fn();
global.HTMLAudioElement.prototype.load = vi.fn();

// ========================================
// 🌐 MOCKS DE NETWORK
// ========================================

// Mock de fetch global
global.fetch = vi.fn();

// Mock de WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// ========================================
// 🎮 MOCKS DE GAMEPAD API
// ========================================

Object.defineProperty(navigator, 'getGamepads', {
  writable: true,
  value: vi.fn(() => [])
});

// Mock de Gamepad events
global.GamepadEvent = vi.fn().mockImplementation((type, eventInitDict) => ({
  type,
  gamepad: eventInitDict?.gamepad || null
}));

// ========================================
// 📱 MOCKS DE DEVICE APIS
// ========================================

// Mock de navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn(() => true)
});

// Mock de screen orientation
Object.defineProperty(screen, 'orientation', {
  writable: true,
  value: {
    angle: 0,
    type: 'landscape-primary',
    lock: vi.fn(() => Promise.resolve()),
    unlock: vi.fn()
  }
});

// Mock de devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1
});

// ========================================
// 🗄️ MOCKS DE STORAGE
// ========================================

// Mock mejorado de localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true
});

// ========================================
// 🔒 MOCKS DE CRYPTO
// ========================================

// Mock de crypto.randomUUID (para Node.js < 19)
if (!global.crypto) {
  global.crypto = {};
}

if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = vi.fn(() => 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })
  );
}

// ========================================
// 🎯 UTILIDADES DE TESTING PARA EL JUEGO
// ========================================

// Helper para simular user input de gamepad
export const mockGamepadInput = (buttonIndex, pressed = true) => {
  const mockGamepad = {
    index: 0,
    id: 'Mock Gamepad',
    buttons: Array(16).fill().map((_, i) => ({
      pressed: i === buttonIndex ? pressed : false,
      value: i === buttonIndex ? (pressed ? 1 : 0) : 0
    })),
    axes: [0, 0, 0, 0],
    connected: true,
    mapping: 'standard',
    timestamp: performance.now()
  };
  
  navigator.getGamepads.mockReturnValue([mockGamepad]);
  
  // Simular evento de gamepad
  const event = new GamepadEvent(pressed ? 'gamepadconnected' : 'gamepaddisconnected', {
    gamepad: mockGamepad
  });
  
  window.dispatchEvent(event);
  
  return mockGamepad;
};

// Helper para simular carga de assets
export const mockAssetLoader = () => {
  return {
    load: vi.fn((url) => Promise.resolve({
      url,
      data: new ArrayBuffer(1024),
      type: 'arraybuffer'
    })),
    loadImage: vi.fn((url) => Promise.resolve({
      url,
      width: 512,
      height: 512,
      complete: true
    })),
    loadAudio: vi.fn((url) => Promise.resolve({
      url,
      duration: 1.5,
      ready: true
    }))
  };
};

// Helper para simular contexto de juego
export const createMockGameContext = () => {
  return {
    player: {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      score: 0
    },
    scene: {
      add: vi.fn(),
      remove: vi.fn(),
      children: []
    },
    camera: {
      position: { x: 0, y: 5, z: 10 },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn()
    },
    renderer: {
      render: vi.fn(),
      setSize: vi.fn(),
      domElement: document.createElement('canvas')
    },
    gameState: 'playing',
    paused: false,
    loading: false
  };
};

// Helper para esperar a que el juego cargue
export const waitForGameLoad = async (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkLoad = () => {
      if (window.gameLoaded) {
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Game load timeout'));
      } else {
        setTimeout(checkLoad, 100);
      }
    };
    
    checkLoad();
  });
};

// ========================================
// 🚀 CONFIGURACIÓN FINAL
// ========================================

// Configurar mocks globales del juego
beforeEach(() => {
  // Reset game state
  window.gameLoaded = false;
  window.gameInstance = null;
  window.gameConfig = {
    debug: true,
    enablePhysics: true,
    enableAudio: false, // Deshabilitado en tests por defecto
    graphics: {
      quality: 'low',
      shadows: false,
      postprocessing: false
    }
  };
  
  // Mock console methods si están siendo muy verbosos
  if (process.env.VITEST_SILENT === 'true') {
    global.console = {
      ...console,
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: console.error // Mantener errores visibles
    };
  }
});

// Exportar utilities para usar en tests
export {
  mockGamepadInput,
  mockAssetLoader,
  createMockGameContext,
  waitForGameLoad
};