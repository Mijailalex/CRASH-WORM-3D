/* ============================================================================ */
/* 🎮 CRASH WORM 3D - COMPONENTE DEL JUGADOR */
/* ============================================================================ */
/* Ubicación: src/components/Player.jsx */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls, useGamepadControls } from '@react-three/drei';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameContext } from '../context/GameContext';
import { useAudioManager } from '../hooks/useAudioManager';
import { gameConfig } from '../data/gameConfig';
import { MathUtils, VectorUtils, GameUtils } from '../utils/gameUtils';

// ========================================
// 🎮 COMPONENTE PRINCIPAL DEL JUGADOR
// ========================================

export function Player({ position = [0, 1, 0], onPositionChange, ...props }) {
  // Refs para Three.js objects
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const groupRef = useRef();

  // Refs para lógica del juego
  const velocityRef = useRef(new THREE.Vector3());
  const isGroundedRef = useRef(false);
  const jumpTimeRef = useRef(0);
  const lastGroundTimeRef = useRef(0);
  const inputBufferRef = useRef({ jump: 0 });

  // State local
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [animationState, setAnimationState] = useState('idle');

  // Hooks del contexto
  const { player, settings, updatePlayer, takeDamage, addScore } = useGameContext();
  const { playSound } = useAudioManager();
  const { camera, scene } = useThree();

  // Configuración del player
  const config = gameConfig.player;

  // ========================================
  // 🎯 INPUT HANDLING
  // ========================================

  const [, getKeys] = useKeyboardControls();

  const getInputVector = useCallback(() => {
    const keys = getKeys();
    const inputVector = new THREE.Vector3();

    // Keyboard input
    if (keys.moveForward) inputVector.z -= 1;
    if (keys.moveBackward) inputVector.z += 1;
    if (keys.moveLeft) inputVector.x -= 1;
    if (keys.moveRight) inputVector.x += 1;

    // Normalize diagonal movement
    if (inputVector.length() > 0) {
      inputVector.normalize();
    }

    return inputVector;
  }, [getKeys]);

  const handleJumpInput = useCallback(() => {
    const keys = getKeys();
    const now = Date.now();

    if (keys.jump) {
      inputBufferRef.current.jump = now;
    }

    // Check for jump execution
    const jumpBufferTime = now - inputBufferRef.current.jump;
    const coyoteTime = now - lastGroundTimeRef.current;

    if (jumpBufferTime < config.movement.jumpBuffering * 1000 &&
        (isGroundedRef.current || coyoteTime < config.movement.coyoteTime * 1000)) {
      executeJump();
      inputBufferRef.current.jump = 0; // Clear buffer
    }
  }, [getKeys, config]);

  // ========================================
  // 🏃‍♂️ MOVEMENT LOGIC
  // ========================================

  const executeJump = useCallback(() => {
    if (!rigidBodyRef.current) return;

    const now = Date.now();
    if (now - jumpTimeRef.current < 200) return; // Prevent double jumps

    jumpTimeRef.current = now;
    setIsJumping(true);

    // Apply jump force
    const jumpForce = Math.sqrt(2 * Math.abs(config.movement.gravity) * config.movement.jumpHeight);
    rigidBodyRef.current.setLinvel({ x: 0, y: jumpForce, z: 0 }, true);

    // Play jump sound
    playSound('jump', { volume: settings.audio.sfxVolume });

    // Reset jumping state after animation
    setTimeout(() => setIsJumping(false), 500);
  }, [config, playSound, settings]);

  const updateMovement = useCallback((delta) => {
    if (!rigidBodyRef.current || !meshRef.current) return;

    const inputVector = getInputVector();
    const keys = getKeys();
    const isRunningInput = keys.run;

    // Update running state
    setIsRunning(isRunningInput && inputVector.length() > 0);
    setIsMoving(inputVector.length() > 0);

    // Calculate movement speed
    const baseSpeed = isRunningInput ? config.movement.runSpeed : config.movement.walkSpeed;
    const currentSpeed = isGroundedRef.current ? baseSpeed : baseSpeed * config.movement.airControl;

    // Apply camera-relative movement
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(camera.up, cameraDirection).normalize();

    // Calculate movement direction
    const moveDirection = new THREE.Vector3();
    moveDirection.addScaledVector(cameraDirection, -inputVector.z);
    moveDirection.addScaledVector(cameraRight, inputVector.x);
    moveDirection.normalize();

    // Apply movement with acceleration/deceleration
    const targetVelocity = moveDirection.multiplyScalar(currentSpeed);
    const currentVelocity = rigidBodyRef.current.linvel();

    const acceleration = inputVector.length() > 0 ? config.movement.acceleration : config.movement.deceleration;

    const newVelocityX = MathUtils.lerp(currentVelocity.x, targetVelocity.x, acceleration * delta);
    const newVelocityZ = MathUtils.lerp(currentVelocity.z, targetVelocity.z, acceleration * delta);

    rigidBodyRef.current.setLinvel({
      x: newVelocityX,
      y: currentVelocity.y,
      z: newVelocityZ
    }, true);

    // Update player rotation to face movement direction
    if (inputVector.length() > 0) {
      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      const currentRotation = meshRef.current.rotation.y;
      const newRotation = MathUtils.lerp(currentRotation, targetRotation, 10 * delta);
      meshRef.current.rotation.y = newRotation;
    }

    // Handle jump input
    handleJumpInput();

  }, [getInputVector, getKeys, camera, config, handleJumpInput]);

  // ========================================
  // 🔄 COLLISION DETECTION
  // ========================================

  const checkGrounded = useCallback(() => {
    if (!rigidBodyRef.current) return;

    const position = rigidBodyRef.current.translation();
    const velocity = rigidBodyRef.current.linvel();

    // Simple ground check - could be improved with raycasting
    const wasGrounded = isGroundedRef.current;
    isGroundedRef.current = position.y <= 1.1 && Math.abs(velocity.y) < 0.1;

    if (isGroundedRef.current && !wasGrounded) {
      // Just landed
      lastGroundTimeRef.current = Date.now();
      playSound('land', { volume: settings.audio.sfxVolume * 0.5 });
    } else if (!isGroundedRef.current && wasGrounded) {
      // Just left ground
      lastGroundTimeRef.current = Date.now();
    }
  }, [playSound, settings]);

  // ========================================
  // 🎨 ANIMATION SYSTEM
  // ========================================

  const updateAnimation = useCallback(() => {
    let newState = 'idle';

    if (isJumping || !isGroundedRef.current) {
      newState = 'jumping';
    } else if (isRunning) {
      newState = 'running';
    } else if (isMoving) {
      newState = 'walking';
    }

    if (newState !== animationState) {
      setAnimationState(newState);
    }
  }, [isJumping, isRunning, isMoving, animationState]);

  // ========================================
  // 📹 CAMERA FOLLOW
  // ========================================

  const updateCamera = useCallback((delta) => {
    if (!meshRef.current) return;

    const playerPosition = meshRef.current.position;
    const targetPosition = new THREE.Vector3(
      playerPosition.x + config.camera.followOffset.x,
      playerPosition.y + config.camera.followOffset.y,
      playerPosition.z + config.camera.followOffset.z
    );

    // Smooth camera follow
    camera.position.lerp(targetPosition, config.camera.followSpeed * delta);

    // Look ahead based on player velocity
    const velocity = rigidBodyRef.current?.linvel() || { x: 0, y: 0, z: 0 };
    const lookAheadOffset = new THREE.Vector3(
      velocity.x * config.camera.lookAhead,
      0,
      velocity.z * config.camera.lookAhead
    );

    const lookAtTarget = playerPosition.clone().add(lookAheadOffset);
    camera.lookAt(lookAtTarget);

  }, [camera, config]);

  // ========================================
  // 🔄 FRAME UPDATE
  // ========================================

  useFrame((state, delta) => {
    checkGrounded();
    updateMovement(delta);
    updateAnimation();
    updateCamera(delta);

    // Update position in context
    if (meshRef.current && onPositionChange) {
      const pos = meshRef.current.position;
      onPositionChange({ x: pos.x, y: pos.y, z: pos.z });
    }
  });

  // ========================================
  // 💥 COLLISION EVENTS
  // ========================================

  const handleCollisionEnter = useCallback((event) => {
    const { other } = event;

    // Check collision with different object types
    if (other.rigidBodyObject?.userData?.type) {
      const objectType = other.rigidBodyObject.userData.type;

      switch (objectType) {
        case 'collectible':
          handleCollectibleCollision(other.rigidBodyObject.userData);
          break;
        case 'enemy':
          handleEnemyCollision(other.rigidBodyObject.userData);
          break;
        case 'powerup':
          handlePowerUpCollision(other.rigidBodyObject.userData);
          break;
        case 'hazard':
          handleHazardCollision(other.rigidBodyObject.userData);
          break;
        default:
          break;
      }
    }
  }, []);

  const handleCollectibleCollision = useCallback((collectibleData) => {
    playSound('collect', { volume: settings.audio.sfxVolume });
    addScore(collectibleData.value || 10);

    // Remove collectible from scene
    if (collectibleData.onCollect) {
      collectibleData.onCollect();
    }
  }, [playSound, settings, addScore]);

  const handleEnemyCollision = useCallback((enemyData) => {
    if (player.invincible) return;

    const damage = enemyData.damage || 10;
    takeDamage(damage);

    playSound('hurt', { volume: settings.audio.sfxVolume });

    // Apply knockback
    if (rigidBodyRef.current && enemyData.position) {
      const knockbackDirection = new THREE.Vector3()
        .subVectors(meshRef.current.position, enemyData.position)
        .normalize();

      const knockbackForce = 5;
      rigidBodyRef.current.applyImpulse({
        x: knockbackDirection.x * knockbackForce,
        y: 2,
        z: knockbackDirection.z * knockbackForce
      }, true);
    }
  }, [player.invincible, takeDamage, playSound, settings]);

  const handlePowerUpCollision = useCallback((powerUpData) => {
    playSound('powerup', { volume: settings.audio.sfxVolume });

    // Apply power-up effect
    if (powerUpData.onCollect) {
      powerUpData.onCollect();
    }
  }, [playSound, settings]);

  const handleHazardCollision = useCallback((hazardData) => {
    const damage = hazardData.damage || 25;
    takeDamage(damage);

    playSound('hurt', { volume: settings.audio.sfxVolume });
  }, [takeDamage, playSound, settings]);

  // ========================================
  // 🎨 RENDER
  // ========================================

  return (
    <group ref={groupRef} {...props}>
      <RigidBody
        ref={rigidBodyRef}
        position={position}
        type="dynamic"
        colliders={false}
        mass={config.physics.mass}
        linearDamping={config.physics.linearDamping}
        angularDamping={config.physics.angularDamping}
        restitution={config.physics.restitution}
        friction={config.physics.friction}
        onCollisionEnter={handleCollisionEnter}
        userData={{ type: 'player' }}
      >
        <CapsuleCollider args={[0.5, 0.5]} />

        <group ref={meshRef}>
          {/* Player Model */}
          <PlayerModel
            animationState={animationState}
            isGrounded={isGroundedRef.current}
            health={player.health}
          />

          {/* Player Effects */}
          <PlayerEffects
            isRunning={isRunning}
            isJumping={isJumping}
            powerUps={player.powerUps}
          />
        </group>
      </RigidBody>
    </group>
  );
}

// ========================================
// 🎭 COMPONENTE DEL MODELO DEL JUGADOR
// ========================================

function PlayerModel({ animationState, isGrounded, health }) {
  const meshRef = useRef();
  const materialRef = useRef();

  // Animation states
  const animations = {
    idle: { scale: [1, 1, 1], bobSpeed: 1, bobAmount: 0.02 },
    walking: { scale: [1, 1.05, 1], bobSpeed: 4, bobAmount: 0.1 },
    running: { scale: [1, 1.1, 1], bobSpeed: 8, bobAmount: 0.15 },
    jumping: { scale: [1, 1.2, 1], bobSpeed: 0, bobAmount: 0 }
  };

  const currentAnim = animations[animationState] || animations.idle;

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // Bobbing animation
    const bobOffset = Math.sin(time * currentAnim.bobSpeed) * currentAnim.bobAmount;
    meshRef.current.position.y = bobOffset;

    // Scale animation
    meshRef.current.scale.set(...currentAnim.scale);

    // Health-based color change
    const healthPercent = health / 100;
    const color = new THREE.Color();
    if (healthPercent > 0.6) {
      color.setHex(gameConfig.graphics.materials.playerMaterial.color);
    } else if (healthPercent > 0.3) {
      color.setHex(0xffaa00); // Orange
    } else {
      color.setHex(0xff4400); // Red
    }
    materialRef.current.color = color;

    // Invincibility flashing
    if (health <= 0) {
      materialRef.current.opacity = 0.5 + 0.5 * Math.sin(time * 10);
    } else {
      materialRef.current.opacity = 1;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <capsuleGeometry args={[0.5, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color={gameConfig.graphics.materials.playerMaterial.color}
        metalness={gameConfig.graphics.materials.playerMaterial.metalness}
        roughness={gameConfig.graphics.materials.playerMaterial.roughness}
        emissive={gameConfig.graphics.materials.playerMaterial.emissive}
        transparent
      />
    </mesh>
  );
}

// ========================================
// ✨ COMPONENTE DE EFECTOS DEL JUGADOR
// ========================================

function PlayerEffects({ isRunning, isJumping, powerUps }) {
  return (
    <>
      {/* Running dust particles */}
      {isRunning && (
        <group position={[0, -0.9, 0]}>
          <RunningDustEffect />
        </group>
      )}

      {/* Jump trail effect */}
      {isJumping && (
        <JumpTrailEffect />
      )}

      {/* Power-up effects */}
      {powerUps.map((powerUp, index) => (
        <PowerUpEffect key={powerUp.id || index} powerUp={powerUp} />
      ))}
    </>
  );
}

// ========================================
// 💨 EFECTO DE POLVO AL CORRER
// ========================================

function RunningDustEffect() {
  const particlesRef = useRef();
  const particleCount = 20;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const lifetimes = new Float32Array(particleCount);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const time = state.clock.elapsedTime;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Update particle lifetime
      lifetimes[i] -= delta;

      if (lifetimes[i] <= 0) {
        // Reset particle
        positions[i3] = MathUtils.randomFloat(-0.3, 0.3);
        positions[i3 + 1] = 0;
        positions[i3 + 2] = MathUtils.randomFloat(-0.2, 0.2);

        velocities[i3] = MathUtils.randomFloat(-1, 1);
        velocities[i3 + 1] = MathUtils.randomFloat(0.5, 2);
        velocities[i3 + 2] = MathUtils.randomFloat(-1, 1);

        lifetimes[i] = MathUtils.randomFloat(0.5, 1.5);
      } else {
        // Update particle position
        positions[i3] += velocities[i3] * delta;
        positions[i3 + 1] += velocities[i3 + 1] * delta;
        positions[i3 + 2] += velocities[i3 + 2] * delta;

        // Apply gravity
        velocities[i3 + 1] -= 2 * delta;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  useEffect(() => {
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = MathUtils.randomFloat(-0.3, 0.3);
      positions[i3 + 1] = 0;
      positions[i3 + 2] = MathUtils.randomFloat(-0.2, 0.2);
      lifetimes[i] = MathUtils.randomFloat(0, 1.5);
    }
  }, []);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={0x8B4513}
        transparent
        opacity={0.6}
      />
    </points>
  );
}

// ========================================
// 🌟 EFECTO DE TRAIL AL SALTAR
// ========================================

function JumpTrailEffect() {
  const trailRef = useRef();

  useFrame((state) => {
    if (!trailRef.current) return;

    const time = state.clock.elapsedTime;
    trailRef.current.material.opacity = 0.5 + 0.3 * Math.sin(time * 10);
  });

  return (
    <mesh ref={trailRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.6, 8, 8]} />
      <meshBasicMaterial
        color={0x00aaff}
        transparent
        opacity={0.3}
        wireframe
      />
    </mesh>
  );
}

// ========================================
// 💫 EFECTO DE POWER-UP
// ========================================

function PowerUpEffect({ powerUp }) {
  const effectRef = useRef();

  useFrame((state) => {
    if (!effectRef.current) return;

    const time = state.clock.elapsedTime;
    effectRef.current.rotation.y = time * 2;
    effectRef.current.scale.setScalar(1 + 0.1 * Math.sin(time * 5));
  });

  const color = powerUp.color || 0xffffff;

  return (
    <group ref={effectRef} position={[0, 1, 0]}>
      <mesh>
        <torusGeometry args={[0.8, 0.1, 8, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

export default Player;
