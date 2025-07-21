// ========================================
// APP.JSX PRINCIPAL Y COMPONENTES DE MENÚ
// ========================================

import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { GameWorld } from './components/GameWorld';
import { GameUI } from './components/GameUI';

// ========================================
// COMPONENTE MAIN MENU
// Ubicación: src/components/MainMenu.jsx
// ========================================

export function MainMenu({ onStartGame, onShowSettings, onShowCredits }) {
  const [selectedOption, setSelectedOption] = useState(0);
  const menuOptions = [
    { label: 'Start Game', action: onStartGame },
    { label: 'Settings', action: onShowSettings },
    { label: 'Credits', action: onShowCredits }
  ];

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
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
  }, [selectedOption, menuOptions]);

  return (
    <div className="main-menu">
      <div className="menu-background">
        <div className="stars"></div>
      </div>
      
      <div className="menu-content">
        <div className="game-title">
          <h1>🎮 CRASH WORM 3D</h1>
          <p className="subtitle">Ultimate Adventure</p>
        </div>

        <nav className="menu-options">
          {menuOptions.map((option, index) => (
            <button
              key={index}
              className={`menu-option ${index === selectedOption ? 'selected' : ''}`}
              onClick={option.action}
              onMouseEnter={() => setSelectedOption(index)}
            >
              {option.label}
            </button>
          ))}
        </nav>

        <div className="menu-footer">
          <p>Use arrow keys or mouse to navigate • Press Enter to select</p>
          <p className="version">v1.0.0 Beta</p>
        </div>
      </div>
    </div>
  );
}