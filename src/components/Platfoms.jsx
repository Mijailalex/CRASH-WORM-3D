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
// COMPONENTE PLATFORMS
// Ubicación: src/components/Platforms.jsx
// ========================================

export function Platforms({ count = 15 }) {
  const [platforms, setPlatforms] = useState([]);

  useEffect(() => {
    const generatePlatforms = () => {
      const newPlatforms = [];
      
      // Plataforma base
      newPlatforms.push({
        id: 0,
        position: [0, 0, 0],
        size: [50, 1, 50],
        type: 'ground',
        color: '#8b4513'
      });

      // Plataformas flotantes
      for (let i = 1; i < count; i++) {
        newPlatforms.push({
          id: i,
          position: [
            Math.random() * 60 - 30,
            Math.random() * 20 + 5,
            Math.random() * 60 - 30
          ],
          size: [
            Math.random() * 6 + 4,
            0.5,
            Math.random() * 6 + 4
          ],
          type: Math.random() > 0.8 ? 'moving' : 'static',
          color: Math.random() > 0.5 ? '#666666' : '#999999'
        });
      }
      
      setPlatforms(newPlatforms);
    };

    generatePlatforms();
  }, [count]);

  return (
    <group>
      {platforms.map(platform => (
        <Platform key={platform.id} {...platform} />
      ))}
    </group>
  );
}

function Platform({ id, position, size, type, color }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();

  useFrame((state) => {
    if (type === 'moving' && meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.x = position[0] + Math.sin(time * 0.5) * 3;
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type={type === 'moving' ? 'kinematicPosition' : 'fixed'}
      userData={{ type: 'platform' }}
    >
      <mesh ref={meshRef} receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}