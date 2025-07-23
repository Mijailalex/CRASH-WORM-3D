/* ============================================================================ */
/* 🎮 CRASH WORM 3D - COMPONENTE DEL JUGADOR */
/* ============================================================================ */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/context/GameContext';
import { gameConfig } from '@/data/gameConfig';
import useAudioManager from '@/hooks/useAudioManager';

// ========================================
// 🏃‍♂️ COMPONENTE PRINCIPAL DEL JUGADOR
// ========================================

export function Player({ position = [0, 2, 0], onCollision }) {
  const playerRef = useRef();
  const meshRef = useRef();
  const cameraTargetRef = useRef(new THREE.Vector3());

  const { state, actions, utils } = useGame();
  const { playSound } = useAudioManager();

  const [isGrounded, setIsGrounded] = useState(false);
  const [jumpCount, setJumpCount] = useState(0);
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [animationState, setAnimationState] = useState('idle');
  const [isInvulnerable, setIsInvulnerable] = useState(false);

  // Configuración del jugador
  const config = gameConfig.player;
  const controlConfig = gameConfig.controls.keyboard;

  // ========================================
  // 🎮 CONTROLES DEL JUGADOR
  // ========================================

  const [subscribeKeys, getKeys] = useKeyboardControls();

  // Configurar controles
  useEffect(() => {
    const unsubscribeJump = subscribeKeys(
      (state) => state.jump,
      (pressed) => {
        if (pressed && (isGrounded || jumpCount < config.maxJumps)) {
          jump();
        }
      }
    );

    return () => {
      unsubscribeJump();
    };
  }, [isGrounded, jumpCount, subscribeKeys]);

  // ========================================
  // 🏃‍♂️ LÓGICA DE MOVIMIENTO
  // ========================================

  const jump = useCallback(() => {
    if (!playerRef.current) return;

    const impulse = { x: 0, y: config.jumpForce, z: 0 };
    playerRef.current.applyImpulse(impulse, true);

    setJumpCount(prev => prev + 1);
    setAnimationState('jumping');

    playSound('jump', { volume: 0.6, rate: 1 + Math.random() * 0.2 });

    // Reset animation after jump
    setTimeout(() => {
      if (isGrounded) {
        setAnimationState('idle');
      }
    }, 300);
  }, [config.jumpForce, isGrounded, playSound]);

  const move = useCallback((direction, deltaTime) => {
    if (!playerRef.current) return;

    const force = config.speed * deltaTime * 60; // Normalize for 60fps
    const impulse = { x: direction * force, y: 0, z: 0 };

    playerRef.current.applyImpulse(impulse, true);

    // Update animation
    if (direction !== 0 && isGrounded) {
      setAnimationState('running');
    } else if (isGrounded) {
      setAnimationState('idle');
    }
  }, [config.speed, isGrounded]);

  // ========================================
  // 🔄 GAME LOOP
  // ========================================

  useFrame((state, deltaTime) => {
    if (!playerRef.current || !utils.isPlaying) return;

    const { forward, backward, left, right, jump } = getKeys();

    // Calcular dirección de movimiento
    let moveDirection = 0;
    if (left) moveDirection -= 1;
    if (right) moveDirection += 1;

    // Aplicar movimiento
    if (moveDirection !== 0) {
      move(moveDirection, deltaTime);
    }

    // Actualizar velocidad actual
    const currentVel = playerRef.current.linvel();
    setVelocity({ x: currentVel.x, y: currentVel.y, z: currentVel.z });

    // Limitar velocidad máxima
    if (Math.abs(currentVel.x) > config.speed) {
      const clampedVelX = Math.sign(currentVel.x) * config.speed;
      playerRef.current.setLinvel({ x: clampedVelX, y: currentVel.y, z: currentVel.z }, true);
    }

    // Aplicar fricción cuando no hay input
    if (moveDirection === 0 && isGrounded) {
      const friction = config.friction;
      playerRef.current.setLinvel({
        x: currentVel.x * friction,
        y: currentVel.y,
        z: currentVel.z * friction
      }, true);
    }

    // Rotar el mesh basado en la dirección
    if (meshRef.current && moveDirection !== 0) {
      const targetRotation = moveDirection > 0 ? 0 : Math.PI;
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotation,
        deltaTime * 10
      );
    }

    // Actualizar posición del target de la cámara
    const playerPosition = playerRef.current.translation();
    cameraTargetRef.current.set(
      playerPosition.x,
      playerPosition.y + 2,
      playerPosition.z + 5
    );

    // Actualizar estado del juego con la posición del jugador
    actions.updateTime(state.clock.elapsedTime);
  });

  // ========================================
  // 💥 MANEJO DE COLISIONES
  // ========================================

  const handleCollisionEnter = useCallback((event) => {
    const { other } = event;

    // Detectar suelo
    if (other.rigidBodyObject?.userData?.type === 'ground' ||
        other.rigidBodyObject?.userData?.type === 'platform') {
      setIsGrounded(true);
      setJumpCount(0);

      if (animationState === 'jumping') {
        setAnimationState('idle');
      }
    }

    // Detectar coleccionables
    if (other.rigidBodyObject?.userData?.type === 'collectible') {
      const collectibleData = other.rigidBodyObject.userData;

      actions.updateScore(collectibleData.points || 10);
      actions.addCollectible();

      playSound('collect', { volume: 0.7 });

      if (onCollision) {
        onCollision('collectible', collectibleData);
      }
    }

    // Detectar enemigos
    if (other.rigidBodyObject?.userData?.type === 'enemy') {
      if (!isInvulnerable) {
        takeDamage(other.rigidBodyObject.userData.damage || 10);
      }
    }

    // Detectar power-ups
    if (other.rigidBodyObject?.userData?.type === 'powerup') {
      const powerupData = other.rigidBodyObject.userData;
      applyPowerup(powerupData);

      if (onCollision) {
        onCollision('powerup', powerupData);
      }
    }

    // Detectar límites del mundo
    if (other.rigidBodyObject?.userData?.type === 'worldBounds') {
      // Respawn del jugador
      respawnPlayer();
    }

  }, [animationState, isInvulnerable, actions, playSound, onCollision]);

  const handleCollisionExit = useCallback((event) => {
    const { other } = event;

    // Salir del suelo
    if (other.rigidBodyObject?.userData?.type === 'ground' ||
        other.rigidBodyObject?.userData?.type === 'platform') {

      // Delay para evitar false positives
      setTimeout(() => {
        if (playerRef.current) {
          const vel = playerRef.current.linvel();
          if (vel.y < -0.1) { // Cayendo
            setIsGrounded(false);
            setAnimationState('falling');
          }
        }
      }, 50);
    }
  }, []);

  // ========================================
  // 💔 SISTEMA DE VIDA
  // ========================================

  const takeDamage = useCallback((damage) => {
    if (isInvulnerable) return;

    actions.updateHealth(-damage);
    setIsInvulnerable(true);

    playSound('damage', { volume: 0.8 });

    // Aplicar knockback
    if (playerRef.current) {
      const knockback = { x: -velocity.x * 2, y: 5, z: 0 };
      playerRef.current.applyImpulse(knockback, true);
    }

    // Período de invulnerabilidad
    setTimeout(() => {
      setIsInvulnerable(false);
    }, config.invulnerabilityTime);

    // Verificar game over
    if (state.health <= damage) {
      actions.updateLives(-1);

      if (state.lives <= 1) {
        actions.gameOver();
      } else {
        respawnPlayer();
      }
    }
  }, [isInvulnerable, actions, playSound, velocity, config.invulnerabilityTime, state.health, state.lives]);

  const applyPowerup = useCallback((powerupData) => {
    switch (powerupData.powerupType) {
      case 'health':
        actions.updateHealth(powerupData.amount || 25);
        playSound('collect', { volume: 0.8, rate: 1.2 });
        break;

      case 'speed':
        // Implementar speed boost temporal
        playSound('collect', { volume: 0.8, rate: 1.5 });
        break;

      case 'jump':
        // Implementar jump boost temporal
        playSound('collect', { volume: 0.8, rate: 0.8 });
        break;

      case 'invincible':
        setIsInvulnerable(true);
        setTimeout(() => setIsInvulnerable(false), 5000);
        playSound('collect', { volume: 1.0, rate: 2.0 });
        break;
    }
  }, [actions, playSound]);

  const respawnPlayer = useCallback(() => {
    if (!playerRef.current) return;

    // Reset position
    playerRef.current.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
    playerRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    playerRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // Reset state
    setIsGrounded(false);
    setJumpCount(0);
    setAnimationState('idle');
    setIsInvulnerable(true);

    // Brief invulnerability after respawn
    setTimeout(() => {
      setIsInvulnerable(false);
    }, 2000);
  }, [position]);

  // ========================================
  // 🎨 RENDER DEL JUGADOR
  // ========================================

  return (
    <RigidBody
      ref={playerRef}
      position={position}
      type="dynamic"
      colliders={false}
      mass={config.mass}
      lockRotations
      onCollisionEnter={handleCollisionEnter}
      onCollisionExit={handleCollisionExit}
      userData={{ type: 'player' }}
    >
      {/* Collider del jugador */}
      <CapsuleCollider args={[config.size.height / 2 - 0.2, 0.4]} />

      {/* Mesh visual del jugador */}
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.4, config.size.height - 0.8]} />
          <meshStandardMaterial
            color={isInvulnerable ? '#ff6666' : '#00ffff'}
            transparent={isInvulnerable}
            opacity={isInvulnerable ? 0.7 : 1.0}
            emissive={isInvulnerable ? '#ff3333' : '#003333'}
            emissiveIntensity={isInvulnerable ? 0.3 : 0.1}
          />
        </mesh>

        {/* Ojos del jugador */}
        <mesh position={[0, 0.3, 0.35]} castShadow>
          <sphereGeometry args={[0.05]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.1, 0.3, 0.35]} castShadow>
          <sphereGeometry args={[0.03]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.1, 0.3, 0.35]} castShadow>
          <sphereGeometry args={[0.03]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Efectos visuales */}
        {isInvulnerable && (
          <mesh>
            <sphereGeometry args={[0.6]} />
            <meshBasicMaterial
              color="#ffff00"
              transparent
              opacity={0.2}
              wireframe
            />
          </mesh>
        )}

        {/* Indicador de velocidad */}
        {Math.abs(velocity.x) > 1 && (
          <group>
            {[...Array(3)].map((_, i) => (
              <mesh
                key={i}
                position={[-0.8 - i * 0.2, 0, 0]}
                rotation={[0, 0, Math.PI / 4]}
              >
                <planeGeometry args={[0.1, 0.05]} />
                <meshBasicMaterial
                  color="#00ffff"
                  transparent
                  opacity={0.8 - i * 0.2}
                />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* Partículas de aterrizaje */}
      {isGrounded && Math.abs(velocity.y) > 2 && (
        <LandingParticles />
      )}
    </RigidBody>
  );
}

// ========================================
// ✨ COMPONENTE DE PARTÍCULAS DE ATERRIZAJE
// ========================================

function LandingParticles() {
  const particles = useRef();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useFrame((state, deltaTime) => {
    if (particles.current && show) {
      particles.current.rotation.y += deltaTime * 2;
    }
  });

  if (!show) return null;

  return (
    <group ref={particles} position={[0, -0.8, 0]}>
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 0.3;
        const z = Math.sin(angle) * 0.3;

        return (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.02]} />
            <meshBasicMaterial
              color="#8899aa"
              transparent
              opacity={0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ========================================
// 🎮 CONTROLES DE TECLADO
// ========================================

export function PlayerControls() {
  return (
    <KeyboardControls
      map={[
        { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
        { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
        { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
        { name: 'right', keys: ['ArrowRight', 'KeyD'] },
        { name: 'jump', keys: ['Space'] },
        { name: 'run', keys: ['Shift'] },
      ]}
    >
      {/* Los controles se manejan dentro del componente Player */}
    </KeyboardControls>
  );
}

export default Player;
