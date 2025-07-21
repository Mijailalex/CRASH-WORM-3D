// ========================================
// COMPONENTES FALTANTES DEL JUEGO
// Player, Enemies, Collectibles, Platforms, ParticleEffects, GameUI
// ========================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Box, Sphere, Cylinder, Text } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useGame } from '../context/GameContext';
import { useAudioManager } from '../hooks/useAudioManager';

// ========================================
// COMPONENTE GAME UI
// Ubicación: src/components/GameUI.jsx
// ========================================

export function GameUI() {
  const { state } = useGame();
  const { score, health, level, lives, timeRemaining } = state;

  return (
    <div className="game-ui">
      {/* HUD Principal */}
      <div className="hud-top">
        <div className="score-display">
          <span className="label">Score:</span>
          <span className="value">{score.toLocaleString()}</span>
        </div>
        
        <div className="level-display">
          <span className="label">Level:</span>
          <span className="value">{level}</span>
        </div>
        
        <div className="time-display">
          <span className="label">Time:</span>
          <span className="value">{Math.floor(timeRemaining)}s</span>
        </div>
      </div>

      {/* Barra de Salud */}
      <div className="health-bar">
        <div className="health-bg">
          <div 
            className="health-fill"
            style={{ width: `${(health / 100) * 100}%` }}
          />
        </div>
        <span className="health-text">{health}/100</span>
      </div>

      {/* Vidas */}
      <div className="lives-display">
        {Array.from({ length: lives }, (_, i) => (
          <div key={i} className="life-icon">♥</div>
        ))}
      </div>

      {/* Controles */}
      <div className="controls-hint">
        <div>WASD/Arrows: Move</div>
        <div>Space: Jump</div>
        <div>ESC: Pause</div>
      </div>
    </div>
  );
}