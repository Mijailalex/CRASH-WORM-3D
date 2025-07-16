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
// ========================================

export function Player({ position = [0, 5, 0], onPositionChange }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const { state, actions } = useGame();
  const { playSound } = useAudioManager();
  
  const [playerState, setPlayerState] = useState({
    isJumping: false,
    isMoving: false,
    facingDirection: 1,
    animationState: 'idle'
  });

  // Animación del jugador
  const { scale, rotation } = useSpring({
    scale: playerState.isJumping ? [1.2, 0.8, 1.2] : [1, 1, 1],
    rotation: [0, playerState.facingDirection > 0 ? 0 : Math.PI, 0],
    config: { tension: 300, friction: 30 }
  });

  // Control del jugador
  useFrame((_, delta) => {
    if (!rigidBodyRef.current) return;

    const velocity = rigidBodyRef.current.linvel();
    const currentPos = rigidBodyRef.current.translation();

    // Detectar input (esto se conectaría con el InputSystem)
    const keys = {}; // En el proyecto real, esto vendría del InputSystem
    
    // Movimiento horizontal
    let moveX = 0;
    let moveZ = 0;
    
    if (keys.KeyA || keys.ArrowLeft) moveX = -1;
    if (keys.KeyD || keys.ArrowRight) moveX = 1;
    if (keys.KeyW || keys.ArrowUp) moveZ = -1;
    if (keys.KeyS || keys.ArrowDown) moveZ = 1;

    // Aplicar movimiento
    if (moveX !== 0 || moveZ !== 0) {
      const speed = 8;
      rigidBodyRef.current.setLinvel({
        x: moveX * speed,
        y: velocity.y,
        z: moveZ * speed
      });
      
      setPlayerState(prev => ({
        ...prev,
        isMoving: true,
        facingDirection: moveX !== 0 ? moveX : prev.facingDirection
      }));
    } else {
      rigidBodyRef.current.setLinvel({
        x: velocity.x * 0.8,
        y: velocity.y,
        z: velocity.z * 0.8
      });
      
      setPlayerState(prev => ({ ...prev, isMoving: false }));
    }

    // Salto
    if (keys.Space && Math.abs(velocity.y) < 0.1) {
      rigidBodyRef.current.setLinvel({
        x: velocity.x,
        y: 12,
        z: velocity.z
      });
      
      setPlayerState(prev => ({ ...prev, isJumping: true }));
      playSound('jump');
    }

    // Detectar aterrizaje
    if (playerState.isJumping && Math.abs(velocity.y) < 0.1) {
      setPlayerState(prev => ({ ...prev, isJumping: false }));
    }

    // Actualizar posición del jugador en el estado global
    actions.updatePlayerPosition({
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z
    });

    onPositionChange?.(currentPos);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      colliders="cuboid"
      mass={1}
      friction={0.8}
    >
      <animated.group scale={scale} rotation={rotation}>
        <Box ref={meshRef} args={[1, 1.5, 1]} castShadow receiveShadow>
          <meshStandardMaterial 
            color="#ff6b35"
            roughness={0.3}
            metalness={0.1}
          />
        </Box>
        
        {/* Ojos del jugador */}
        <Sphere position={[-0.2, 0.3, 0.45]} args={[0.1]} castShadow>
          <meshStandardMaterial color="#ffffff" />
        </Sphere>
        <Sphere position={[0.2, 0.3, 0.45]} args={[0.1]} castShadow>
          <meshStandardMaterial color="#ffffff" />
        </Sphere>
        
        {/* Pupilas */}
        <Sphere position={[-0.2, 0.3, 0.5]} args={[0.05]} castShadow>
          <meshStandardMaterial color="#000000" />
        </Sphere>
        <Sphere position={[0.2, 0.3, 0.5]} args={[0.05]} castShadow>
          <meshStandardMaterial color="#000000" />
        </Sphere>
      </animated.group>
    </RigidBody>
  );
}
