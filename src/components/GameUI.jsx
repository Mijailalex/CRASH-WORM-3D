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
// ========================================

export function GameUI() {
  const { state } = useGame();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 1000,
      padding: '20px',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* HUD Principal */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        pointerEvents: 'auto'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
          Score: {state.game?.score || 0}
        </div>
        <div style={{ fontSize: '18px' }}>
          Gems: {state.player?.gems || 0}
        </div>
        <div style={{ fontSize: '18px' }}>
          Lives: {state.player?.lives || 3}
        </div>
      </div>

      {/* Barra de Salud */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '200px',
        height: '20px',
        backgroundColor: 'rgba(255, 0, 0, 0.3)',
        border: '2px solid white',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${(state.player?.health || 100)}%`,
          height: '100%',
          backgroundColor: '#00ff00',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Minimapa */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '150px',
        height: '150px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        border: '2px solid white',
        borderRadius: '10px'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '4px',
          height: '4px',
          backgroundColor: '#ff0000',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)'
        }} />
      </div>

      {/* Controles */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        fontSize: '14px',
        opacity: 0.7
      }}>
        <div>WASD / Arrows: Move</div>
        <div>Space: Jump</div>
        <div>ESC: Pause</div>
      </div>
    </div>
  );
}

// Exportaciones
export { Player, Enemies, Collectibles, Platforms, ParticleEffects, GameUI };