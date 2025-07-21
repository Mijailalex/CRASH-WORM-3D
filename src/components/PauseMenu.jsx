// ========================================
// APP.JSX PRINCIPAL Y COMPONENTES DE MENÚ
// ========================================

import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { GameWorld } from './components/GameWorld';
import { GameUI } from './components/GameUI';

// ========================================
// COMPONENTE PAUSE MENU
// Ubicación: src/components/PauseMenu.jsx
// ========================================

export function PauseMenu({ onResume, onSettings, onMainMenu }) {
  const [selectedOption, setSelectedOption] = useState(0);
  const { state } = useGame();
  
  const menuOptions = [
    { label: 'Resume Game', action: onResume },
    { label: 'Settings', action: onSettings },
    { label: 'Main Menu', action: onMainMenu }
  ];

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'Escape':
          onResume();
          break;
        case 'ArrowUp':
          setSelectedOption(prev => 
            prev > 0 ? prev - 1 : menuOptions.length - 1
          );
          break;
        case 'ArrowDown':
          setSelectedOption(prev => 
            prev < menuOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Enter':
          menuOptions[selectedOption].action();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOption, menuOptions, onResume]);

  return (
    <div className="pause-menu">
      <div className="pause-overlay" />
      
      <div className="pause-content">
        <h2>⏸️ Game Paused</h2>
        
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">Score:</span>
            <span className="stat-value">{state.score.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Level:</span>
            <span className="stat-value">{state.level}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Health:</span>
            <span className="stat-value">{state.health}/100</span>
          </div>
        </div>

        <nav className="pause-options">
          {menuOptions.map((option, index) => (
            <button
              key={index}
              className={`pause-option ${index === selectedOption ? 'selected' : ''}`}
              onClick={option.action}
              onMouseEnter={() => setSelectedOption(index)}
            >
              {option.label}
            </button>
          ))}
        </nav>

        <p className="pause-hint">Press ESC to resume or use arrow keys to navigate</p>
      </div>
    </div>
  );
}

// ========================================
// COMPONENTE SETTINGS MENU
// ========================================

function SettingsMenu({ onBack }) {
  const [settings, setSettings] = useState({
    masterVolume: 70,
    musicVolume: 60,
    sfxVolume: 80,
    graphics: 'medium',
    controls: 'keyboard'
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="settings-menu">
      <div className="settings-content">
        <h2>⚙️ Settings</h2>

        <div className="settings-section">
          <h3>Audio</h3>
          <div className="setting-item">
            <label>Master Volume: {settings.masterVolume}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.masterVolume}
              onChange={(e) => updateSetting('masterVolume', e.target.value)}
            />
          </div>
          <div className="setting-item">
            <label>Music Volume: {settings.musicVolume}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.musicVolume}
              onChange={(e) => updateSetting('musicVolume', e.target.value)}
            />
          </div>
          <div className="setting-item">
            <label>SFX Volume: {settings.sfxVolume}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.sfxVolume}
              onChange={(e) => updateSetting('sfxVolume', e.target.value)}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Graphics</h3>
          <div className="setting-item">
            <label>Quality:</label>
            <select 
              value={settings.graphics}
              onChange={(e) => updateSetting('graphics', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>Controls</h3>
          <div className="setting-item">
            <label>Input Method:</label>
            <select 
              value={settings.controls}
              onChange={(e) => updateSetting('controls', e.target.value)}
            >
              <option value="keyboard">Keyboard</option>
              <option value="gamepad">Gamepad</option>
            </select>
          </div>
        </div>

        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}

// ========================================
// COMPONENTE GAME OVER SCREEN
// ========================================

function GameOverScreen({ score, level, onRestart, onMainMenu }) {
  return (
    <div className="game-over-screen">
      <div className="game-over-content">
        <h1>💀 Game Over</h1>
        
        <div className="final-stats">
          <div className="final-stat">
            <span className="stat-label">Final Score:</span>
            <span className="stat-value">{score.toLocaleString()}</span>
          </div>
          <div className="final-stat">
            <span className="stat-label">Level Reached:</span>
            <span className="stat-value">{level}</span>
          </div>
        </div>

        <div className="game-over-buttons">
          <button className="restart-button" onClick={onRestart}>
            🔄 Play Again
          </button>
          <button className="menu-button" onClick={onMainMenu}>
            🏠 Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}