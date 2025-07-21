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
// COMPONENTE ENEMIES
// Ubicación: src/components/Enemies.jsx
// ========================================

export function Enemies({ level = 1, playerPosition = { x: 0, y: 0, z: 0 } }) {
  const [enemies, setEnemies] = useState([]);
  const { playSound } = useAudioManager();

  // Generar enemigos basado en el nivel
  useEffect(() => {
    const generateEnemies = () => {
      const enemyCount = Math.min(level * 2, 10);
      const newEnemies = [];

      for (let i = 0; i < enemyCount; i++) {
        newEnemies.push({
          id: i,
          position: [
            Math.random() * 100 - 50,
            5,
            Math.random() * 100 - 50
          ],
          type: Math.random() > 0.7 ? 'heavy' : 'basic',
          health: Math.random() > 0.7 ? 30 : 15,
          alive: true
        });
      }

      setEnemies(newEnemies);
    };

    generateEnemies();
  }, [level]);

  return (
    <group>
      {enemies.filter(enemy => enemy.alive).map(enemy => (
        <Enemy
          key={enemy.id}
          {...enemy}
          playerPosition={playerPosition}
          onDestroy={(id) => {
            setEnemies(prev => prev.map(e => 
              e.id === id ? { ...e, alive: false } : e
            ));
            playSound('hit');
          }}
        />
      ))}
    </group>
  );
}

function Enemy({ id, position, type, health, playerPosition, onDestroy }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const [currentHealth, setCurrentHealth] = useState(health);

  const color = type === 'heavy' ? '#8b0000' : '#ff4444';
  const size = type === 'heavy' ? 0.8 : 0.6;
  const speed = type === 'heavy' ? 1 : 2;

  // IA básica - perseguir al jugador
  useFrame(() => {
    if (!rigidBodyRef.current || !playerPosition) return;

    const currentPos = rigidBodyRef.current.translation();
    const direction = {
      x: playerPosition.x - currentPos.x,
      z: playerPosition.z - currentPos.z
    };

    const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    
    if (distance > 1) {
      const normalizedDirection = {
        x: direction.x / distance,
        z: direction.z / distance
      };

      rigidBodyRef.current.setLinvel({
        x: normalizedDirection.x * speed,
        y: rigidBodyRef.current.linvel().y,
        z: normalizedDirection.z * speed
      });
    }
  });

  const takeDamage = useCallback((damage) => {
    setCurrentHealth(prev => {
      const newHealth = prev - damage;
      if (newHealth <= 0) {
        onDestroy(id);
      }
      return newHealth;
    });
  }, [id, onDestroy]);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      userData={{ type: 'enemy', takeDamage }}
    >
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}