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
// COMPONENTE PARTICLE EFFECTS
// Ubicación: src/components/ParticleEffects.jsx
// ========================================

export function ParticleEffects({ effects = [] }) {
  return (
    <group>
      {effects.map((effect, index) => (
        <ParticleSystem key={`${effect.type}-${index}`} {...effect} />
      ))}
    </group>
  );
}

function ParticleSystem({ type, position, count = 100, color = '#ffffff' }) {
  const pointsRef = useRef();
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles = [];
      
      for (let i = 0; i < count; i++) {
        newParticles.push({
          position: [
            position[0] + (Math.random() - 0.5) * 2,
            position[1] + (Math.random() - 0.5) * 2,
            position[2] + (Math.random() - 0.5) * 2
          ],
          velocity: [
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.1,
            (Math.random() - 0.5) * 0.1
          ],
          life: 1.0,
          decay: Math.random() * 0.02 + 0.01
        });
      }
      
      setParticles(newParticles);
    };

    generateParticles();
  }, [count, position]);

  useFrame(() => {
    setParticles(prev => prev.map(particle => ({
      ...particle,
      position: [
        particle.position[0] + particle.velocity[0],
        particle.position[1] + particle.velocity[1],
        particle.position[2] + particle.velocity[2]
      ],
      life: Math.max(0, particle.life - particle.decay)
    })).filter(p => p.life > 0));
  });

  return (
    <group>
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.position}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial 
            color={color} 
            opacity={particle.life} 
            transparent 
          />
        </mesh>
      ))}
    </group>
  );
}