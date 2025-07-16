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
// ========================================

export function Collectibles({ count = 50, area = 100 }) {
  const [collectibles, setCollectibles] = useState([]);
  const { actions } = useGame();
  const { playSound } = useAudioManager();

  // Generar coleccionables
  useEffect(() => {
    const generateCollectibles = () => {
      const items = [];
      
      for (let i = 0; i < count; i++) {
        items.push({
          id: i,
          position: [
            Math.random() * area - area / 2,
            Math.random() * 10 + 5,
            Math.random() * area - area / 2
          ],
          type: Math.random() > 0.8 ? 'powerup' : 'gem',
          value: Math.random() > 0.8 ? 50 : 10,
          collected: false
        });
      }
      
      setCollectibles(items);
    };

    generateCollectibles();
  }, [count, area]);

  const handleCollect = useCallback((id, item) => {
    setCollectibles(prev => 
      prev.map(c => c.id === id ? { ...c, collected: true } : c)
    );
    
    if (item.type === 'gem') {
      actions.collectGem(item.value);
      playSound('collectGem');
    } else {
      actions.collectPowerUp(item.type);
      playSound('collectPowerup');
    }
  }, [actions, playSound]);

  return (
    <group>
      {collectibles.map(item => 
        !item.collected && (
          <Collectible
            key={item.id}
            {...item}
            onCollect={() => handleCollect(item.id, item)}
          />
        )
      )}
    </group>
  );
}

function Collectible({ id, position, type, value, onCollect }) {
  const meshRef = useRef();
  
  // Animación de rotación y flotación
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  const isGem = type === 'gem';
  const color = isGem ? '#00ffff' : '#ffff00';
  const size = isGem ? 0.5 : 0.8;

  return (
    <RigidBody
      position={position}
      type="kinematicPosition"
      sensor={true}
      onIntersectionEnter={onCollect}
    >
      <group ref={meshRef}>
        {isGem ? (
          <Box args={[size, size, size]} castShadow>
            <meshStandardMaterial 
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
              transparent
              opacity={0.8}
            />
          </Box>
        ) : (
          <Sphere args={[size]} castShadow>
            <meshStandardMaterial 
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
            />
          </Sphere>
        )}
        
        {/* Efecto de brillo */}
        <pointLight
          color={color}
          intensity={0.5}
          distance={5}
        />
      </group>
    </RigidBody>
  );
}