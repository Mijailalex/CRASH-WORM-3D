/* ============================================================================ */
/* 🎮 CRASH WORM 3D - INTERFAZ DE USUARIO DEL JUEGO */
/* ============================================================================ */
/* Ubicación: src/components/GameUI.jsx */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameContext } from '../context/GameContext';
import { useAudioManager } from '../hooks/useAudioManager';
import { DeviceUtils, TimeUtils, GameUtils } from '../utils/gameUtils';

// ========================================
// 🎯 COMPONENTE PRINCIPAL DE UI
// ========================================

export function GameUI() {
  const {
    gameState,
    player,
    settings,
    ui,
    performance,
    room,
    toggleUI,
    showNotification,
    updatePerformance
  } = useGameContext();

  const { playSound } = useAudioManager();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't render UI during loading
  if (gameState === 'LOADING') {
    return null;
  }

  return (
    <div className="game-ui-overlay">
      {/* HUD Elements */}
      <HUD />

      {/* Health Bar */}
      <HealthBar />

      {/* Score Display */}
      <ScoreDisplay />

      {/* Minimap */}
      <Minimap />

      {/* Power-ups Display */}
      <PowerUpsDisplay />

      {/* Chat (Multiplayer) */}
      {room.id && <ChatSystem />}

      {/* Performance Monitor */}
      {(ui.showFPS || settings.gameplay.showDebugInfo) && <PerformanceMonitor />}

      {/* Touch Controls (Mobile) */}
      {DeviceUtils.isMobile() && <TouchControls />}

      {/* Notifications */}
      <NotificationSystem />

      {/* Pause Menu */}
      {ui.showPauseMenu && <PauseMenu />}

      {/* Settings Menu */}
      {ui.showSettings && <SettingsMenu />}

      {/* Inventory */}
      {ui.showInventory && <Inventory />}
    </div>
  );
}

// ========================================
// 📊 HUD PRINCIPAL
// ========================================

function HUD() {
  const { player, currentLevel } = useGameContext();

  return (
    <div className="hud hud-top-left">
      <div className="hud-section">
        <div className="hud-item">
          <span className="hud-label">Level:</span>
          <span className="hud-value">{currentLevel}</span>
        </div>

        <div className="hud-item">
          <span className="hud-label">Lives:</span>
          <span className="hud-value">{'❤️'.repeat(player.lives)}</span>
        </div>

        <div className="hud-item">
          <span className="hud-label">Coins:</span>
          <span className="hud-value gold">🪙 {player.coins}</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ❤️ BARRA DE SALUD
// ========================================

function HealthBar() {
  const { player } = useGameContext();
  const healthPercent = (player.health / 100) * 100;

  const healthBarStyle = {
    width: `${healthPercent}%`,
    background: getHealthColor(player.health)
  };

  return (
    <div className="hud hud-top-left" style={{ top: '80px' }}>
      <div className="health-bar">
        <div className="health-bar-fill" style={healthBarStyle}></div>
        <div className="health-bar-text">
          {player.health}/100
        </div>
      </div>
    </div>
  );
}

function getHealthColor(health) {
  if (health > 70) return 'linear-gradient(90deg, #10b981, #34d399)';
  if (health > 30) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  return 'linear-gradient(90deg, #ef4444, #f87171)';
}

// ========================================
// 🏆 DISPLAY DE PUNTUACIÓN
// ========================================

function ScoreDisplay() {
  const { player } = useGameContext();
  const [animatedScore, setAnimatedScore] = useState(player.score);
  const [scoreChange, setScoreChange] = useState(null);

  // Animate score changes
  useEffect(() => {
    if (player.score !== animatedScore) {
      const difference = player.score - animatedScore;
      setScoreChange(difference);

      // Animate score counting up
      const duration = 500;
      const startTime = Date.now();
      const startScore = animatedScore;

      const animateScore = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentScore = Math.floor(startScore + (difference * progress));
        setAnimatedScore(currentScore);

        if (progress < 1) {
          requestAnimationFrame(animateScore);
        } else {
          setScoreChange(null);
        }
      };

      animateScore();
    }
  }, [player.score, animatedScore]);

  return (
    <div className="hud hud-top-right">
      <div className="score-display">
        <div className="score-label">SCORE</div>
        <div className="score-value">
          {GameUtils.formatScore(animatedScore)}
        </div>
        {scoreChange && (
          <div className={`score-change ${scoreChange > 0 ? 'positive' : 'negative'}`}>
            {scoreChange > 0 ? '+' : ''}{GameUtils.formatScore(scoreChange)}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// 🗺️ MINIMAPA
// ========================================

function Minimap() {
  const { player, ui } = useGameContext();
  const [mapData, setMapData] = useState({ entities: [], bounds: { width: 100, height: 100 } });

  if (!ui.showMinimap) return null;

  return (
    <div className="hud hud-bottom-right">
      <div className="minimap">
        <div className="minimap-content">
          {/* Player dot */}
          <div
            className="minimap-player"
            style={{
              left: `${(player.position.x / mapData.bounds.width) * 100}%`,
              top: `${(player.position.z / mapData.bounds.height) * 100}%`
            }}
          />

          {/* Other entities */}
          {mapData.entities.map((entity, index) => (
            <div
              key={index}
              className={`minimap-entity minimap-${entity.type}`}
              style={{
                left: `${(entity.position.x / mapData.bounds.width) * 100}%`,
                top: `${(entity.position.z / mapData.bounds.height) * 100}%`
              }}
            />
          ))}
        </div>

        <div className="minimap-border"></div>
      </div>
    </div>
  );
}

// ========================================
// 💫 DISPLAY DE POWER-UPS
// ========================================

function PowerUpsDisplay() {
  const { player } = useGameContext();

  if (!player.powerUps.length) return null;

  return (
    <div className="hud hud-bottom-left">
      <div className="powerups-display">
        <div className="powerups-label">Active Power-ups</div>
        <div className="powerups-list">
          {player.powerUps.map((powerUp, index) => (
            <PowerUpItem key={powerUp.id || index} powerUp={powerUp} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PowerUpItem({ powerUp }) {
  const [timeLeft, setTimeLeft] = useState(powerUp.duration || 0);

  useEffect(() => {
    if (!powerUp.duration || powerUp.duration === 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 100;
        return newTime <= 0 ? 0 : newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [powerUp.duration]);

  const progress = powerUp.duration ? (timeLeft / powerUp.duration) * 100 : 100;

  return (
    <div className="powerup-item">
      <div className="powerup-icon" style={{ color: powerUp.color }}>
        {powerUp.icon || '⭐'}
      </div>
      <div className="powerup-info">
        <div className="powerup-name">{powerUp.name}</div>
        {powerUp.duration > 0 && (
          <div className="powerup-timer">
            <div className="powerup-timer-bar">
              <div
                className="powerup-timer-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="powerup-timer-text">
              {TimeUtils.formatTime(timeLeft / 1000)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// 💬 SISTEMA DE CHAT (MULTIPLAYER)
// ========================================

function ChatSystem() {
  const { room, ui, toggleUI } = useGameContext();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback((message) => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: message,
      sender: 'You',
      timestamp: Date.now(),
      type: 'chat'
    };

    setMessages(prev => [...prev.slice(-50), newMessage]); // Keep last 50 messages
    setInputValue('');
    setIsTyping(false);

    // TODO: Send message to server
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      sendMessage(inputValue);
    } else if (e.key === 'Escape') {
      toggleUI('showChat', false);
      setIsTyping(false);
    }
  }, [inputValue, sendMessage, toggleUI]);

  if (!ui.showChat) {
    return (
      <button
        className="chat-toggle-btn hud hud-bottom-left"
        onClick={() => toggleUI('showChat', true)}
      >
        💬
      </button>
    );
  }

  return (
    <div className="chat-system hud hud-bottom-left">
      <div className="chat-header">
        <span>Chat ({room.players.length} players)</span>
        <button
          className="chat-close"
          onClick={() => toggleUI('showChat', false)}
        >
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.map(message => (
          <div key={message.id} className={`chat-message ${message.type}`}>
            <span className="chat-sender">{message.sender}:</span>
            <span className="chat-text">{message.text}</span>
            <span className="chat-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onFocus={() => setIsTyping(true)}
          onBlur={() => setIsTyping(false)}
          placeholder="Type a message..."
          maxLength={200}
          className="input"
        />
        <button
          onClick={() => sendMessage(inputValue)}
          className="btn btn-primary btn-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ========================================
// 📊 MONITOR DE PERFORMANCE
// ========================================

function PerformanceMonitor() {
  const { performance } = useGameContext();

  return (
    <div className="fps-counter">
      <div>FPS: {Math.round(performance.fps || 0)}</div>
      <div>Frame: {(performance.frameTime || 0).toFixed(1)}ms</div>
      <div>Memory: {Math.round(performance.memoryUsage || 0)}MB</div>
      {performance.drawCalls && (
        <div>Calls: {performance.drawCalls}</div>
      )}
    </div>
  );
}

// ========================================
// 📱 CONTROLES TÁCTILES (MÓVIL)
// ========================================

function TouchControls() {
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const { playSound } = useAudioManager();

  const handleJoystickStart = useCallback((e) => {
    setIsJoystickActive(true);
    e.preventDefault();
  }, []);

  const handleJoystickMove = useCallback((e) => {
    if (!isJoystickActive) return;

    const touch = e.touches[0];
    const joystick = e.currentTarget.getBoundingClientRect();
    const centerX = joystick.left + joystick.width / 2;
    const centerY = joystick.top + joystick.height / 2;

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    const maxDistance = joystick.width / 2;

    if (distance <= maxDistance) {
      setJoystickPosition({ x: deltaX, y: deltaY });
    } else {
      const angle = Math.atan2(deltaY, deltaX);
      setJoystickPosition({
        x: Math.cos(angle) * maxDistance,
        y: Math.sin(angle) * maxDistance
      });
    }

    e.preventDefault();
  }, [isJoystickActive]);

  const handleJoystickEnd = useCallback(() => {
    setIsJoystickActive(false);
    setJoystickPosition({ x: 0, y: 0 });
  }, []);

  const handleButtonPress = useCallback((action) => {
    playSound('ui_click', { volume: 0.3 });

    // TODO: Emit button press event
    console.log(`Touch button pressed: ${action}`);
  }, [playSound]);

  return (
    <div className="touch-controls">
      {/* Virtual Joystick */}
      <div
        className="virtual-joystick"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
      >
        <div
          className="virtual-joystick-thumb"
          style={{
            transform: `translate(${joystickPosition.x}px, ${joystickPosition.y}px)`
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="touch-buttons">
        <button
          className="touch-button"
          onTouchStart={() => handleButtonPress('jump')}
        >
          ↑
        </button>

        <button
          className="touch-button"
          onTouchStart={() => handleButtonPress('attack')}
        >
          ⚡
        </button>

        <button
          className="touch-button"
          onTouchStart={() => handleButtonPress('run')}
        >
          🏃
        </button>
      </div>
    </div>
  );
}

// ========================================
// 🔔 SISTEMA DE NOTIFICACIONES
// ========================================

function NotificationSystem() {
  const { ui, hideNotification } = useGameContext();

  return (
    <div className="notifications-container">
      {ui.notifications.map(notification => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
    </div>
  );
}

function Notification({ notification, onClose }) {
  useEffect(() => {
    if (notification.autoHide !== false) {
      const timer = setTimeout(onClose, notification.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  return (
    <div className={`notification notification-${notification.type || 'info'}`}>
      <div className="notification-content">
        {notification.icon && (
          <div className="notification-icon">{notification.icon}</div>
        )}
        <div className="notification-text">
          {notification.title && (
            <div className="notification-title">{notification.title}</div>
          )}
          <div className="notification-message">{notification.message}</div>
        </div>
      </div>

      {notification.autoHide !== false && (
        <button className="notification-close" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  );
}

// ========================================
// ⏸️ MENÚ DE PAUSA
// ========================================

function PauseMenu() {
  const { toggleUI, setGameState } = useGameContext();
  const { playSound } = useAudioManager();

  const handleResumeGame = useCallback(() => {
    playSound('ui_click');
    toggleUI('showPauseMenu', false);
    setGameState('PLAYING');
  }, [playSound, toggleUI, setGameState]);

  const handleShowSettings = useCallback(() => {
    playSound('ui_click');
    toggleUI('showSettings', true);
  }, [playSound, toggleUI]);

  const handleMainMenu = useCallback(() => {
    playSound('ui_click');
    setGameState('MAIN_MENU');
    toggleUI('showPauseMenu', false);
  }, [playSound, setGameState, toggleUI]);

  return (
    <div className="modal-backdrop">
      <div className="modal card">
        <div className="card-header">
          <h2 className="card-title">Game Paused</h2>
        </div>

        <div className="pause-menu-buttons">
          <button className="btn btn-primary btn-lg" onClick={handleResumeGame}>
            Resume Game
          </button>

          <button className="btn btn-secondary btn-lg" onClick={handleShowSettings}>
            Settings
          </button>

          <button className="btn btn-secondary btn-lg" onClick={handleMainMenu}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ⚙️ MENÚ DE CONFIGURACIÓN
// ========================================

function SettingsMenu() {
  const {
    settings,
    toggleUI,
    updateAudioSettings,
    updateGraphicsSettings,
    updateControlsSettings,
    updateGameplaySettings
  } = useGameContext();

  const [activeTab, setActiveTab] = useState('audio');

  const handleClose = useCallback(() => {
    toggleUI('showSettings', false);
  }, [toggleUI]);

  return (
    <div className="modal-backdrop">
      <div className="modal card" style={{ maxWidth: '600px', width: '90vw' }}>
        <div className="card-header">
          <h2 className="card-title">Settings</h2>
          <button className="btn btn-sm" onClick={handleClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            Audio
          </button>
          <button
            className={`settings-tab ${activeTab === 'graphics' ? 'active' : ''}`}
            onClick={() => setActiveTab('graphics')}
          >
            Graphics
          </button>
          <button
            className={`settings-tab ${activeTab === 'controls' ? 'active' : ''}`}
            onClick={() => setActiveTab('controls')}
          >
            Controls
          </button>
          <button
            className={`settings-tab ${activeTab === 'gameplay' ? 'active' : ''}`}
            onClick={() => setActiveTab('gameplay')}
          >
            Gameplay
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'audio' && (
            <AudioSettings
              settings={settings.audio}
              onChange={updateAudioSettings}
            />
          )}
          {activeTab === 'graphics' && (
            <GraphicsSettings
              settings={settings.graphics}
              onChange={updateGraphicsSettings}
            />
          )}
          {activeTab === 'controls' && (
            <ControlsSettings
              settings={settings.controls}
              onChange={updateControlsSettings}
            />
          )}
          {activeTab === 'gameplay' && (
            <GameplaySettings
              settings={settings.gameplay}
              onChange={updateGameplaySettings}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Audio Settings Component
function AudioSettings({ settings, onChange }) {
  return (
    <div className="settings-section">
      <div className="setting-item">
        <label>Master Volume</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.masterVolume}
          onChange={(e) => onChange({ masterVolume: parseFloat(e.target.value) })}
        />
        <span>{Math.round(settings.masterVolume * 100)}%</span>
      </div>

      <div className="setting-item">
        <label>Music Volume</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.musicVolume}
          onChange={(e) => onChange({ musicVolume: parseFloat(e.target.value) })}
        />
        <span>{Math.round(settings.musicVolume * 100)}%</span>
      </div>

      <div className="setting-item">
        <label>SFX Volume</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.sfxVolume}
          onChange={(e) => onChange({ sfxVolume: parseFloat(e.target.value) })}
        />
        <span>{Math.round(settings.sfxVolume * 100)}%</span>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.muted}
            onChange={(e) => onChange({ muted: e.target.checked })}
          />
          Mute All
        </label>
      </div>
    </div>
  );
}

// Graphics Settings Component
function GraphicsSettings({ settings, onChange }) {
  return (
    <div className="settings-section">
      <div className="setting-item">
        <label>Quality</label>
        <select
          value={settings.quality}
          onChange={(e) => onChange({ quality: e.target.value })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="ultra">Ultra</option>
        </select>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.shadows}
            onChange={(e) => onChange({ shadows: e.target.checked })}
          />
          Enable Shadows
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.particles}
            onChange={(e) => onChange({ particles: e.target.checked })}
          />
          Enable Particles
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.antialiasing}
            onChange={(e) => onChange({ antialiasing: e.target.checked })}
          />
          Antialiasing
        </label>
      </div>
    </div>
  );
}

// Controls Settings Component
function ControlsSettings({ settings, onChange }) {
  return (
    <div className="settings-section">
      <div className="setting-item">
        <label>Mouse Sensitivity</label>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={settings.mouseSensitivity}
          onChange={(e) => onChange({ mouseSensitivity: parseFloat(e.target.value) })}
        />
        <span>{settings.mouseSensitivity.toFixed(1)}</span>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.invertY}
            onChange={(e) => onChange({ invertY: e.target.checked })}
          />
          Invert Y Axis
        </label>
      </div>
    </div>
  );
}

// Gameplay Settings Component
function GameplaySettings({ settings, onChange }) {
  return (
    <div className="settings-section">
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.autoSave}
            onChange={(e) => onChange({ autoSave: e.target.checked })}
          />
          Auto Save
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.showHints}
            onChange={(e) => onChange({ showHints: e.target.checked })}
          />
          Show Hints
        </label>
      </div>

      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.showMinimap}
            onChange={(e) => onChange({ showMinimap: e.target.checked })}
          />
          Show Minimap
        </label>
      </div>
    </div>
  );
}

// ========================================
// 🎒 INVENTARIO
// ========================================

function Inventory() {
  const { player, toggleUI } = useGameContext();

  const handleClose = useCallback(() => {
    toggleUI('showInventory', false);
  }, [toggleUI]);

  return (
    <div className="modal-backdrop">
      <div className="modal card">
        <div className="card-header">
          <h2 className="card-title">Inventory</h2>
          <button className="btn btn-sm" onClick={handleClose}>✕</button>
        </div>

        <div className="inventory-content">
          <div className="inventory-stats">
            <div>Coins: {player.coins}</div>
            <div>Level: {player.level}</div>
            <div>Experience: {player.experience}</div>
          </div>

          <div className="inventory-items">
            {player.powerUps.map((item, index) => (
              <div key={index} className="inventory-item">
                <div className="item-icon">{item.icon}</div>
                <div className="item-name">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameUI;
