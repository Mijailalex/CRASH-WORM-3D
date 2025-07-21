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
// COMPONENTE PLAYER
// Ubicación: src/components/Player.jsx
// ========================================

export function Player({ position = [0, 5, 0] }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const { state, actions } = useGame();
  const { playSound } = useAudioManager();
  const [isGrounded, setIsGrounded] = useState(false);
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });

  const jumpForce = 8;
  const moveSpeed = 5;

  // Controles del jugador
  useEffect(() => {
    const keys = {};
    
    const handleKeyDown = (event) => {
      keys[event.code] = true;
      
      // Salto
      if (event.code === 'Space' && isGrounded) {
        rigidBodyRef.current?.applyImpulse({ x: 0, y: jumpForce, z: 0 });
        playSound('jump');
        setIsGrounded(false);
      }
    };

    const handleKeyUp = (event) => {
      keys[event.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGrounded, playSound]);

  // Movimiento del jugador
  useFrame(() => {
    if (!rigidBodyRef.current) return;

    const keys = {};
    // Obtener estado actual de las teclas
    if (window.pressedKeys) {
      Object.assign(keys, window.pressedKeys);
    }

    const currentVel = rigidBodyRef.current.linvel();
    let newVelX = currentVel.x;
    let newVelZ = currentVel.z;

    // Movimiento horizontal
    if (keys['KeyA'] || keys['ArrowLeft']) {
      newVelX = -moveSpeed;
    } else if (keys['KeyD'] || keys['ArrowRight']) {
      newVelX = moveSpeed;
    } else {
      newVelX *= 0.9; // Fricción
    }

    // Movimiento frontal
    if (keys['KeyW'] || keys['ArrowUp']) {
      newVelZ = -moveSpeed;
    } else if (keys['KeyS'] || keys['ArrowDown']) {
      newVelZ = moveSpeed;
    } else {
      newVelZ *= 0.9; // Fricción
    }

    rigidBodyRef.current.setLinvel({
      x: newVelX,
      y: currentVel.y,
      z: newVelZ
    });

    // Actualizar posición en el contexto
    const pos = rigidBodyRef.current.translation();
    actions.updatePlayerPosition(pos);
  });

  // Detección de colisiones
  const handleCollision = useCallback((event) => {
    if (event.other.rigidBodyObject) {
      const otherBody = event.other.rigidBodyObject;
      
      // Detectar suelo
      if (otherBody.userData?.type === 'ground' || otherBody.userData?.type === 'platform') {
        setIsGrounded(true);
      }
      
      // Detectar colectibles
      if (otherBody.userData?.type === 'collectible') {
        playSound('collect');
        actions.collectItem(otherBody.userData.item);
      }
      
      // Detectar enemigos
      if (otherBody.userData?.type === 'enemy') {
        playSound('hit');
        actions.takeDamage(10);
      }
    }
  }, [playSound, actions]);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      enabledRotations={[false, true, false]}
      onCollisionEnter={handleCollision}
    >
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#4a90e2" />
      </mesh>
    </RigidBody>
  );
}