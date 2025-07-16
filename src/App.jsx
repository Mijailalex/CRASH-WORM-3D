// ========================================
// APP.JSX - APLICACIÓN PRINCIPAL
// ========================================

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Environment, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { GameProvider } from './context/GameContext';
import { GameWorld } from './components/GameWorld';
import { GameUI } from './components/GameUI';
import { AudioManager } from './components/AudioManager';
import { LoadingScreen } from './components/LoadingScreen';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';
import './styles/globals.css';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

function App() {
  const [gamePhase, setGamePhase] = useState('MENU'); // MENU, LOADING, PLAYING, PAUSED
  const [isLoading, setIsLoading] = useState(false);

  // Manejar eventos globales del juego
  const handleGameEvent = (event) => {
    console.log('Game Event:', event);
    
    switch (event.type) {
      case 'startGame':
        setGamePhase('LOADING');
        setIsLoading(true);
        break;
        
      case 'gameReady':
        setGamePhase('PLAYING');
        setIsLoading(false);
        break;
        
      case 'pauseGame':
        setGamePhase('PAUSED');
        break;
        
      case 'resumeGame':
        setGamePhase('PLAYING');
        break;
        
      case 'gameOver':
      case 'backToMenu':
        setGamePhase('MENU');
        break;
        
      default:
        break;
    }
  };

  // Manejar teclas globales
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {
        if (gamePhase === 'PLAYING') {
          handleGameEvent({ type: 'pauseGame' });
        } else if (gamePhase === 'PAUSED') {
          handleGameEvent({ type: 'resumeGame' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gamePhase]);

  return (
    <GameProvider>
      <div className="app">
        {/* Sistema de Audio Global */}
        <AudioManager />
        
        {/* Renderizado condicional según el estado del juego */}
        {gamePhase === 'MENU' && (
          <MainMenu onGameEvent={handleGameEvent} />
        )}
        
        {gamePhase === 'LOADING' && (
          <LoadingScreen onComplete={() => handleGameEvent({ type: 'gameReady' })} />
        )}
        
        {(gamePhase === 'PLAYING' || gamePhase === 'PAUSED') && (
          <>
            {/* Canvas 3D Principal */}
            <Canvas
              shadows
              camera={{ position: [0, 10, 20], fov: 75 }}
              dpr={[1, 2]}
              performance={{ min: 0.5 }}
              style={{ height: '100vh', background: 'linear-gradient(to bottom, #87CEEB, #98FB98)' }}
            >
              <Suspense fallback={null}>
                {/* Sistemas de optimización */}
                <AdaptiveDpr pixelated />
                <AdaptiveEvents />
                
                {/* Iluminación */}
                <ambientLight intensity={0.4} />
                <directionalLight
                  position={[50, 50, 25]}
                  intensity={1}
                  castShadow
                  shadow-mapSize={[2048, 2048]}
                  shadow-camera-near={1}
                  shadow-camera-far={200}
                  shadow-camera-left={-50}
                  shadow-camera-right={50}
                  shadow-camera-top={50}
                  shadow-camera-bottom={-50}
                />
                
                {/* Entorno y ambiente */}
                <Environment preset="sunset" />
                <fog attach="fog" args={['#87CEEB', 0, 300]} />
                
                {/* Sistema de Física */}
                <Physics gravity={[0, -9.81, 0]} debug={process.env.NODE_ENV === 'development'}>
                  <GameWorld onGameEvent={handleGameEvent} />
                </Physics>
                
                {/* Post-procesamiento */}
                <EffectComposer>
                  <Bloom intensity={0.5} luminanceThreshold={0.9} />
                  <Vignette offset={0.5} darkness={0.5} />
                </EffectComposer>
              </Suspense>
            </Canvas>
            
            {/* UI del Juego */}
            <GameUI />
            
            {/* Menú de Pausa */}
            {gamePhase === 'PAUSED' && (
              <PauseMenu onGameEvent={handleGameEvent} />
            )}
          </>
        )}
      </div>
    </GameProvider>
  );
}

export default App;