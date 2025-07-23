/* ============================================================================ */
/* 🎮 CRASH WORM 3D - MENÚ DE PAUSA */
/* ============================================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { TimeUtils, GameUtils } from '@/utils/gameUtils';
import useAudioManager from '@/hooks/useAudioManager';

// ========================================
// ⏸️ COMPONENTE PRINCIPAL DEL MENÚ DE PAUSA
// ========================================

export function PauseMenu() {
  const { state, actions, utils } = useGame();
  const { playSound, pauseMusic, resumeMusic } = useAudioManager();

  const [activeTab, setActiveTab] = useState('main');
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  // ========================================
  // 🔄 EFECTOS Y INICIALIZACIÓN
  // ========================================

  useEffect(() => {
    // Pausar música cuando se abre el menú
    pauseMusic();

    // Animación de entrada
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);

    // Listener para cerrar con ESC
    const handleKeyPress = (event) => {
      if (event.code === 'Escape' && !showQuitConfirm) {
        resumeGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [pauseMusic, showQuitConfirm]);

  // ========================================
  // 🎮 ACCIONES DEL MENÚ
  // ========================================

  const resumeGame = useCallback(() => {
    playSound('click');
    resumeMusic();
    actions.resumeGame();
  }, [playSound, resumeMusic, actions]);

  const restartLevel = useCallback(() => {
    playSound('click');
    setShowQuitConfirm(false);
    actions.resetGame();
    actions.startGame();
  }, [playSound, actions]);

  const quitToMenu = useCallback(() => {
    playSound('click');
    setShowQuitConfirm(false);
    actions.goToMenu();
  }, [playSound, actions]);

  const changeTab = useCallback((tab) => {
    playSound('click');
    setActiveTab(tab);
  }, [playSound]);

  const showQuitDialog = useCallback(() => {
    playSound('click');
    setShowQuitConfirm(true);
  }, [playSound]);

  const hideQuitDialog = useCallback(() => {
    playSound('click');
    setShowQuitConfirm(false);
  }, [playSound]);

  // ========================================
  // 🎨 RENDER PRINCIPAL
  // ========================================

  return (
    <div className={`pause-menu-overlay ${isAnimating ? 'animating' : ''}`}>
      <div className="pause-menu-container">
        {/* Header del menú */}
        <PauseMenuHeader
          onResume={resumeGame}
          currentLevel={state.level}
          timeElapsed={state.timeElapsed}
        />

        {/* Navegación por pestañas */}
        <PauseMenuTabs
          activeTab={activeTab}
          onTabChange={changeTab}
        />

        {/* Contenido según la pestaña activa */}
        <div className="pause-menu-content">
          {activeTab === 'main' && (
            <MainPauseContent
              onResume={resumeGame}
              onRestart={restartLevel}
              onQuit={showQuitDialog}
              onChangeTab={changeTab}
            />
          )}

          {activeTab === 'stats' && (
            <GameStatsContent
              gameState={state}
              onBack={() => changeTab('main')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsContent
              onBack={() => changeTab('main')}
            />
          )}

          {activeTab === 'controls' && (
            <ControlsContent
              onBack={() => changeTab('main')}
            />
          )}
        </div>

        {/* Modal de confirmación para salir */}
        {showQuitConfirm && (
          <QuitConfirmationModal
            onConfirm={quitToMenu}
            onCancel={hideQuitDialog}
          />
        )}
      </div>
    </div>
  );
}

// ========================================
// 📋 HEADER DEL MENÚ DE PAUSA
// ========================================

function PauseMenuHeader({ onResume, currentLevel, timeElapsed }) {
  return (
    <div className="pause-menu-header">
      <div className="pause-title">
        <h1>⏸️ GAME PAUSED</h1>
        <div className="pause-subtitle">
          Level {currentLevel} • {TimeUtils.formatTime(timeElapsed)}
        </div>
      </div>

      <button
        className="resume-button"
        onClick={onResume}
        title="Press ESC to resume"
      >
        ▶️ Resume
      </button>
    </div>
  );
}

// ========================================
// 📑 PESTAÑAS DEL MENÚ
// ========================================

function PauseMenuTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'main', label: '🏠 Main', icon: '🏠' },
    { id: 'stats', label: '📊 Stats', icon: '📊' },
    { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
    { id: 'controls', label: '🎮 Controls', icon: '🎮' }
  ];

  return (
    <div className="pause-menu-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`pause-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label.split(' ')[1]}</span>
        </button>
      ))}
    </div>
  );
}

// ========================================
// 🏠 CONTENIDO PRINCIPAL
// ========================================

function MainPauseContent({ onResume, onRestart, onQuit, onChangeTab }) {
  const menuItems = [
    {
      id: 'resume',
      icon: '▶️',
      label: 'Resume Game',
      description: 'Continue playing',
      action: onResume,
      isPrimary: true
    },
    {
      id: 'restart',
      icon: '🔄',
      label: 'Restart Level',
      description: 'Start the level over',
      action: onRestart
    },
    {
      id: 'stats',
      icon: '📊',
      label: 'View Stats',
      description: 'See your current progress',
      action: () => onChangeTab('stats')
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: 'Settings',
      description: 'Adjust game options',
      action: () => onChangeTab('settings')
    },
    {
      id: 'controls',
      icon: '🎮',
      label: 'Controls',
      description: 'View control scheme',
      action: () => onChangeTab('controls')
    },
    {
      id: 'quit',
      icon: '🚪',
      label: 'Quit to Menu',
      description: 'Exit to main menu',
      action: onQuit,
      isDanger: true
    }
  ];

  return (
    <div className="main-pause-content">
      <div className="pause-menu-items">
        {menuItems.map((item, index) => (
          <PauseMenuItem
            key={item.id}
            {...item}
            delay={index * 50}
          />
        ))}
      </div>

      {/* Información rápida */}
      <div className="pause-info">
        <div className="info-item">
          <span className="info-icon">⌨️</span>
          <span className="info-text">Press ESC to resume quickly</span>
        </div>
        <div className="info-item">
          <span className="info-icon">💾</span>
          <span className="info-text">Progress is automatically saved</span>
        </div>
      </div>
    </div>
  );
}

function PauseMenuItem({ icon, label, description, action, isPrimary, isDanger, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <button
      className={`pause-menu-item ${isVisible ? 'visible' : ''} ${isPrimary ? 'primary' : ''} ${isDanger ? 'danger' : ''}`}
      onClick={action}
    >
      <div className="item-icon">{icon}</div>
      <div className="item-content">
        <div className="item-label">{label}</div>
        <div className="item-description">{description}</div>
      </div>
      <div className="item-arrow">→</div>
    </button>
  );
}

// ========================================
// 📊 CONTENIDO DE ESTADÍSTICAS
// ========================================

function GameStatsContent({ gameState, onBack }) {
  const currentStats = [
    { label: 'Current Score', value: GameUtils.formatNumber(gameState.score), icon: '🏆' },
    { label: 'Level', value: gameState.level, icon: '🎯' },
    { label: 'Time Played', value: TimeUtils.formatTime(gameState.timeElapsed), icon: '⏱️' },
    { label: 'Health', value: `${gameState.health}/${gameState.maxHealth}`, icon: '❤️' },
    { label: 'Lives Remaining', value: gameState.lives, icon: '🎮' },
    { label: 'Collectibles', value: `${gameState.collectibles}/${gameState.totalCollectibles}`, icon: '💎' }
  ];

  const sessionStats = [
    { label: 'Enemies Defeated', value: gameState.statistics.enemiesDefeated, icon: '👹' },
    { label: 'Items Collected', value: gameState.statistics.itemsCollected, icon: '💎' },
    { label: 'Jumps Made', value: gameState.statistics.jumps, icon: '⬆️' },
    { label: 'Deaths', value: gameState.statistics.deaths, icon: '💀' }
  ];

  return (
    <div className="game-stats-content">
      <div className="stats-header">
        <h2>📊 Current Game Statistics</h2>
        <button className="back-button" onClick={onBack}>← Back</button>
      </div>

      <div className="stats-sections">
        {/* Estadísticas actuales */}
        <div className="stats-section">
          <h3>🎮 Current Session</h3>
          <div className="stats-grid">
            {currentStats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={i * 100} />
            ))}
          </div>
        </div>

        {/* Estadísticas de sesión */}
        <div className="stats-section">
          <h3>📈 Session Progress</h3>
          <div className="stats-grid">
            {sessionStats.map((stat, i) => (
              <StatCard key={stat.label} {...stat} delay={(i + currentStats.length) * 100} />
            ))}
          </div>
        </div>

        {/* Progreso del nivel */}
        <div className="stats-section">
          <h3>🏆 Level Progress</h3>
          <LevelProgressBar gameState={gameState} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`stat-card ${isVisible ? 'visible' : ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function LevelProgressBar({ gameState }) {
  const collectibleProgress = (gameState.collectibles / gameState.totalCollectibles) * 100;
  const healthProgress = (gameState.health / gameState.maxHealth) * 100;

  return (
    <div className="level-progress">
      <div className="progress-item">
        <label>Collectibles Progress</label>
        <div className="progress-bar">
          <div
            className="progress-fill collectibles"
            style={{ width: `${collectibleProgress}%` }}
          />
        </div>
        <span>{gameState.collectibles}/{gameState.totalCollectibles}</span>
      </div>

      <div className="progress-item">
        <label>Health Status</label>
        <div className="progress-bar">
          <div
            className="progress-fill health"
            style={{ width: `${healthProgress}%` }}
          />
        </div>
        <span>{gameState.health}/{gameState.maxHealth}</span>
      </div>
    </div>
  );
}

// ========================================
// ⚙️ CONTENIDO DE CONFIGURACIONES
// ========================================

function SettingsContent({ onBack }) {
  const { state, actions } = useGame();

  return (
    <div className="settings-content">
      <div className="settings-header">
        <h2>⚙️ Game Settings</h2>
        <button className="back-button" onClick={onBack}>← Back</button>
      </div>

      <div className="settings-sections">
        {/* Audio Settings */}
        <div className="settings-section">
          <h3>🔊 Audio Settings</h3>
          <div className="setting-controls">
            <VolumeSetting
              label="Master Volume"
              value={state.masterVolume}
              onChange={(value) => actions.setVolume('masterVolume', value)}
            />
            <VolumeSetting
              label="Music Volume"
              value={state.musicVolume}
              onChange={(value) => actions.setVolume('musicVolume', value)}
            />
            <VolumeSetting
              label="SFX Volume"
              value={state.sfxVolume}
              onChange={(value) => actions.setVolume('sfxVolume', value)}
            />

            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={state.soundEnabled}
                  onChange={() => actions.toggleSound()}
                />
                <span className="toggle-slider"></span>
                Sound Enabled
              </label>
            </div>
          </div>
        </div>

        {/* Game Settings */}
        <div className="settings-section">
          <h3>🎮 Game Settings</h3>
          <div className="setting-controls">
            <div className="setting-item">
              <label>Difficulty</label>
              <select
                value={state.difficulty}
                onChange={(e) => actions.setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
                <option value="extreme">Extreme</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Player Name</label>
              <input
                type="text"
                value={state.playerName}
                onChange={(e) => actions.setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VolumeSetting({ label, value, onChange }) {
  return (
    <div className="setting-item volume-setting">
      <label>{label}</label>
      <div className="volume-control">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="volume-slider"
        />
        <span className="volume-value">{Math.round(value * 100)}%</span>
      </div>
    </div>
  );
}

// ========================================
// 🎮 CONTENIDO DE CONTROLES
// ========================================

function ControlsContent({ onBack }) {
  const controlMappings = [
    { action: 'Move Left', keys: ['A', '←'], icon: '⬅️' },
    { action: 'Move Right', keys: ['D', '→'], icon: '➡️' },
    { action: 'Jump', keys: ['Space', 'W', '↑'], icon: '⬆️' },
    { action: 'Dash', keys: ['Shift'], icon: '💨' },
    { action: 'Pause', keys: ['Esc'], icon: '⏸️' },
    { action: 'Interact', keys: ['E'], icon: '🤝' }
  ];

  return (
    <div className="controls-content">
      <div className="controls-header">
        <h2>🎮 Game Controls</h2>
        <button className="back-button" onClick={onBack}>← Back</button>
      </div>

      <div className="controls-sections">
        {/* Keyboard Controls */}
        <div className="controls-section">
          <h3>⌨️ Keyboard Controls</h3>
          <div className="controls-list">
            {controlMappings.map((control, i) => (
              <ControlMapping key={control.action} {...control} delay={i * 100} />
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="controls-section">
          <h3>💡 Control Tips</h3>
          <div className="control-tips">
            <div className="tip-item">
              <span className="tip-icon">🎯</span>
              <span className="tip-text">Hold Shift while moving to dash and avoid enemies</span>
            </div>
            <div className="tip-item">
              <span className="tip-icon">⚡</span>
              <span className="tip-text">You can double jump! Press jump twice in the air</span>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🎮</span>
              <span className="tip-text">Gamepad support is available for compatible controllers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlMapping({ action, keys, icon, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`control-mapping ${isVisible ? 'visible' : ''}`}>
      <div className="action-info">
        <span className="action-icon">{icon}</span>
        <span className="action-name">{action}</span>
      </div>
      <div className="key-bindings">
        {keys.map((key, i) => (
          <React.Fragment key={key}>
            <kbd className="key">{key}</kbd>
            {i < keys.length - 1 && <span className="key-separator">or</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ========================================
// ❓ MODAL DE CONFIRMACIÓN
// ========================================

function QuitConfirmationModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="quit-confirmation-modal">
        <div className="modal-header">
          <h3>🚪 Quit to Menu?</h3>
        </div>

        <div className="modal-content">
          <p>Are you sure you want to quit to the main menu?</p>
          <p className="warning-text">⚠️ Current progress since last checkpoint will be lost!</p>
        </div>

        <div className="modal-actions">
          <button className="button button-danger" onClick={onConfirm}>
            🚪 Yes, Quit
          </button>
          <button className="button button-primary" onClick={onCancel}>
            ↩️ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default PauseMenu;
