/* ============================================================================ */
/* 🎮 CRASH WORM 3D - COMPONENTE PRINCIPAL DE LA APLICACIÓN */
/* ============================================================================ */
/* Ubicación: src/App.jsx */

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Context Provider
import { GameProvider, useGameContext } from './context/GameContext';

// Core Components
import GameWorld from './components/GameWorld';
import GameUI from './components/GameUI';
import MainMenu from './components/MainMenu';
import LoadingScreen from './components/LoadingScreen';

// Hooks
import { useAudioManager } from './hooks/useAudioManager';
import { useNetworkSync } from './hooks/useNetworkSync';

// Utils
import { DeviceUtils, StorageUtils, DebugUtils } from './utils/gameUtils';
import { gameConfig } from './data/gameConfig';

// Styles
import './styles/globals.css';

// ========================================
// 🎮 COMPONENTE PRINCIPAL DE LA APP
// ========================================

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  // Initialize application
  useEffect(() => {
    initializeApplication();
  }, []);

  const initializeApplication = async () => {
    try {
      setLoadingMessage('Setting up environment...');
      setLoadingProgress(10);

      // Detect device capabilities
      const deviceConfig = DeviceUtils.getDeviceConfig();
      DebugUtils.log('Device configuration:', deviceConfig);

      setLoadingMessage('Loading game assets...');
      setLoadingProgress(30);

      // Preload critical assets
      await preloadAssets();

      setLoadingMessage('Initializing audio system...');
      setLoadingProgress(50);

      // Initialize subsystems
      await initializeSubsystems();

      setLoadingMessage('Setting up game engine...');
      setLoadingProgress(70);

      // Setup error handling
      setupErrorHandling();

      setLoadingMessage('Applying settings...');
      setLoadingProgress(85);

      // Apply saved settings
      await applySavedSettings();

      setLoadingMessage('Ready to play!');
      setLoadingProgress(100);

      // Small delay for smooth transition
      setTimeout(() => {
        setIsInitialized(true);
      }, 500);

    } catch (error) {
      DebugUtils.error('Failed to initialize application:', error);
      setInitializationError(error);
    }
  };

  const preloadAssets = async () => {
    // Simulate asset loading - in a real game, this would load textures, models, sounds, etc.
    const assets = [
      'textures/grass.jpg',
      'textures/stone.jpg',
      'audio/jump.wav',
      'audio/collect.wav',
      'models/player.glb'
    ];

    for (let i = 0; i < assets.length; i++) {
      // Simulate loading each asset
      await new Promise(resolve => setTimeout(resolve, 100));
      setLoadingProgress(30 + (i / assets.length) * 20);
    }
  };

  const initializeSubsystems = async () => {
    // Initialize WebGL context check
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    // Check for required extensions
    const requiredExtensions = ['OES_element_index_uint'];
    for (const ext of requiredExtensions) {
      if (!gl.getExtension(ext)) {
        DebugUtils.warn(`Extension ${ext} not available`);
      }
    }

    // Performance adaptation
    const renderer = {
      antialias: gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 4096,
      shadows: !DeviceUtils.isMobile(),
      particles: !DeviceUtils.isMobile() || gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 2048
    };

    DebugUtils.log('Renderer capabilities:', renderer);
  };

  const setupErrorHandling = () => {
    // Global error handler
    window.addEventListener('error', (event) => {
      DebugUtils.error('Global error:', event.error);

      // Report to analytics if enabled
      if (gameConfig.analytics.enabled) {
        // Analytics reporting would go here
      }
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      DebugUtils.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });
  };

  const applySavedSettings = async () => {
    // Load saved settings from localStorage
    const savedSettings = StorageUtils.getItem('crashWorm3D_settings');

    if (savedSettings) {
      DebugUtils.log('Applying saved settings:', savedSettings);
      // Settings will be applied by the GameProvider
    }

    // Apply device-specific optimizations
    if (DeviceUtils.isMobile()) {
      // Mobile optimizations
      document.body.style.userSelect = 'none';
      document.body.style.touchAction = 'none';
    }
  };

  // Error boundary fallback
  const ErrorFallback = ({ error, resetErrorBoundary }) => (
    <div className="error-screen">
      <div className="error-content">
        <h2>🚨 Game Error</h2>
        <p>Something went wrong. Don't worry, your progress is saved!</p>
        <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
          <summary>Error details</summary>
          {error.message}
        </details>
        <div className="error-actions">
          <button className="btn btn-primary" onClick={resetErrorBoundary}>
            Try Again
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            Reload Game
          </button>
        </div>
      </div>
    </div>
  );

  // Show error screen if initialization failed
  if (initializationError) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h2>🚨 Initialization Error</h2>
          <p>Failed to start the game. Please try refreshing the page.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
            <summary>Error details</summary>
            {initializationError.message}
          </details>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading screen during initialization
  if (!isInitialized) {
    return (
      <LoadingScreen
        progress={loadingProgress}
        message={loadingMessage}
        onComplete={() => setIsInitialized(true)}
      />
    );
  }

  // Main application
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={DebugUtils.error}>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </ErrorBoundary>
  );
}

// ========================================
// 📱 CONTENIDO PRINCIPAL DE LA APP
// ========================================

function AppContent() {
  const {
    gameState,
    setGameState,
    showNotification,
    settings,
    toggleUI
  } = useGameContext();

  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const [gameLoadProgress, setGameLoadProgress] = useState(0);

  // Audio manager
  const { isInitialized: audioInitialized, playSound } = useAudioManager();

  // Network sync
  const { connectionState } = useNetworkSync();

  // ========================================
  // 🎮 GAME STATE MANAGEMENT
  // ========================================

  const handleGameStateChange = useCallback(async (newState) => {
    const previousState = gameState;

    DebugUtils.log(`Game state change: ${previousState} -> ${newState}`);

    switch (newState) {
      case 'LOADING':
        await handleLoadingState();
        break;
      case 'PLAYING':
        await handlePlayingState();
        break;
      case 'PAUSED':
        handlePausedState();
        break;
      case 'GAME_OVER':
        handleGameOverState();
        break;
      case 'MAIN_MENU':
        handleMainMenuState();
        break;
    }

    setGameState(newState);
  }, [gameState, setGameState]);

  const handleLoadingState = async () => {
    setIsLoadingGame(true);
    setGameLoadProgress(0);

    try {
      // Simulate game loading process
      const loadingSteps = [
        { message: 'Generating world...', duration: 800 },
        { message: 'Spawning entities...', duration: 600 },
        { message: 'Loading audio...', duration: 400 },
        { message: 'Initializing physics...', duration: 500 },
        { message: 'Setting up networking...', duration: 300 },
        { message: 'Finalizing...', duration: 200 }
      ];

      for (let i = 0; i < loadingSteps.length; i++) {
        const step = loadingSteps[i];
        setGameLoadProgress((i / loadingSteps.length) * 100);

        await new Promise(resolve => setTimeout(resolve, step.duration));
      }

      setGameLoadProgress(100);

      // Transition to playing state
      setTimeout(() => {
        setIsLoadingGame(false);
        setGameState('PLAYING');
      }, 500);

    } catch (error) {
      DebugUtils.error('Failed to load game:', error);
      showNotification({
        message: 'Failed to load game. Please try again.',
        type: 'error',
        icon: '❌'
      });
      setGameState('MAIN_MENU');
      setIsLoadingGame(false);
    }
  };

  const handlePlayingState = async () => {
    playSound('game_start', { volume: 0.5 });

    showNotification({
      message: 'Game started! Good luck!',
      type: 'success',
      icon: '🎮',
      duration: 2000
    });

    // Auto-save setup
    if (settings.gameplay.autoSave) {
      setupAutoSave();
    }
  };

  const handlePausedState = () => {
    playSound('game_pause', { volume: 0.3 });
    toggleUI('showPauseMenu', true);
  };

  const handleGameOverState = () => {
    playSound('game_over', { volume: 0.6 });

    showNotification({
      message: 'Game Over! Thanks for playing!',
      type: 'info',
      icon: '🎯',
      duration: 3000
    });

    // Save final score
    saveGameStats();
  };

  const handleMainMenuState = () => {
    // Clean up game state
    setIsLoadingGame(false);
    setGameLoadProgress(0);
  };

  // ========================================
  // 💾 SAVE SYSTEM
  // ========================================

  const setupAutoSave = () => {
    const autoSaveInterval = setInterval(() => {
      if (gameState === 'PLAYING') {
        saveGameState();
      } else {
        clearInterval(autoSaveInterval);
      }
    }, 30000); // Auto-save every 30 seconds
  };

  const saveGameState = () => {
    try {
      const gameData = {
        timestamp: Date.now(),
        // Game state data would go here
        // player position, score, level, etc.
      };

      StorageUtils.setItem('crashWorm3D_saveGame', gameData);
      DebugUtils.log('Game auto-saved');

    } catch (error) {
      DebugUtils.error('Failed to auto-save game:', error);
    }
  };

  const saveGameStats = () => {
    try {
      const stats = StorageUtils.getItem('crashWorm3D_stats', {
        gamesPlayed: 0,
        totalScore: 0,
        bestScore: 0,
        totalPlayTime: 0
      });

      // Update stats
      stats.gamesPlayed += 1;
      // Add current game stats...

      StorageUtils.setItem('crashWorm3D_stats', stats);
      DebugUtils.log('Game stats saved');

    } catch (error) {
      DebugUtils.error('Failed to save game stats:', error);
    }
  };

  // ========================================
  // ⌨️ KEYBOARD SHORTCUTS
  // ========================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Global keyboard shortcuts
      switch (event.key) {
        case 'Escape':
          if (gameState === 'PLAYING') {
            handleGameStateChange('PAUSED');
          } else if (gameState === 'PAUSED') {
            handleGameStateChange('PLAYING');
          }
          break;

        case 'F11':
          event.preventDefault();
          if (DeviceUtils.isFullscreen()) {
            DeviceUtils.exitFullscreen();
          } else {
            DeviceUtils.requestFullscreen();
          }
          break;

        case 'F1':
          event.preventDefault();
          toggleUI('showSettings', true);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleGameStateChange, toggleUI]);

  // ========================================
  // 📱 VISIBILITY CHANGE HANDLING
  // ========================================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'PLAYING') {
        // Auto-pause when tab becomes hidden
        handleGameStateChange('PAUSED');

        showNotification({
          message: 'Game paused - tab not visible',
          type: 'info',
          icon: '⏸️',
          duration: 1000
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameState, handleGameStateChange, showNotification]);

  // ========================================
  // 🌐 NETWORK STATUS MONITORING
  // ========================================

  useEffect(() => {
    if (connectionState === 'connected') {
      showNotification({
        message: 'Connected to multiplayer server',
        type: 'success',
        icon: '🌐',
        duration: 2000
      });
    } else if (connectionState === 'error') {
      showNotification({
        message: 'Connection lost. Playing offline.',
        type: 'warning',
        icon: '📡',
        duration: 3000
      });
    }
  }, [connectionState, showNotification]);

  // ========================================
  // 🎨 RENDER MAIN CONTENT
  // ========================================

  const renderGameContent = () => {
    switch (gameState) {
      case 'MAIN_MENU':
        return <MainMenu />;

      case 'LOADING':
        return (
          <LoadingScreen
            progress={gameLoadProgress}
            message="Loading game world..."
            onComplete={() => {}} // Handled by handleLoadingState
          />
        );

      case 'PLAYING':
      case 'PAUSED':
      case 'GAME_OVER':
        return (
          <>
            <Suspense fallback={<div>Loading game world...</div>}>
              <GameWorld />
            </Suspense>
            <GameUI />
          </>
        );

      default:
        return <MainMenu />;
    }
  };

  return (
    <div className={`app game-state-${gameState.toLowerCase()}`}>
      {/* Main Game Content */}
      {renderGameContent()}

      {/* Loading overlay for game state transitions */}
      {isLoadingGame && (
        <div className="game-loading-overlay">
          <LoadingScreen
            progress={gameLoadProgress}
            message="Loading game..."
            onComplete={() => {}}
          />
        </div>
      )}

      {/* Global Audio Status */}
      {!audioInitialized && (
        <div className="audio-prompt">
          <button
            className="btn btn-primary"
            onClick={() => {
              // Audio initialization is handled by useAudioManager
              showNotification({
                message: 'Audio enabled!',
                type: 'success',
                icon: '🔊',
                duration: 1000
              });
            }}
          >
            🔊 Enable Audio
          </button>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Performance Warning */}
      <PerformanceWarning />
    </div>
  );
}

// ========================================
// 📱 COMPONENTE DE INSTALACIÓN PWA
// ========================================

function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      DebugUtils.log('PWA installation accepted');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-prompt-content">
        <span>📱 Install Crash Worm 3D for better performance!</span>
        <button className="btn btn-sm btn-primary" onClick={handleInstallClick}>
          Install
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setShowInstallPrompt(false)}
        >
          Later
        </button>
      </div>
    </div>
  );
}

// ========================================
// ⚠️ ADVERTENCIA DE PERFORMANCE
// ========================================

function PerformanceWarning() {
  const { performance } = useGameContext();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (performance.fps && performance.fps < 20) {
      setShowWarning(true);

      const timer = setTimeout(() => {
        setShowWarning(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [performance.fps]);

  if (!showWarning) return null;

  return (
    <div className="performance-warning">
      <div className="warning-content">
        ⚠️ Low performance detected. Consider lowering graphics settings.
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => setShowWarning(false)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default App;
