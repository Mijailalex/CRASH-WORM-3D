/* ============================================================================ */
/* 🎮 CRASH WORM 3D - INTERFAZ DE USUARIO DEL JUEGO */
/* ============================================================================ */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { gameConfig } from '@/data/gameConfig';
import { TimeUtils, GameUtils } from '@/utils/gameUtils';
import useAudioManager from '@/hooks/useAudioManager';

// ========================================
// 🎮 COMPONENTE PRINCIPAL DE UI
// ========================================

export function GameUI() {
  const { state, actions, utils } = useGame();
  const { playSound } = useAudioManager();

  const [showMinimap, setShowMinimap] = useState(true);
  const [showPerformance, setShowPerformance] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [combos, setCombos] = useState([]);

  const notificationIdRef = useRef(0);
  const comboTimeoutRef = useRef(null);

  // ========================================
  // 📊 SISTEMA DE NOTIFICACIONES
  // ========================================

  const addNotification = useCallback((message, type = 'info', duration = 3000) => {
    const notification = {
      id: notificationIdRef.current++,
      message,
      type,
      createdAt: Date.now(),
      duration
    };

    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, duration);
  }, []);

  const addCombo = useCallback((points, multiplier) => {
    const combo = {
      id: Date.now(),
      points,
      multiplier,
      createdAt: Date.now()
    };

    setCombos(prev => [...prev, combo]);

    setTimeout(() => {
      setCombos(prev => prev.filter(c => c.id !== combo.id));
    }, 2000);
  }, []);

  // ========================================
  // 🔄 EFECTOS Y LISTENERS
  // ========================================

  useEffect(() => {
    // Escuchar eventos del juego para mostrar notificaciones
    const handleScoreUpdate = (points) => {
      if (points > 100) {
        addNotification(`+${points} points!`, 'success');
      }
    };

    const handleLevelUp = () => {
      addNotification('Level Up!', 'success', 4000);
      playSound('levelUp');
    };

    const handleHealthLow = () => {
      if (state.health <= 25 && state.health > 0) {
        addNotification('Health Low!', 'warning', 2000);
      }
    };

    const handleCollectible = () => {
      playSound('uiCollect', { volume: 0.3 });
    };

    // Simular listeners (en un juego real estos vendrían del GameEngine)
    handleHealthLow();

    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, [state.health, state.score, state.level, addNotification, playSound]);

  // ========================================
  // 🎯 CONTROLES DE UI
  // ========================================

  const toggleMinimap = useCallback(() => {
    setShowMinimap(prev => !prev);
    playSound('click');
  }, [playSound]);

  const togglePerformance = useCallback(() => {
    setShowPerformance(prev => !prev);
    playSound('click');
  }, [playSound]);

  if (!utils.isPlaying && !utils.isPaused) return null;

  return (
    <div className="hud">
      {/* HUD Principal */}
      <HUDElements
        state={state}
        utils={utils}
        actions={actions}
        onNotification={addNotification}
      />

      {/* Barra de Salud */}
      <HealthBar
        health={state.health}
        maxHealth={state.maxHealth}
        isLow={state.health <= 25}
      />

      {/* Panel de Puntuación */}
      <ScorePanel
        score={state.score}
        level={state.level}
        collectibles={state.collectibles}
        totalCollectibles={state.totalCollectibles}
        lives={state.lives}
      />

      {/* Timer del Nivel */}
      <LevelTimer
        timeElapsed={state.timeElapsed}
        levelStartTime={state.levelStartTime}
      />

      {/* Minimapa */}
      {showMinimap && (
        <Minimap
          playerPosition={state.playerPosition}
          enemies={state.enemies}
          collectibles={state.collectiblePositions}
          onToggle={toggleMinimap}
        />
      )}

      {/* Combos y Efectos */}
      <ComboDisplay combos={combos} />

      {/* Notificaciones */}
      <NotificationSystem notifications={notifications} />

      {/* Controles Touch (móvil) */}
      <TouchControls />

      {/* Panel de Pausa */}
      {utils.isPaused && <PauseOverlay />}

      {/* Indicadores de Debug */}
      {import.meta.env.DEV && showPerformance && (
        <PerformanceMonitor onToggle={togglePerformance} />
      )}

      {/* Botones de Control */}
      <ControlButtons
        onToggleMinimap={toggleMinimap}
        onTogglePerformance={togglePerformance}
        showMinimap={showMinimap}
        showPerformance={showPerformance}
      />
    </div>
  );
}

// ========================================
// 💗 COMPONENTE DE BARRA DE SALUD
// ========================================

function HealthBar({ health, maxHealth, isLow }) {
  const healthPercentage = (health / maxHealth) * 100;

  return (
    <div className="health-bar">
      <div className="health-bg">
        <div
          className={`health-fill ${isLow ? 'health-low' : ''}`}
          style={{ width: `${healthPercentage}%` }}
        />
        <div className="health-segments">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="health-segment" />
          ))}
        </div>
      </div>
      <div className="health-text">
        {health}/{maxHealth}
      </div>
      <div className="health-icon">❤️</div>
    </div>
  );
}

// ========================================
// 📊 PANEL DE PUNTUACIÓN
// ========================================

function ScorePanel({ score, level, collectibles, totalCollectibles, lives }) {
  return (
    <div className="score-panel">
      <div className="score-display">
        <div className="score-label">SCORE</div>
        <div className="score-value">{GameUtils.formatNumber(score)}</div>
      </div>

      <div className="level-display">
        <div className="level-label">LEVEL</div>
        <div className="level-value">{level}</div>
      </div>

      <div className="collectibles-display">
        <div className="collectibles-label">GEMS</div>
        <div className="collectibles-value">
          {collectibles}/{totalCollectibles}
        </div>
        <div className="collectibles-bar">
          <div
            className="collectibles-fill"
            style={{ width: `${(collectibles / totalCollectibles) * 100}%` }}
          />
        </div>
      </div>

      <div className="lives-display">
        <div className="lives-label">LIVES</div>
        <div className="lives-icons">
          {[...Array(Math.max(0, lives))].map((_, i) => (
            <span key={i} className="life-icon">🎮</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// ⏱️ TIMER DEL NIVEL
// ========================================

function LevelTimer({ timeElapsed }) {
  return (
    <div className="level-timer">
      <div className="timer-icon">⏱️</div>
      <div className="timer-value">
        {TimeUtils.formatTime(timeElapsed)}
      </div>
    </div>
  );
}

// ========================================
// 🗺️ MINIMAPA
// ========================================

function Minimap({ playerPosition, enemies = [], collectibles = [], onToggle }) {
  const mapRef = useRef();
  const scale = 0.1; // Escala del minimapa

  return (
    <div className="minimap">
      <div className="minimap-header">
        <span>MAP</span>
        <button onClick={onToggle} className="minimap-toggle">×</button>
      </div>

      <div className="minimap-content" ref={mapRef}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          {/* Fondo */}
          <rect width="150" height="150" fill="#1a1a1a" stroke="#333" strokeWidth="2" />

          {/* Grid */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#333" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="150" height="150" fill="url(#grid)" />

          {/* Coleccionables */}
          {collectibles.map((pos, i) => (
            <circle
              key={`collectible-${i}`}
              cx={75 + pos.x * scale}
              cy={75 - pos.z * scale}
              r="2"
              fill="#ffff00"
            />
          ))}

          {/* Enemigos */}
          {enemies.map((enemy, i) => (
            <circle
              key={`enemy-${i}`}
              cx={75 + enemy.position.x * scale}
              cy={75 - enemy.position.z * scale}
              r="3"
              fill="#ff4444"
            />
          ))}

          {/* Jugador */}
          <circle
            cx={75 + (playerPosition?.x || 0) * scale}
            cy={75 - (playerPosition?.z || 0) * scale}
            r="4"
            fill="#00ff00"
            stroke="#ffffff"
            strokeWidth="1"
          />

          {/* Dirección del jugador */}
          <line
            x1={75 + (playerPosition?.x || 0) * scale}
            y1={75 - (playerPosition?.z || 0) * scale}
            x2={75 + (playerPosition?.x || 0) * scale + 6}
            y2={75 - (playerPosition?.z || 0) * scale}
            stroke="#00ff00"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}

// ========================================
// 🎯 DISPLAY DE COMBOS
// ========================================

function ComboDisplay({ combos }) {
  return (
    <div className="combo-display">
      {combos.map(combo => (
        <ComboText key={combo.id} combo={combo} />
      ))}
    </div>
  );
}

function ComboText({ combo }) {
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) return;

      // Animación de escala
      if (progress < 0.2) {
        setScale(1 + progress * 2);
      } else {
        setScale(1.4 - (progress - 0.2) * 0.5);
      }

      // Fade out
      if (progress > 0.7) {
        setOpacity(1 - ((progress - 0.7) / 0.3));
      }

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div
      className="combo-text"
      style={{
        opacity,
        transform: `scale(${scale})`,
        color: combo.multiplier > 2 ? '#ff00ff' : '#ffff00'
      }}
    >
      <div className="combo-points">+{combo.points}</div>
      {combo.multiplier > 1 && (
        <div className="combo-multiplier">x{combo.multiplier}</div>
      )}
    </div>
  );
}

// ========================================
// 📢 SISTEMA DE NOTIFICACIONES
// ========================================

function NotificationSystem({ notifications }) {
  return (
    <div className="notification-system">
      {notifications.map(notification => (
        <Notification key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

function Notification({ notification }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 100);

    // Fade out before removal
    setTimeout(() => setIsVisible(false), notification.duration - 300);
  }, [notification.duration]);

  return (
    <div
      className={`notification notification-${notification.type} ${isVisible ? 'notification-visible' : ''}`}
    >
      <div className="notification-icon">
        {notification.type === 'success' && '✅'}
        {notification.type === 'warning' && '⚠️'}
        {notification.type === 'error' && '❌'}
        {notification.type === 'info' && 'ℹ️'}
      </div>
      <div className="notification-message">
        {notification.message}
      </div>
    </div>
  );
}

// ========================================
// 📱 CONTROLES TÁCTILES
// ========================================

function TouchControls() {
  const { actions } = useGame();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="touch-controls">
      {/* Joystick virtual */}
      <div className="touch-joystick">
        <VirtualJoystick />
      </div>

      {/* Botones de acción */}
      <div className="touch-actions">
        <button
          className="touch-button jump-button"
          onTouchStart={() => actions.jumpPressed()}
          onTouchEnd={() => actions.jumpReleased()}
        >
          ⬆️
        </button>
        <button
          className="touch-button dash-button"
          onTouchStart={() => actions.dashPressed()}
        >
          💨
        </button>
      </div>
    </div>
  );
}

function VirtualJoystick() {
  const joystickRef = useRef();
  const knobRef = useRef();
  const [isDragging, setIsDragging] = useState(false);

  const handleTouch = useCallback((event) => {
    event.preventDefault();

    if (!joystickRef.current || !knobRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const touch = event.touches[0] || event.changedTouches[0];
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = rect.width / 2 - 10;

    if (distance <= maxDistance) {
      knobRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    } else {
      const angle = Math.atan2(deltaY, deltaX);
      const x = Math.cos(angle) * maxDistance;
      const y = Math.sin(angle) * maxDistance;
      knobRef.current.style.transform = `translate(${x}px, ${y}px)`;
    }

    // Enviar input al juego
    const normalizedX = Math.max(-1, Math.min(1, deltaX / maxDistance));
    const normalizedY = Math.max(-1, Math.min(1, deltaY / maxDistance));

    // Aquí enviarías las coordenadas al sistema de input
    window.dispatchEvent(new CustomEvent('joystickMove', {
      detail: { x: normalizedX, y: normalizedY }
    }));
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }

    window.dispatchEvent(new CustomEvent('joystickMove', {
      detail: { x: 0, y: 0 }
    }));
  }, []);

  return (
    <div
      ref={joystickRef}
      className="virtual-joystick"
      onTouchStart={(e) => {
        setIsDragging(true);
        handleTouch(e);
      }}
      onTouchMove={handleTouch}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={knobRef} className="joystick-knob" />
    </div>
  );
}

// ========================================
// ⏸️ OVERLAY DE PAUSA
// ========================================

function PauseOverlay() {
  return (
    <div className="pause-overlay">
      <div className="pause-content">
        <h1>⏸️ PAUSED</h1>
        <p>Press ESC to resume</p>
      </div>
    </div>
  );
}

// ========================================
// 🔧 MONITOR DE RENDIMIENTO
// ========================================

function PerformanceMonitor({ onToggle }) {
  const [performance, setPerformance] = useState({
    fps: 0,
    memory: 0,
    drawCalls: 0,
    entities: 0
  });

  useEffect(() => {
    const updatePerformance = () => {
      setPerformance({
        fps: Math.round(1000 / 16.67), // Simulado
        memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0,
        drawCalls: Math.floor(Math.random() * 100) + 50, // Simulado
        entities: Math.floor(Math.random() * 50) + 20 // Simulado
      });
    };

    const interval = setInterval(updatePerformance, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="performance-monitor">
      <div className="performance-header">
        <span>PERFORMANCE</span>
        <button onClick={onToggle}>×</button>
      </div>
      <div className="performance-stats">
        <div className="stat">
          <span className="stat-label">FPS:</span>
          <span className="stat-value">{performance.fps}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Memory:</span>
          <span className="stat-value">{performance.memory}MB</span>
        </div>
        <div className="stat">
          <span className="stat-label">Draw Calls:</span>
          <span className="stat-value">{performance.drawCalls}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Entities:</span>
          <span className="stat-value">{performance.entities}</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 🎛️ BOTONES DE CONTROL
// ========================================

function ControlButtons({
  onToggleMinimap,
  onTogglePerformance,
  showMinimap,
  showPerformance
}) {
  return (
    <div className="control-buttons">
      <button
        className={`control-button ${showMinimap ? 'active' : ''}`}
        onClick={onToggleMinimap}
        title="Toggle Minimap"
      >
        🗺️
      </button>

      {import.meta.env.DEV && (
        <button
          className={`control-button ${showPerformance ? 'active' : ''}`}
          onClick={onTogglePerformance}
          title="Toggle Performance Monitor"
        >
          📊
        </button>
      )}
    </div>
  );
}

// ========================================
// 🎯 ELEMENTOS PRINCIPALES DEL HUD
// ========================================

function HUDElements({ state, utils, actions, onNotification }) {
  // Este componente contendría elementos adicionales del HUD
  // como crosshairs, objetivos, etc.

  return (
    <div className="hud-elements">
      {/* Crosshair */}
      <div className="crosshair">
        <div className="crosshair-dot" />
      </div>

      {/* Objetivo del nivel */}
      {state.levelObjective && (
        <div className="level-objective">
          <div className="objective-title">OBJECTIVE</div>
          <div className="objective-text">{state.levelObjective}</div>
        </div>
      )}

      {/* Indicador de power-up activo */}
      {state.activePowerups && state.activePowerups.length > 0 && (
        <div className="active-powerups">
          {state.activePowerups.map((powerup, i) => (
            <div key={i} className="powerup-indicator">
              <div className="powerup-icon">{powerup.icon}</div>
              <div className="powerup-timer">{powerup.remainingTime}s</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GameUI;
