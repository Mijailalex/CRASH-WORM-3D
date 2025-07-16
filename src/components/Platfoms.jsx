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
// ========================================

export function Platforms({ level = 1 }) {
  const platforms = useMemo(() => {
    const platformCount = 20 + level * 5;
    const generatedPlatforms = [];

    for (let i = 0; i < platformCount; i++) {
      generatedPlatforms.push({
        id: i,
        position: [
          Math.random() * 200 - 100,
          Math.random() * 50,
          Math.random() * 200 - 100
        ],
        size: [
          Math.random() * 10 + 5,
          1,
          Math.random() * 10 + 5
        ],
        type: Math.random() > 0.8 ? 'moving' : 'static'
      });
    }

    return generatedPlatforms;
  }, [level]);

  return (
    <group>
      {platforms.map(platform => (
        <Platform key={platform.id} {...platform} />
      ))}
    </group>
  );
}

function Platform({ id, position, size, type }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();

  // Movimiento para plataformas móviles
  useFrame((state) => {
    if (type === 'moving' && rigidBodyRef.current) {
      const time = state.clock.elapsedTime;
      const newPos = {
        x: position[0] + Math.sin(time * 0.5) * 5,
        y: position[1],
        z: position[2] + Math.cos(time * 0.3) * 3
      };
      
      rigidBodyRef.current.setTranslation(newPos, true);
    }
  });

  const platformColor = type === 'moving' ? '#4a90e2' : '#8b4513';

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type={type === 'moving' ? 'kinematicPosition' : 'fixed'}
      colliders="cuboid"
    >
      <Box ref={meshRef} args={size} castShadow receiveShadow>
        <meshStandardMaterial 
          color={platformColor}
          roughness={0.8}
          metalness={0.1}
        />
      </Box>
    </RigidBody>
  );
}