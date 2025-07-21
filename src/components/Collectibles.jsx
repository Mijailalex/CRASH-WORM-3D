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
// COMPONENTE COLLECTIBLES
// Ubicación: src/components/Collectibles.jsx
// ========================================

export function Collectibles({ count = 10 }) {
  const [collectibles, setCollectibles] = useState([]);

  useEffect(() => {
    const generateCollectibles = () => {
      const newCollectibles = [];
      
      for (let i = 0; i < count; i++) {
        newCollectibles.push({
          id: i,
          position: [
            Math.random() * 80 - 40,
            Math.random() * 5 + 3,
            Math.random() * 80 - 40
          ],
          type: Math.random() > 0.8 ? 'special' : 'normal',
          collected: false
        });
      }
      
      setCollectibles(newCollectibles);
    };

    generateCollectibles();
  }, [count]);

  return (
    <group>
      {collectibles.filter(item => !item.collected).map(item => (
        <Collectible
          key={item.id}
          {...item}
          onCollect={(id) => {
            setCollectibles(prev => prev.map(c => 
              c.id === id ? { ...c, collected: true } : c
            ));
          }}
        />
      ))}
    </group>
  );
}

function Collectible({ id, position, type, onCollect }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const { scale } = useSpring({
    scale: hovered ? 1.2 : 1,
    config: { mass: 1, tension: 280, friction: 60 }
  });

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.01;
    }
  });

  const color = type === 'special' ? '#ffd700' : '#00ff00';
  const points = type === 'special' ? 100 : 10;

  return (
    <RigidBody
      position={position}
      type="kinematicPosition"
      sensor
      userData={{ type: 'collectible', item: { id, type, points } }}
    >
      <animated.mesh
        ref={meshRef}
        scale={scale}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </animated.mesh>
    </RigidBody>
  );
}