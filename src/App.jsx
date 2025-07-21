import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { GameProvider } from './context/GameContext';
import { GameWorld } from './components/GameWorld';
import { GameUI } from './components/GameUI';
import { LoadingScreen } from './components/LoadingScreen';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';

// ========================================
// APP PRINCIPAL
// Ubicación: src/App.jsx
// ========================================

function AppContent() {
  const { state, actions } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simular carga inicial
  useEffect(() => {
    const loadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // 3 segundos de carga

    return () => clearTimeout(loadTimer);
  }, []);

  // Controles globales
  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'Escape':
          if (state.gameState === 'playing') {
            actions.pauseGame();
          } else if (state.gameState === 'paused') {
            actions.resumeGame();
          }
          break;
        case 'F11':
          event.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.gameState, actions]);

  // Renderizado condicional basado en el estado
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (showSettings) {
    return <SettingsMenu onBack={() => setShowSettings(false)} />;
  }

  switch (state.gameState) {
    case 'menu':
      return (
        <MainMenu 
          onStartGame={() => actions.startGame()}
          onShowSettings={() => setShowSettings(true)}
          onShowCredits={() => console.log('Credits coming soon!')}
        />
      );

    case 'playing':
      return <GameWorld />;

    case 'paused':
      return (
        <>
          <GameWorld />
          <PauseMenu 
            onResume={() => actions.resumeGame()}
            onSettings={() => setShowSettings(true)}
            onMainMenu={() => actions.setGameState('menu')}
          />
        </>
      );

    case 'gameOver':
      return (
        <GameOverScreen
          score={state.score}
          level={state.level}
          onRestart={() => actions.resetGame()}
          onMainMenu={() => actions.setGameState('menu')}
        />
      );

    default:
      return <div>Unknown game state</div>;
  }
}

function App() {
  return (
    <GameProvider>
      <div className="app">
        <AppContent />
      </div>
    </GameProvider>
  );
}

export default App;