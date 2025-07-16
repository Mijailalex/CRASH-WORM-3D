import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Text3D, Center } from '@react-three/drei';
import GameWorld from './components/GameWorld';
import GameUI from './components/GameUI';
import MainMenu from './components/MainMenu';
import LoadingScreen from './components/LoadingScreen';
import AudioManager from './components/AudioManager';
import { GameProvider } from './context/GameContext';
import './styles/globals.css';

// Styled Components para layout principal
const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #2d4a7a 100%);
  position: relative;
  font-family: 'Orbitron', 'Arial', sans-serif;
`;

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const GameTitle = styled(motion.h1)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 4rem;
  font-weight: bold;
  background: linear-gradient(45deg, #FF6B35, #FF8C42, #FFD700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  z-index: 100;
  text-align: center;
  text-shadow: 0 0 30px rgba(255, 107, 53, 0.8);
`;

// Estados del juego
const GAME_STATES = {
  MENU: 'menu',
  LOADING: 'loading',
  STORY: 'story',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  VICTORY: 'victory'
};

// Configuración de dificultades mejorada
const DIFFICULTY_CONFIG = {
  easy: {
    name: "Explorador Cósmico",
    playerLives: 5,
    enemySpeed: 0.8,
    platformSpeed: 0.5,
    gravityStrength: 0.6,
    enemiesToKill: 8,
    expPerKill: 25,
    color: '#4CAF50'
  },
  normal: {
    name: "Guerrero Galáctico",
    playerLives: 3,
    enemySpeed: 1.2,
    platformSpeed: 1.0,
    gravityStrength: 0.8,
    enemiesToKill: 12,
    expPerKill: 40,
    color: '#FF9800'
  },
  hard: {
    name: "Maestro del Cosmos",
    playerLives: 2,
    enemySpeed: 1.6,
    platformSpeed: 1.5,
    gravityStrength: 1.0,
    enemiesToKill: 15,
    expPerKill: 60,
    color: '#F44336'
  },
  extreme: {
    name: "Leyenda Infinita",
    playerLives: 1,
    enemySpeed: 2.0,
    platformSpeed: 2.0,
    gravityStrength: 1.2,
    enemiesToKill: 20,
    expPerKill: 100,
    color: '#9C27B0'
  }
};

function App() {
  const [gameState, setGameState] = useState(GAME_STATES.MENU);
  const [difficulty, setDifficulty] = useState('normal');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [gameStats, setGameStats] = useState({
    level: 1,
    experience: 0,
    experienceToNext: 100,
    health: 100,
    maxHealth: 100,
    lives: 3,
    gems: 0,
    enemiesKilled: 0,
    enemiesTarget: 12,
    score: 0,
    playTime: 0,
    highScore: parseInt(localStorage.getItem('crashWormHighScore') || '0')
  });

  // Inicializar juego
  const startGame = async (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setGameState(GAME_STATES.LOADING);
    setIsLoading(true);
    
    // Simular carga con progreso realista
    const loadingSteps = [
      { message: 'Iniciando motor 3D...', progress: 20 },
      { message: 'Generando física del mundo...', progress: 40 },
      { message: 'Cargando texturas y modelos...', progress: 60 },
      { message: 'Configurando audio espacial...', progress: 80 },
      { message: 'Preparando experiencia épica...', progress: 100 }
    ];

    for (const step of loadingSteps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoadingProgress(step.progress);
    }

    // Configurar stats según dificultad
    const diffConfig = DIFFICULTY_CONFIG[selectedDifficulty];
    setGameStats(prev => ({
      ...prev,
      lives: diffConfig.playerLives,
      enemiesTarget: diffConfig.enemiesToKill,
      health: 100,
      maxHealth: 100,
      gems: 0,
      enemiesKilled: 0,
      score: 0,
      playTime: 0
    }));

    setIsLoading(false);
    setGameState(GAME_STATES.PLAYING);
  };

  // Pausar/Reanudar juego
  const togglePause = () => {
    if (gameState === GAME_STATES.PLAYING) {
      setGameState(GAME_STATES.PAUSED);
    } else if (gameState === GAME_STATES.PAUSED) {
      setGameState(GAME_STATES.PLAYING);
    }
  };

  // Volver al menú
  const returnToMenu = () => {
    setGameState(GAME_STATES.MENU);
    // Guardar high score
    if (gameStats.score > gameStats.highScore) {
      localStorage.setItem('crashWormHighScore', gameStats.score.toString());
      setGameStats(prev => ({ ...prev, highScore: gameStats.score }));
    }
  };

  // Game Over
  const handleGameOver = () => {
    setGameState(GAME_STATES.GAME_OVER);
  };

  // Victoria
  const handleVictory = () => {
    setGameState(GAME_STATES.VICTORY);
  };

  // Actualizar stats
  const updateGameStats = (newStats) => {
    setGameStats(prev => ({ ...prev, ...newStats }));
  };

  // Controles de teclado globales
  useEffect(() => {
    const handleKeyPress = (event) => {
      switch (event.code) {
        case 'Escape':
          if (gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSED) {
            togglePause();
          }
          break;
        case 'KeyM':
          setAudioEnabled(prev => !prev);
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

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  // Contador de tiempo de juego
  useEffect(() => {
    let interval;
    if (gameState === GAME_STATES.PLAYING) {
      interval = setInterval(() => {
        setGameStats(prev => ({ ...prev, playTime: prev.playTime + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  return (
    <GameProvider value={{ 
      gameState, 
      setGameState, 
      difficulty, 
      gameStats, 
      updateGameStats,
      difficultyConfig: DIFFICULTY_CONFIG[difficulty],
      audioEnabled
    }}>
      <AppContainer>
        <AudioManager enabled={audioEnabled} gameState={gameState} />
        
        <AnimatePresence mode="wait">
          {gameState === GAME_STATES.MENU && (
            <MainMenu 
              key="menu"
              onStartGame={startGame}
              onToggleAudio={() => setAudioEnabled(prev => !prev)}
              audioEnabled={audioEnabled}
              highScore={gameStats.highScore}
              difficulties={DIFFICULTY_CONFIG}
            />
          )}

          {gameState === GAME_STATES.LOADING && (
            <LoadingScreen 
              key="loading"
              progress={loadingProgress}
              difficulty={difficulty}
              difficultyConfig={DIFFICULTY_CONFIG[difficulty]}
            />
          )}

          {(gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSED) && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%', height: '100%' }}
            >
              <CanvasContainer>
                <Canvas
                  shadows
                  camera={{ 
                    position: [0, 10, 15], 
                    fov: 60,
                    near: 0.1,
                    far: 1000
                  }}
                  gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: "high-performance"
                  }}
                >
                  <Suspense fallback={
                    <Center>
                      <Text3D font="/fonts/helvetiker_regular.typeface.json" size={2}>
                        Loading...
                      </Text3D>
                    </Center>
                  }>
                    <Environment preset="sunset" />
                    <ambientLight intensity={0.4} />
                    <directionalLight 
                      position={[10, 10, 5]} 
                      intensity={1}
                      castShadow
                      shadow-mapSize-width={2048}
                      shadow-mapSize-height={2048}
                    />
                    
                    <GameWorld 
                      isPaused={gameState === GAME_STATES.PAUSED}
                      onGameOver={handleGameOver}
                      onVictory={handleVictory}
                      onStatsUpdate={updateGameStats}
                    />
                    
                    {/* Controles de cámara solo en pausa */}
                    {gameState === GAME_STATES.PAUSED && (
                      <OrbitControls enablePan={false} enableZoom={false} />
                    )}
                  </Suspense>
                </Canvas>

                <GameUI 
                  gameStats={gameStats}
                  gameState={gameState}
                  onPause={togglePause}
                  onReturnToMenu={returnToMenu}
                  difficultyConfig={DIFFICULTY_CONFIG[difficulty]}
                />
              </CanvasContainer>
            </motion.div>
          )}

          {gameState === GAME_STATES.GAME_OVER && (
            <motion.div
              key="gameOver"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              <GameTitle
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                style={{ color: '#FF4444', marginBottom: '2rem' }}
              >
                Game Over
              </GameTitle>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ textAlign: 'center', color: 'white', fontSize: '1.5rem' }}
              >
                <p>Puntuación Final: {gameStats.score.toLocaleString()}</p>
                <p>Tiempo de Juego: {Math.floor(gameStats.playTime / 60)}:{(gameStats.playTime % 60).toString().padStart(2, '0')}</p>
                {gameStats.score > gameStats.highScore && (
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ color: '#FFD700', fontSize: '2rem' }}
                  >
                    ¡NUEVO RÉCORD!
                  </motion.p>
                )}
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={returnToMenu}
                style={{
                  marginTop: '2rem',
                  padding: '15px 40px',
                  fontSize: '1.5rem',
                  background: 'linear-gradient(45deg, #FF6B35, #FF8C42)',
                  border: 'none',
                  borderRadius: '30px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Volver al Menú
              </motion.button>
            </motion.div>
          )}

          {gameState === GAME_STATES.VICTORY && (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,50,0,0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              <GameTitle
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                style={{ color: '#00FF00', marginBottom: '2rem' }}
              >
                ¡Victoria!
              </GameTitle>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ textAlign: 'center', color: 'white', fontSize: '1.5rem' }}
              >
                <p>¡Has completado el nivel!</p>
                <p>Puntuación Final: {gameStats.score.toLocaleString()}</p>
                <p>Bonus de Tiempo: {Math.max(0, 300 - gameStats.playTime) * 10}</p>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={returnToMenu}
                style={{
                  marginTop: '2rem',
                  padding: '15px 40px',
                  fontSize: '1.5rem',
                  background: 'linear-gradient(45deg, #4CAF50, #66BB6A)',
                  border: 'none',
                  borderRadius: '30px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Continuar
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </AppContainer>
    </GameProvider>
  );
}

export default App;