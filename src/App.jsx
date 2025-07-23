/* ============================================================================ */
/* 🎮 CRASH WORM 3D - APLICACIÓN PRINCIPAL */
/* ============================================================================ */

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { ErrorBoundary } from 'react-error-boundary';
import { useGame, GAME_STATES } from './context/GameContext.jsx';
import useGameEngine from './hooks/useGameEngine.js';
import useAudioManager from './hooks/useAudioManager.js';
import useNetworkSync from './hooks/useNetworkSync.js';

// Importaciones lazy para optimización
const LoadingScreen = React.lazy(() => import('./components/LoadingScreen.jsx'));
const MainMenu = React.lazy(() => import('./components/MainMenu.jsx'));
const GameWorld = React.lazy(() => import('./components/GameWorld.jsx'));
const GameUI = React.lazy(() => import('./components/GameUI.jsx'));
const PauseMenu = React.lazy(() => import('./components/PauseMenu.jsx'));

// ========================================
// 🎮 COMPONENTE PRINCIPAL DE LA APLICACIÓN
// ========================================

function App() {
  const { state, actions, utils } = useGame();
  const {
    engine,
    isInitialized: isEngineReady,
    startEngine,
    stopEngine,
    pauseEngine,
    resumeEngine,
    performance
  } = useGameEngine();

  const {
    isInitialized: isAudioReady,
    playSound,
    setMasterVolume
  } = useAudioManager();

  const {
    isConnected: isNetworkConnected,
    latency
  } = useNetworkSync();

  // Estados de la aplicación
  const [isAppReady, setIsAppReady] = useState(false);
  const [error, setError] = useState(null);
  const [performanceMode, setPerformanceMode] = useState('auto');
  const [debugMode, setDebugMode] = useState(import.meta.env.DEV);

  // Referencias
  const canvasRef = useRef();
  const frameCountRef = useRef(0);
  const lastPerformanceCheck = useRef(Date.now());

  // ========================================
  // 🚀 INICIALIZACIÓN DE LA APLICACIÓN
  // ========================================

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🎮 Initializing Crash Worm 3D...');

        // Esperar a que todos los sistemas estén listos
        await waitForSystems();

        // Configurar la aplicación
        setupApplicationSystems();

        // Configurar manejo de errores globales
        setupErrorHandling();

        // Configurar optimizaciones de rendimiento
        setupPerformanceOptimizations();

        setIsAppReady(true);
        console.log('✅ Application initialized successfully');

      } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        setError(error);
      }
    };

    initializeApp();
  }, []);

  const waitForSystems = async () => {
    return new Promise((resolve) => {
      const checkSystems = () => {
        if (isEngineReady && isAudioReady) {
          resolve();
        } else {
          setTimeout(checkSystems, 100);
        }
      };
      checkSystems();
    });
  };

  const setupApplicationSystems = () => {
    // Configurar volumen inicial
    setMasterVolume(state.masterVolume);

    // Configurar modo de rendimiento automático
    detectAndSetPerformanceMode();

    // Configurar listeners de visibilidad
    setupVisibilityHandling();

    // Configurar auto-guardado
    setupAutoSave();
  };

  const setupErrorHandling = () => {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  };

  const setupPerformanceOptimizations = () => {
    // Configurar observador de rendimiento
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            // Monitorear métricas de rendimiento
            if (entry.duration > 16.67) { // Mayor a 60 FPS
              console.warn(`Performance warning: ${entry.name} took ${entry.duration}ms`);
            }
          }
        });
      });
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
  };

  // ========================================
  // 🎯 MANEJO DE EVENTOS GLOBALES
  // ========================================

  const handleKeyDown = useCallback((event) => {
    // Prevenir comportamientos por defecto para ciertas teclas
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }

    switch (event.code) {
      case 'Escape':
        if (utils.isPlaying) {
          pauseEngine();
          actions.pauseGame();
          playSound('click');
        } else if (utils.isPaused) {
          resumeEngine();
          actions.resumeGame();
          playSound('click');
        }
        break;

      case 'F11':
        event.preventDefault();
        toggleFullscreen();
        break;

      case 'KeyM':
        if (event.ctrlKey) {
          event.preventDefault();
          actions.toggleSound();
          playSound('click');
        }
        break;

      case 'F1':
        if (debugMode) {
          event.preventDefault();
          toggleDebugMode();
        }
        break;
    }
  }, [utils.isPlaying, utils.isPaused, actions, pauseEngine, resumeEngine, playSound, debugMode]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      if (utils.isPlaying) {
        pauseEngine();
        actions.pauseGame();
      }
    }
  }, [utils.isPlaying, actions, pauseEngine]);

  const handleBeforeUnload = useCallback((event) => {
    if (utils.isPlaying && state.saveData.autoSave) {
      actions.saveProgress();
    }

    // Limpiar recursos
    stopEngine();
  }, [utils.isPlaying, state.saveData.autoSave, actions, stopEngine]);

  const handleGlobalError = useCallback((event) => {
    console.error('🚨 Global error:', event.error);
    setError(event.error);
  }, []);

  const handleUnhandledRejection = useCallback((event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    setError(new Error(`Unhandled rejection: ${event.reason}`));
  }, []);

  // ========================================
  // ⚙️ CONFIGURACIONES Y UTILIDADES
  // ========================================

  const detectAndSetPerformanceMode = useCallback(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      setPerformanceMode('low');
      return;
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

    // Detectar GPU y ajustar calidad
    if (renderer.includes('Intel') && !renderer.includes('Iris')) {
      setPerformanceMode('low');
    } else if (renderer.includes('GTX') || renderer.includes('RTX') || renderer.includes('RX')) {
      setPerformanceMode('high');
    } else {
      setPerformanceMode('medium');
    }

    console.log(`🎨 Performance mode set to: ${performanceMode}`);
  }, [performanceMode]);

  const setupVisibilityHandling = useCallback(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  const setupAutoSave = useCallback(() => {
    if (state.saveData.autoSave) {
      setInterval(() => {
        if (utils.isPlaying) {
          actions.saveProgress();
        }
      }, 30000); // Auto-save cada 30 segundos
    }
  }, [state.saveData.autoSave, utils.isPlaying, actions]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Error exiting fullscreen:', err);
      });
    }
  }, []);

  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
    playSound('click');
  }, [playSound]);

  // ========================================
  // 🔄 CONFIGURACIÓN DE EVENT LISTENERS
  // ========================================

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleKeyDown, handleBeforeUnload, handleGlobalError, handleUnhandledRejection, handleVisibilityChange]);

  // ========================================
  // 📊 MONITOREO DE RENDIMIENTO
  // ========================================

  useEffect(() => {
    const monitorPerformance = () => {
      frameCountRef.current++;

      const now = Date.now();
      if (now - lastPerformanceCheck.current > 5000) { // Cada 5 segundos
        const fps = (frameCountRef.current * 1000) / (now - lastPerformanceCheck.current);

        // Ajustar calidad automáticamente si es necesario
        if (performanceMode === 'auto') {
          if (fps < 30 && performanceMode !== 'low') {
            setPerformanceMode('low');
            console.log('🔽 Performance mode lowered due to low FPS');
          } else if (fps > 55 && performanceMode !== 'high') {
            setPerformanceMode('high');
            console.log('🔼 Performance mode raised due to good FPS');
          }
        }

        frameCountRef.current = 0;
        lastPerformanceCheck.current = now;
      }
    };

    const interval = setInterval(monitorPerformance, 100);
    return () => clearInterval(interval);
  }, [performanceMode]);

  // ========================================
  // 🎨 CONFIGURACIÓN DEL CANVAS
  // ========================================

  const getCanvasConfig = useCallback(() => {
    const baseConfig = {
      camera: {
        position: [0, 5, 10],
        fov: 75,
        near: 0.1,
        far: 1000
      },
      shadows: performanceMode !== 'low',
      gl: {
        antialias: performanceMode === 'high',
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true
      },
      performance: {
        min: performanceMode === 'low' ? 0.2 : 0.5
      },
      dpr: performanceMode === 'low' ? 1 : Math.min(window.devicePixelRatio, 2)
    };

    return baseConfig;
  }, [performanceMode]);

  // ========================================
  // 🚨 COMPONENTE DE ERROR
  // ========================================

  if (error) {
    return <ErrorFallback error={error} onReset={() => setError(null)} />;
  }

  // ========================================
  // 🔄 PANTALLA DE CARGA
  // ========================================

  if (!isAppReady || utils.isLoading) {
    return (
      <Suspense fallback={<SimpleFallback message="Loading application..." />}>
        <LoadingScreen />
      </Suspense>
    );
  }

  // ========================================
  // 🏠 MENÚ PRINCIPAL
  // ========================================

  if (utils.isInMenu) {
    return (
      <div className="app">
        <Suspense fallback={<SimpleFallback message="Loading menu..." />}>
          <MainMenu />
        </Suspense>

        {/* Información de debug */}
        {debugMode && <DebugOverlay performance={performance} network={{ isConnected: isNetworkConnected, latency }} />}
      </div>
    );
  }

  // ========================================
  // 🎮 JUEGO ACTIVO
  // ========================================

  return (
    <div className="app">
      <ErrorBoundary FallbackComponent={GameErrorFallback}>
        {/* Canvas 3D principal */}
        <Canvas
          ref={canvasRef}
          {...getCanvasConfig()}
          onCreated={({ gl, scene, camera }) => {
            // Configuraciones del renderer
            gl.setClearColor('#000011');
            gl.shadowMap.enabled = performanceMode !== 'low';
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;

            // Configurar cámara
            camera.position.set(...getCanvasConfig().camera.position);

            console.log('🎨 Canvas 3D initialized with', performanceMode, 'quality');
          }}
          onError={(error) => {
            console.error('Canvas error:', error);
            setError(error);
          }}
        >
          <Suspense fallback={<GameWorldFallback />}>
            <Physics
              gravity={[0, -9.81, 0]}
              debug={debugMode}
              timeStep={1/60}
              paused={utils.isPaused}
            >
              <GameWorld />
            </Physics>
          </Suspense>
        </Canvas>

        {/* UI del juego */}
        {(utils.isPlaying || utils.isPaused) && (
          <Suspense fallback={null}>
            <GameUI />
          </Suspense>
        )}

        {/* Menú de pausa */}
        {utils.isPaused && (
          <Suspense fallback={null}>
            <PauseMenu />
          </Suspense>
        )}

        {/* Overlays de estado del juego */}
        <GameStateOverlays />

        {/* Información de debug */}
        {debugMode && (
          <DebugOverlay
            performance={performance}
            network={{ isConnected: isNetworkConnected, latency }}
            canvas={canvasRef.current}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}

// ========================================
// 🎮 OVERLAYS DE ESTADO DEL JUEGO
// ========================================

function GameStateOverlays() {
  const { state, actions, utils } = useGame();

  return (
    <>
      {/* Overlay de game over */}
      {utils.isGameOver && (
        <div className="overlay fade-in">
          <div className="modal card">
            <h2 className="menu-title">💀 Game Over</h2>
            <div className="game-over-stats">
              <p>Score: {state.score.toLocaleString()}</p>
              <p>Level: {state.level}</p>
              <p>Time: {Math.floor(state.timeElapsed / 60)}:{Math.floor(state.timeElapsed % 60).toString().padStart(2, '0')}</p>
              <p>Best Score: {state.bestScore.toLocaleString()}</p>
            </div>
            <div className="menu-buttons">
              <button
                className="button button-primary"
                onClick={actions.resetGame}
              >
                🔄 Try Again
              </button>
              <button
                className="button"
                onClick={actions.goToMenu}
              >
                🏠 Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de victoria */}
      {utils.isVictory && (
        <div className="overlay fade-in">
          <div className="modal card">
            <h2 className="menu-title">🏆 Victory!</h2>
            <div className="victory-stats">
              <p>Final Score: {state.score.toLocaleString()}</p>
              <p>Level Completed: {state.level}</p>
              <p>Total Time: {Math.floor(state.timeElapsed / 60)}:{Math.floor(state.timeElapsed % 60).toString().padStart(2, '0')}</p>
              <p>Collectibles: {state.collectibles}/{state.totalCollectibles}</p>
              <p>Performance Bonus: {Math.max(0, 1000 - Math.floor(state.timeElapsed))} points</p>
            </div>
            <div className="menu-buttons">
              <button
                className="button button-primary"
                onClick={() => {
                  actions.updateLevel(state.level + 1);
                  actions.resetGame();
                }}
              >
                ➡️ Next Level
              </button>
              <button
                className="button"
                onClick={actions.goToMenu}
              >
                🏠 Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ========================================
// 🐛 OVERLAY DE DEBUG
// ========================================

function DebugOverlay({ performance, network, canvas }) {
  return (
    <div className="debug-overlay">
      <div className="debug-panel">
        <h3>🐛 Debug Info</h3>

        <div className="debug-section">
          <h4>Performance</h4>
          <p>FPS: {Math.round(performance.fps || 0)}</p>
          <p>Frame Time: {(performance.avgFrameTime || 0).toFixed(2)}ms</p>
          <p>Entities: {performance.entityCount || 0}</p>
        </div>

        <div className="debug-section">
          <h4>Network</h4>
          <p>Connected: {network.isConnected ? '✅' : '❌'}</p>
          <p>Latency: {network.latency || 0}ms</p>
        </div>

        <div className="debug-section">
          <h4>Memory</h4>
          <p>Used: {Math.round((performance.memory?.used || 0) / 1024 / 1024)}MB</p>
          <p>Total: {Math.round((performance.memory?.total || 0) / 1024 / 1024)}MB</p>
        </div>

        <div className="debug-controls">
          <p>F1: Toggle Debug | F11: Fullscreen</p>
          <p>Ctrl+M: Mute | ESC: Pause</p>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 🚨 COMPONENTES DE ERROR
// ========================================

function ErrorFallback({ error, onReset }) {
  return (
    <div className="error-screen">
      <div className="error-content">
        <h1>⚠️ Something went wrong</h1>
        <p>An unexpected error occurred in Crash Worm 3D</p>
        <details className="error-details">
          <summary>Error Details</summary>
          <pre>{error.stack}</pre>
        </details>
        <div className="error-actions">
          <button onClick={onReset} className="button button-primary">
            🔄 Try Again
          </button>
          <button onClick={() => window.location.reload()} className="button">
            🔄 Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

function GameErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="game-error">
      <div className="error-message">
        <h2>🎮 Game Error</h2>
        <p>The game encountered an error and needs to restart.</p>
        <button onClick={resetErrorBoundary} className="button button-primary">
          🔄 Restart Game
        </button>
      </div>
    </div>
  );
}

// ========================================
// ⏳ COMPONENTES FALLBACK
// ========================================

function SimpleFallback({ message }) {
  return (
    <div className="simple-fallback">
      <div className="loading-spinner" />
      <p>{message}</p>
    </div>
  );
}

function GameWorldFallback() {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshBasicMaterial color="#4488ff" wireframe />
    </mesh>
  );
}

export default App;
