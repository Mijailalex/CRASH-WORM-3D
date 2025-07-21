// ========================================
// APP.JSX PRINCIPAL Y COMPONENTES DE MENÚ
// ========================================

import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { GameWorld } from './components/GameWorld';
import { GameUI } from './components/GameUI';

// ========================================
// COMPONENTE LOADING SCREEN
// Ubicación: src/components/LoadingScreen.jsx
// ========================================

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    const loadingSteps = [
      { text: 'Loading game engine...', duration: 1000 },
      { text: 'Initializing physics...', duration: 800 },
      { text: 'Loading assets...', duration: 1200 },
      { text: 'Starting audio system...', duration: 600 },
      { text: 'Ready to play!', duration: 400 }
    ];

    let currentStep = 0;
    let currentProgress = 0;

    const progressInterval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        return;
      }

      // Cambiar texto según el progreso
      const stepProgress = currentProgress / 20;
      if (stepProgress > currentStep && currentStep < loadingSteps.length - 1) {
        currentStep++;
        setLoadingText(loadingSteps[currentStep].text);
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="loading-screen-full">
      <div className="loading-container">
        <div className="game-logo">
          <h1>🎮 CRASH WORM 3D</h1>
          <p>Adventure Awaits</p>
        </div>
        
        <div className="loading-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="loading-text">{loadingText}</p>
          <p className="progress-percentage">{progress}%</p>
        </div>

        <div className="loading-tips">
          <p>💡 Use WASD or arrow keys to move</p>
          <p>⚡ Press SPACE to jump</p>
          <p>🎯 Collect gems to increase your score</p>
        </div>
      </div>
    </div>
  );
}