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
          health: Math.random() > 0.7 ? 60 : 30,
          speed: Math.random() * 2 + 1
        });
      }

      setEnemies(newEnemies);
    };

    generateEnemies();
  }, [level]);

  return (
    <group>
      {enemies.map(enemy => (
        <Enemy
          key={enemy.id}
          {...enemy}
          playerPosition={playerPosition}
          onDestroy={(id) => {
            setEnemies(prev => prev.filter(e => e.id !== id));
            playSound('hit');
          }}
        />
      ))}
    </group>
  );
}

function Enemy({ id, position, type, health, speed, playerPosition, onDestroy }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const [currentHealth, setCurrentHealth] = useState(health);
  const [isAlive, setIsAlive] = useState(true);

  // IA básica del enemigo
  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !isAlive) return;

    const currentPos = rigidBodyRef.current.translation();
    const distanceToPlayer = Math.sqrt(
      Math.pow(playerPosition.x - currentPos.x, 2) +
      Math.pow(playerPosition.z - currentPos.z, 2)
    );

    // Perseguir al jugador si está cerca
    if (distanceToPlayer < 20) {
      const directionX = (playerPosition.x - currentPos.x) / distanceToPlayer;
      const directionZ = (playerPosition.z - currentPos.z) / distanceToPlayer;
      
      rigidBodyRef.current.setLinvel({
        x: directionX * speed,
        y: rigidBodyRef.current.linvel().y,
        z: directionZ * speed
      });
    }
  });

  // Manejar daño
  const takeDamage = useCallback((damage) => {
    const newHealth = currentHealth - damage;
    setCurrentHealth(newHealth);
    
    if (newHealth <= 0) {
      setIsAlive(false);
      setTimeout(() => onDestroy(id), 100);
    }
  }, [currentHealth, id, onDestroy]);

  if (!isAlive) return null;

  const enemyColor = type === 'heavy' ? '#8b0000' : '#ff4444';
  const enemySize = type === 'heavy' ? [1.5, 1.5, 1.5] : [1, 1, 1];

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      colliders="cuboid"
      mass={type === 'heavy' ? 2 : 1}
    >
      <Box ref={meshRef} args={enemySize} castShadow receiveShadow>
        <meshStandardMaterial 
          color={enemyColor}
          roughness={0.4}
          metalness={0.2}
        />
      </Box>
      
      {/* Barra de vida */}
      <group position={[0, 1, 0]}>
        <Box args={[1.2, 0.1, 0.1]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#ff0000" />
        </Box>
        <Box 
          args={[(currentHealth / health) * 1.2, 0.1, 0.1]} 
          position={[-(1.2 - (currentHealth / health) * 1.2) / 2, 0, 0.01]}
        >
          <meshBasicMaterial color="#00ff00" />
        </Box>
      </group>
    </RigidBody>
  );
}