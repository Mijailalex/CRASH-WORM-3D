/* ============================================================================ */
/* 🎮 CRASH WORM 3D - PUNTO DE ENTRADA PRINCIPAL */
/* ============================================================================ */
/* Ubicación: src/main.jsx */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Import global styles
import './styles/globals.css';

// ========================================
// 🚀 CONFIGURACIÓN INICIAL DE LA APLICACIÓN
// ========================================

// Enable React strict mode in development
const enableStrictMode = import.meta.env.DEV;

// Game configuration
const gameMetadata = {
  name: 'Crash Worm 3D Adventure',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  buildDate: new Date().toISOString(),
  environment: import.meta.env.MODE
};

// ========================================
// 📱 CONFIGURACIÓN PWA
// ========================================

// Service Worker registration for PWA
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('🔧 Service Worker registered successfully:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, show update notification
              showUpdateNotification();
            }
          });
        }
      });

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }
};

const showUpdateNotification = () => {
  // Create update notification
  const updateBanner = document.createElement('div');
  updateBanner.className = 'update-notification';
  updateBanner.innerHTML = `
    <div class="update-content">
      <span>🔄 New version available!</span>
      <button id="update-btn" class="btn btn-primary btn-sm">Update</button>
      <button id="dismiss-btn" class="btn btn-secondary btn-sm">Later</button>
    </div>
  `;

  document.body.appendChild(updateBanner);

  // Handle update button
  document.getElementById('update-btn').addEventListener('click', () => {
    window.location.reload();
  });

  // Handle dismiss button
  document.getElementById('dismiss-btn').addEventListener('click', () => {
    updateBanner.remove();
  });
};

// ========================================
// 🔧 CONFIGURACIÓN DE PERFORMANCE
// ========================================

// Performance optimization for different devices
const setupPerformanceOptimizations = () => {
  // Detect device capabilities
  const isLowEndDevice = () => {
    return (
      navigator.hardwareConcurrency <= 2 ||
      navigator.deviceMemory <= 4 ||
      /Android.*Chrome\/[.0-9]*/.test(navigator.userAgent)
    );
  };

  // Apply device-specific optimizations
  if (isLowEndDevice()) {
    console.log('🔋 Low-end device detected, applying optimizations');

    // Set CSS variables for low-end devices
    document.documentElement.style.setProperty('--animation-duration', '0.2s');
    document.documentElement.style.setProperty('--particle-count', '50');
    document.documentElement.classList.add('low-end-device');
  }

  // Disable animations if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.log('♿ Reduced motion preference detected');
    document.documentElement.classList.add('reduced-motion');
  }
};

// ========================================
// 🛠️ UTILIDADES DE DESARROLLO
// ========================================

const setupDevelopmentTools = () => {
  if (import.meta.env.DEV) {
    // Development mode utilities
    window.gameMetadata = gameMetadata;

    // Global debug functions
    window.debugGame = {
      version: gameMetadata.version,
      clearStorage: () => {
        localStorage.clear();
        sessionStorage.clear();
        console.log('🗑️ Storage cleared');
      },
      exportSave: () => {
        const saveData = localStorage.getItem('crashWorm3D_saveGame');
        console.log('💾 Save data:', saveData);
        return saveData;
      },
      showPerformance: () => {
        document.documentElement.classList.toggle('show-performance');
      }
    };

    console.log(`🎮 ${gameMetadata.name} v${gameMetadata.version}`);
    console.log('🔧 Development mode active');
    console.log('🛠️ Debug tools available at window.debugGame');
  }
};

// ========================================
// 🔐 CONFIGURACIÓN DE SEGURIDAD
// ========================================

const setupSecurityMeasures = () => {
  // Prevent right-click context menu in production
  if (import.meta.env.PROD) {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Prevent F12 and other dev tools shortcuts
    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    });
  }

  // Console warning for users
  console.log(
    '%c🚨 Security Warning',
    'color: red; font-size: 20px; font-weight: bold;'
  );
  console.log(
    '%cDo not paste any code here unless you know what you are doing. This could compromise your game progress and account security.',
    'color: red; font-size: 14px;'
  );
};

// ========================================
// 📊 ANALYTICS Y MÉTRICAS
// ========================================

const setupAnalytics = () => {
  if (import.meta.env.PROD && gameMetadata.environment === 'production') {
    // Performance measurement
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log(`📊 Page load time: ${entry.loadEventEnd - entry.loadEventStart}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'measure'] });

    // Track critical metrics
    window.addEventListener('load', () => {
      // First Contentful Paint
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        console.log(`🎨 First Contentful Paint: ${fcpEntry.startTime}ms`);
      }

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`🖼️ Largest Contentful Paint: ${lastEntry.startTime}ms`);
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    });
  }
};

// ========================================
// 🔄 ERROR HANDLING GLOBAL
// ========================================

const setupGlobalErrorHandling = () => {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    console.error('🚨 Unhandled error:', event.error);

    // Send to analytics in production
    if (import.meta.env.PROD) {
      // Analytics error reporting would go here
    }
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);

    // Prevent default browser behavior
    event.preventDefault();

    // Send to analytics in production
    if (import.meta.env.PROD) {
      // Analytics error reporting would go here
    }
  });
};

// ========================================
// 🎯 INICIALIZACIÓN PRINCIPAL
// ========================================

const initializeApplication = async () => {
  try {
    console.log(`🚀 Initializing ${gameMetadata.name}...`);

    // Setup all systems
    setupPerformanceOptimizations();
    setupDevelopmentTools();
    setupSecurityMeasures();
    setupAnalytics();
    setupGlobalErrorHandling();

    // Register service worker
    await registerServiceWorker();

    console.log('✅ Application initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
  }
};

// ========================================
// 🎨 RENDER DE LA APLICACIÓN
// ========================================

const renderApp = () => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // Create React root
  const root = ReactDOM.createRoot(rootElement);

  // Render app with or without strict mode
  const AppComponent = enableStrictMode ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  );

  root.render(AppComponent);

  console.log('🎮 Game rendered successfully');
};

// ========================================
// 🚀 INICIO DE LA APLICACIÓN
// ========================================

const startApplication = async () => {
  try {
    // Initialize all systems
    await initializeApplication();

    // Render the React application
    renderApp();

    // Log success
    console.log(
      `%c🎮 ${gameMetadata.name} v${gameMetadata.version} started successfully!`,
      'color: green; font-size: 16px; font-weight: bold;'
    );

  } catch (error) {
    console.error('💥 Failed to start application:', error);

    // Show fallback error UI
    document.getElementById('root').innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <h1>🚨 Game Failed to Start</h1>
        <p>We're sorry, but something went wrong while loading the game.</p>
        <details style="margin: 20px 0; max-width: 600px;">
          <summary>Error Details</summary>
          <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; text-align: left; overflow: auto;">
${error.message}
          </pre>
        </details>
        <button
          onclick="window.location.reload()"
          style="
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          "
        >
          Reload Game
        </button>
        <p style="margin-top: 20px; opacity: 0.8; font-size: 14px;">
          If this problem persists, please clear your browser cache and try again.
        </p>
      </div>
    `;
  }
};

// ========================================
// 🏁 PUNTO DE ENTRADA
// ========================================

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApplication);
} else {
  startApplication();
}

// Export for potential external access
export { gameMetadata, startApplication };
