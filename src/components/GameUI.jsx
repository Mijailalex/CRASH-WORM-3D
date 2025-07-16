import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useGame, useGameActions } from '../context/GameContext';

// Styled Components para la UI
const UIContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
  font-family: 'Orbitron', 'Arial', sans-serif;
`;

const HUDPanel = styled(motion.div)`
  position: absolute;
  background: linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(40,40,60,0.9) 100%);
  border: 2px solid ${props => props.borderColor || '#00FFFF'};
  border-radius: 15px;
  padding: 15px 20px;
  color: #FFFFFF;
  font-weight: bold;
  text-shadow: 0 0 10px ${props => props.borderColor || '#00FFFF'};
  backdrop-filter: blur(10px);
  box-shadow: 
    0 0 20px rgba(0,255,255,0.3),
    inset 0 1px 0 rgba(255,255,255,0.2);
  pointer-events: auto;
`;

const ProgressBar = styled.div`
  width: ${props => props.width || '120px'};
  height: 12px;
  background: rgba(0,0,0,0.6);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(0,255,255,0.5);
  margin-top: 8px;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  border-radius: 5px;
  background: ${props => props.gradient || 'linear-gradient(90deg, #00FFFF, #40E0D0)'};
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.3), 0 0 10px currentColor;
  transition: width 0.3s ease;
`;

const NotificationContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
`;

const Notification = styled(motion.div)`
  background: ${props => {
    switch(props.type) {
      case 'gem': return 'linear-gradient(135deg, #FFD700, #FFA500)';
      case 'enemy': return 'linear-gradient(135deg, #FF6347, #FF4500)';
      case 'achievement': return 'linear-gradient(135deg, #9932CC, #8A2BE2)';
      case 'level': return 'linear-gradient(135deg, #00FF00, #32CD32)';
      default: return 'linear-gradient(135deg, #00BFFF, #1E90FF)';
    }
  }};
  color: white;
  padding: 12px 20px;
  border-radius: 25px;
  font-weight: bold;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  border: 2px solid rgba(255,255,255,0.3);
`;

const PauseMenu = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, rgba(10,14,39,0.95) 0%, rgba(26,26,62,0.95) 50%, rgba(45,74,122,0.95) 100%);
  border: 3px solid #00FFFF;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  backdrop-filter: blur(20px);
  box-shadow: 0 0 50px rgba(0,255,255,0.5);
  pointer-events: auto;
`;

const MenuButton = styled(motion.button)`
  background: linear-gradient(45deg, #FF6B35, #FF8C42, #FFD700);
  border: none;
  border-radius: 25px;
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  padding: 15px 30px;
  margin: 10px;
  cursor: pointer;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  }
`;

const Minimap = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 150px;
  height: 150px;
  background: rgba(0,0,0,0.8);
  border: 2px solid #00FFFF;
  border-radius: 10px;
  overflow: hidden;
`;

const MinimapPlayer = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  background: #FF69B4;
  border-radius: 50%;
  box-shadow: 0 0 10px #FF69B4;
  transition: all 0.1s ease;
`;

const ControlsHint = styled(motion.div)`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 15px;
  border-radius: 10px;
  font-size: 14px;
  border: 1px solid rgba(255,255,255,0.3);
`;

const ScoreMultiplier = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 0 0 20px #FFD700;
  pointer-events: none;
`;

function GameUI({ gameStats, gameState, onPause, onReturnToMenu, difficultyConfig }) {
  const { state, actions } = useGame();
  const [showControls, setShowControls] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [scoreMultiplier, setScoreMultiplier] = useState(null);

  // Formatear tiempo de juego
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Manejar notificaciones
  useEffect(() => {
    if (state.ui.notifications.length > 0) {
      const latestNotification = state.ui.notifications[state.ui.notifications.length - 1];
      setNotifications(prev => [...prev, latestNotification]);
      
      // Auto-remove notification
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== latestNotification.id));
        actions.removeNotification(latestNotification.id);
      }, latestNotification.duration || 3000);
    }
  }, [state.ui.notifications, actions]);

  // Ocultar controles después de un tiempo
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);

  // Mostrar multiplicador de puntuación
  const showScoreMultiplier = (multiplier) => {
    setScoreMultiplier(`x${multiplier}!`);
    setTimeout(() => setScoreMultiplier(null), 2000);
  };

  return (
    <UIContainer>
      {/* HUD Principal */}
      {gameState === 'playing' && (
        <>
          {/* Panel de estadísticas del jugador */}
          <HUDPanel
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ top: '20px', left: '20px' }}
            borderColor="#00FFFF"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span>🌟</span>
              <span>Nivel {gameStats.level}</span>
            </div>
            <ProgressBar width="140px">
              <ProgressFill
                style={{ width: `${(gameStats.experience / gameStats.experienceToNext) * 100}%` }}
                gradient="linear-gradient(90deg, #00FFFF, #40E0D0)"
              />
            </ProgressBar>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              EXP: {gameStats.experience}/{gameStats.experienceToNext}
            </div>
          </HUDPanel>

          {/* Panel de salud */}
          <HUDPanel
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ top: '140px', left: '20px' }}
            borderColor="#FF4444"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span>❤️</span>
              <span>Vida {gameStats.health}/{gameStats.maxHealth}</span>
            </div>
            <ProgressBar width="140px">
              <ProgressFill
                style={{ width: `${(gameStats.health / gameStats.maxHealth) * 100}%` }}
                gradient="linear-gradient(90deg, #FF4444, #FF6666)"
              />
            </ProgressBar>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              💖 Vidas: {gameStats.lives}
            </div>
          </HUDPanel>

          {/* Panel de objetivos */}
          <HUDPanel
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ top: '260px', left: '20px' }}
            borderColor="#FFD700"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🎯 Enemigos:</span>
                <span>{gameStats.enemiesKilled}/{gameStats.enemiesTarget}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>💎 Gemas:</span>
                <span>{gameStats.gems}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>⏱️ Tiempo:</span>
                <span>{formatTime(gameStats.playTime)}</span>
              </div>
            </div>
          </HUDPanel>

          {/* Panel de puntuación */}
          <HUDPanel
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ top: '20px', right: '20px' }}
            borderColor="#9932CC"
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '5px' }}>
                🏆 {gameStats.score.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                Récord: {gameStats.highScore.toLocaleString()}
              </div>
            </div>
          </HUDPanel>

          {/* Botón de pausa */}
          <MenuButton
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onPause}
            style={{
              position: 'absolute',
              top: '20px',
              right: '200px',
              padding: '10px 20px',
              fontSize: '16px'
            }}
          >
            ⏸️ Pausa
          </MenuButton>

          {/* Minimapa */}
          <Minimap>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: 'linear-gradient(45deg, #001122, #003344)',
              position: 'relative'
            }}>
              <MinimapPlayer 
                style={{
                  left: `${70 + (state.player.position[0] / 100) * 50}px`,
                  top: `${75 - (state.player.position[2] / 200) * 100}px`
                }}
              />
              {/* Puntos de interés en el minimapa */}
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                color: '#FFD700',
                fontSize: '10px'
              }}>
                📍 Objetivo
              </div>
            </div>
          </Minimap>

          {/* Hints de controles */}
          <AnimatePresence>
            {showControls && (
              <ControlsHint
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -200, opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Controles:</div>
                <div>🎮 WASD / Flechas: Mover</div>
                <div>⚡ Espacio: Saltar</div>
                <div>🏃 Shift: Dash</div>
                <div>⏸️ ESC: Pausa</div>
                <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
                  Presiona cualquier tecla para ocultar
                </div>
              </ControlsHint>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Menú de pausa */}
      <AnimatePresence>
        {gameState === 'paused' && (
          <PauseMenu
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 style={{ 
              fontSize: '2.5rem',
              marginBottom: '30px',
              background: 'linear-gradient(45deg, #00FFFF, #40E0D0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Juego Pausado
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <MenuButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPause}
              >
                ▶️ Continuar
              </MenuButton>
              
              <MenuButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onReturnToMenu}
                style={{
                  background: 'linear-gradient(45deg, #FF6347, #FF4500)'
                }}
              >
                🏠 Menú Principal
              </MenuButton>
            </div>

            <div style={{ marginTop: '30px', fontSize: '14px', opacity: 0.8 }}>
              <p>Estadísticas actuales:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left' }}>
                <div>Puntuación: {gameStats.score.toLocaleString()}</div>
                <div>Tiempo: {formatTime(gameStats.playTime)}</div>
                <div>Enemigos: {gameStats.enemiesKilled}/{gameStats.enemiesTarget}</div>
                <div>Gemas: {gameStats.gems}</div>
              </div>
            </div>
          </PauseMenu>
        )}
      </AnimatePresence>

      {/* Notificaciones */}
      <NotificationContainer>
        <AnimatePresence>
          {notifications.map((notification) => (
            <Notification
              key={notification.id}
              type={notification.type}
              initial={{ x: 300, opacity: 0, scale: 0.8 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 300, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              {notification.message}
            </Notification>
          ))}
        </AnimatePresence>
      </NotificationContainer>

      {/* Multiplicador de puntuación */}
      <AnimatePresence>
        {scoreMultiplier && (
          <ScoreMultiplier
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {scoreMultiplier}
          </ScoreMultiplier>
        )}
      </AnimatePresence>

      {/* Indicador de dificultad */}
      <HUDPanel
        style={{ 
          bottom: '160px', 
          right: '20px',
          background: `linear-gradient(135deg, ${difficultyConfig.color}40, ${difficultyConfig.color}80)`
        }}
        borderColor={difficultyConfig.color}
      >
        <div style={{ textAlign: 'center', fontSize: '14px' }}>
          <div style={{ fontWeight: 'bold' }}>{difficultyConfig.name}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Dificultad Activa
          </div>
        </div>
      </HUDPanel>

      {/* FPS Counter (modo debug) */}
      {state.settings.graphics.quality === 'debug' && (
        <HUDPanel
          style={{ bottom: '20px', left: '200px' }}
          borderColor="#FF00FF"
        >
          <div style={{ fontSize: '12px' }}>
            FPS: 60 | Objetos: {state.world.platforms.length + state.world.enemies.length}
          </div>
        </HUDPanel>
      )}
    </UIContainer>
  );
}

export default GameUI;