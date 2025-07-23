/* ============================================================================ */
/* 🎮 CRASH WORM 3D - SISTEMA DE PLATAFORMAS */
/* ============================================================================ */
/* Ubicación: src/components/Platforms.jsx */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameContext } from '../context/GameContext';
import { useAudioManager } from '../hooks/useAudioManager';
import { gameConfig } from '../data/gameConfig';
import { MathUtils, VectorUtils, GameUtils } from '../utils/gameUtils';

// ========================================
// 🏗️ COMPONENTE PRINCIPAL DE PLATAFORMAS
// ========================================

export function Platforms({ levelData, onPlatformInteraction, ...props }) {
  const { currentLevel, settings } = useGameContext();
  const { playSound } = useAudioManager();

  // Generate platforms based on level data or procedurally
  const platforms = useMemo(() => {
    if (levelData?.platforms) {
      return levelData.platforms;
    }

    // Procedural platform generation
    return generateProceduralPlatforms(currentLevel);
  }, [levelData, currentLevel]);

  return (
    <group {...props}>
      {platforms.map((platformData, index) => (
        <Platform
          key={`platform-${index}`}
          data={platformData}
          onInteraction={onPlatformInteraction}
        />
      ))}
    </group>
  );
}

// ========================================
// 🟫 COMPONENTE DE PLATAFORMA INDIVIDUAL
// ========================================

function Platform({ data, onInteraction }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const [isActive, setIsActive] = useState(true);
  const [currentPosition, setCurrentPosition] = useState(data.position);
  const [animationTime, setAnimationTime] = useState(0);

  const { playSound } = useAudioManager();
  const { settings } = useGameContext();

  // Platform configuration
  const config = {
    size: data.size || { x: 2, y: 0.5, z: 2 },
    position: data.position || { x: 0, y: 0, z: 0 },
    type: data.type || 'static', // static, moving, breakable, bounce, ice, fire
    movement: data.movement || null,
    material: data.material || 'default',
    ...data
  };

  // ========================================
  // 🔄 PLATFORM MOVEMENT LOGIC
  // ========================================

  useFrame((state, delta) => {
    if (!meshRef.current || !rigidBodyRef.current) return;

    setAnimationTime(prev => prev + delta);

    switch (config.type) {
      case 'moving':
        handleMovingPlatform(delta);
        break;
      case 'rotating':
        handleRotatingPlatform(delta);
        break;
      case 'oscillating':
        handleOscillatingPlatform(delta);
        break;
      case 'bounce':
        handleBouncePlatform();
        break;
      default:
        break;
    }
  });

  const handleMovingPlatform = useCallback((delta) => {
    if (!config.movement) return;

    const { path, speed, loop } = config.movement;
    if (!path || path.length < 2) return;

    const totalDistance = calculatePathLength(path);
    const travelDistance = (animationTime * speed) % (loop ? totalDistance : totalDistance * 2);

    let targetPosition;
    if (loop || travelDistance <= totalDistance) {
      targetPosition = getPositionOnPath(path, travelDistance / totalDistance);
    } else {
      // Ping-pong movement
      const reverseProgress = 1 - ((travelDistance - totalDistance) / totalDistance);
      targetPosition = getPositionOnPath(path, reverseProgress);
    }

    // Smooth movement
    setCurrentPosition(prev => ({
      x: MathUtils.lerp(prev.x, targetPosition.x, 5 * delta),
      y: MathUtils.lerp(prev.y, targetPosition.y, 5 * delta),
      z: MathUtils.lerp(prev.z, targetPosition.z, 5 * delta)
    }));

    rigidBodyRef.current.setTranslation(currentPosition, true);
  }, [config.movement, animationTime, currentPosition]);

  const handleRotatingPlatform = useCallback((delta) => {
    if (!config.rotation) return;

    const { axis, speed } = config.rotation;
    const rotation = meshRef.current.rotation;

    switch (axis) {
      case 'x':
        rotation.x += speed * delta;
        break;
      case 'y':
        rotation.y += speed * delta;
        break;
      case 'z':
        rotation.z += speed * delta;
        break;
    }
  }, [config.rotation]);

  const handleOscillatingPlatform = useCallback((delta) => {
    if (!config.oscillation) return;

    const { amplitude, frequency, axis } = config.oscillation;
    const offset = Math.sin(animationTime * frequency) * amplitude;

    const basePosition = config.position;
    const newPosition = { ...basePosition };
    newPosition[axis] = basePosition[axis] + offset;

    setCurrentPosition(newPosition);
    rigidBodyRef.current.setTranslation(newPosition, true);
  }, [config.oscillation, config.position, animationTime]);

  const handleBouncePlatform = useCallback(() => {
    // Bounce effect will be triggered by collision
  }, []);

  // ========================================
  // 💥 COLLISION HANDLING
  // ========================================

  const handleCollisionEnter = useCallback((event) => {
    const { other } = event;

    if (other.rigidBodyObject?.userData?.type === 'player') {
      handlePlayerCollision(other.rigidBodyObject);
    }
  }, []);

  const handlePlayerCollision = useCallback((playerObject) => {
    const soundVolume = settings.audio.sfxVolume;

    switch (config.type) {
      case 'breakable':
        handleBreakablePlatform(playerObject);
        break;
      case 'bounce':
        handleBouncePlatformCollision(playerObject);
        break;
      case 'ice':
        handleIcePlatform(playerObject);
        break;
      case 'fire':
        handleFirePlatform(playerObject);
        break;
      case 'checkpoint':
        handleCheckpointPlatform(playerObject);
        break;
      default:
        // Standard platform sound
        playSound('step', { volume: soundVolume * 0.3 });
        break;
    }

    onInteraction?.({
      type: 'collision',
      platform: config,
      player: playerObject
    });
  }, [config, settings, playSound, onInteraction]);

  const handleBreakablePlatform = useCallback((playerObject) => {
    if (!isActive) return;

    const playerVelocity = playerObject.linvel();
    const impactForce = Math.abs(playerVelocity.y);

    if (impactForce > 3) { // Threshold for breaking
      setIsActive(false);
      playSound('platform_break', { volume: settings.audio.sfxVolume });

      // Start break animation
      setTimeout(() => {
        if (rigidBodyRef.current) {
          rigidBodyRef.current.setTranslation({ x: 0, y: -100, z: 0 }, true);
        }
      }, 500);

      // Respawn platform after delay
      setTimeout(() => {
        setIsActive(true);
        rigidBodyRef.current?.setTranslation(config.position, true);
      }, config.respawnTime || 5000);
    }
  }, [isActive, config, playSound, settings]);

  const handleBouncePlatformCollision = useCallback((playerObject) => {
    const bounceForce = config.bounceForce || 15;
    playSound('bounce', { volume: settings.audio.sfxVolume });

    // Apply upward force to player
    playerObject.setLinvel({
      x: playerObject.linvel().x,
      y: bounceForce,
      z: playerObject.linvel().z
    }, true);

    // Platform bounce animation
    if (meshRef.current) {
      const originalScale = meshRef.current.scale.clone();
      meshRef.current.scale.y *= 0.7;

      setTimeout(() => {
        if (meshRef.current) {
          meshRef.current.scale.copy(originalScale);
        }
      }, 200);
    }
  }, [config.bounceForce, playSound, settings]);

  const handleIcePlatform = useCallback((playerObject) => {
    playSound('ice_step', { volume: settings.audio.sfxVolume * 0.5 });

    // Reduce friction for slippery effect
    // This would need to be implemented in the physics system
    onInteraction?.({
      type: 'ice_effect',
      duration: 1000,
      player: playerObject
    });
  }, [playSound, settings, onInteraction]);

  const handleFirePlatform = useCallback((playerObject) => {
    playSound('fire_damage', { volume: settings.audio.sfxVolume });

    // Damage player
    onInteraction?.({
      type: 'damage',
      amount: 10,
      element: 'fire',
      player: playerObject
    });
  }, [playSound, settings, onInteraction]);

  const handleCheckpointPlatform = useCallback((playerObject) => {
    playSound('checkpoint', { volume: settings.audio.sfxVolume });

    onInteraction?.({
      type: 'checkpoint',
      position: config.position,
      player: playerObject
    });
  }, [playSound, settings, config.position, onInteraction]);

  // ========================================
  // 🎨 PLATFORM RENDERING
  // ========================================

  const getMaterial = useCallback(() => {
    switch (config.type) {
      case 'ice':
        return (
          <meshStandardMaterial
            color={0x87ceeb}
            metalness={0.1}
            roughness={0.1}
            transparent
            opacity={0.8}
          />
        );
      case 'fire':
        return (
          <meshStandardMaterial
            color={0xff4500}
            metalness={0.0}
            roughness={0.8}
            emissive={0x441100}
          />
        );
      case 'bounce':
        return (
          <meshStandardMaterial
            color={0xff69b4}
            metalness={0.2}
            roughness={0.6}
          />
        );
      case 'breakable':
        return (
          <meshStandardMaterial
            color={isActive ? 0x8b4513 : 0x654321}
            metalness={0.0}
            roughness={0.9}
            opacity={isActive ? 1.0 : 0.5}
            transparent={!isActive}
          />
        );
      case 'checkpoint':
        return (
          <meshStandardMaterial
            color={0x00ff00}
            metalness={0.3}
            roughness={0.5}
            emissive={0x002200}
          />
        );
      default:
        return (
          <meshStandardMaterial
            color={config.color || 0x888888}
            metalness={0.1}
            roughness={0.8}
          />
        );
    }
  }, [config.type, config.color, isActive]);

  const getGeometry = useCallback(() => {
    switch (config.shape || 'box') {
      case 'cylinder':
        return <cylinderGeometry args={[config.size.x, config.size.x, config.size.y, 16]} />;
      case 'sphere':
        return <sphereGeometry args={[config.size.x, 16, 16]} />;
      default:
        return <boxGeometry args={[config.size.x, config.size.y, config.size.z]} />;
    }
  }, [config.shape, config.size]);

  if (!isActive && config.type === 'breakable') {
    return null; // Hide broken platforms
  }

  return (
    <group>
      <RigidBody
        ref={rigidBodyRef}
        type={config.type === 'moving' || config.type === 'oscillating' ? 'kinematicPosition' : 'fixed'}
        position={[currentPosition.x, currentPosition.y, currentPosition.z]}
        colliders={false}
        onCollisionEnter={handleCollisionEnter}
        userData={{
          type: 'platform',
          platformType: config.type,
          id: config.id
        }}
      >
        <CuboidCollider args={[config.size.x / 2, config.size.y / 2, config.size.z / 2]} />

        <mesh ref={meshRef} castShadow receiveShadow>
          {getGeometry()}
          {getMaterial()}
        </mesh>

        {/* Platform Effects */}
        <PlatformEffects type={config.type} isActive={isActive} size={config.size} />
      </RigidBody>
    </group>
  );
}

// ========================================
// ✨ EFECTOS DE PLATAFORMA
// ========================================

function PlatformEffects({ type, isActive, size }) {
  const effectRef = useRef();

  useFrame((state) => {
    if (!effectRef.current) return;

    const time = state.clock.elapsedTime;

    switch (type) {
      case 'fire':
        // Fire particle effect
        effectRef.current.position.y = size.y / 2 + 0.2 + Math.sin(time * 5) * 0.1;
        effectRef.current.rotation.y = time * 2;
        break;
      case 'ice':
        // Ice crystal effect
        effectRef.current.rotation.y = time * 0.5;
        effectRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
        break;
      case 'bounce':
        // Bounce spring effect
        effectRef.current.scale.y = 1 + Math.sin(time * 4) * 0.2;
        break;
      case 'checkpoint':
        // Checkpoint glow effect
        effectRef.current.rotation.y = time;
        effectRef.current.position.y = size.y / 2 + 0.5 + Math.sin(time * 2) * 0.2;
        break;
    }
  });

  if (!isActive) return null;

  return (
    <group ref={effectRef}>
      {type === 'fire' && (
        <FireEffect size={size} />
      )}
      {type === 'ice' && (
        <IceEffect size={size} />
      )}
      {type === 'bounce' && (
        <BounceEffect size={size} />
      )}
      {type === 'checkpoint' && (
        <CheckpointEffect size={size} />
      )}
    </group>
  );
}

// ========================================
// 🔥 EFECTO DE FUEGO
// ========================================

function FireEffect({ size }) {
  const particlesRef = useRef();
  const particleCount = 30;
  const positions = useMemo(() => new Float32Array(particleCount * 3), []);
  const velocities = useMemo(() => new Float32Array(particleCount * 3), []);
  const lifetimes = useMemo(() => new Float32Array(particleCount), []);

  useEffect(() => {
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = MathUtils.randomFloat(-size.x / 2, size.x / 2);
      positions[i3 + 1] = 0;
      positions[i3 + 2] = MathUtils.randomFloat(-size.z / 2, size.z / 2);

      velocities[i3] = MathUtils.randomFloat(-0.5, 0.5);
      velocities[i3 + 1] = MathUtils.randomFloat(1, 3);
      velocities[i3 + 2] = MathUtils.randomFloat(-0.5, 0.5);

      lifetimes[i] = MathUtils.randomFloat(0.5, 2);
    }
  }, [size, positions, velocities, lifetimes]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      lifetimes[i] -= delta;

      if (lifetimes[i] <= 0) {
        // Reset particle
        positions[i3] = MathUtils.randomFloat(-size.x / 2, size.x / 2);
        positions[i3 + 1] = 0;
        positions[i3 + 2] = MathUtils.randomFloat(-size.z / 2, size.z / 2);

        velocities[i3] = MathUtils.randomFloat(-0.5, 0.5);
        velocities[i3 + 1] = MathUtils.randomFloat(1, 3);
        velocities[i3 + 2] = MathUtils.randomFloat(-0.5, 0.5);

        lifetimes[i] = MathUtils.randomFloat(0.5, 2);
      } else {
        // Update particle
        positions[i3] += velocities[i3] * delta;
        positions[i3 + 1] += velocities[i3 + 1] * delta;
        positions[i3 + 2] += velocities[i3 + 2] * delta;

        // Apply some turbulence
        velocities[i3] += MathUtils.randomFloat(-0.1, 0.1) * delta;
        velocities[i3 + 2] += MathUtils.randomFloat(-0.1, 0.1) * delta;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} position={[0, size.y / 2, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color={0xff4500}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ========================================
// ❄️ EFECTO DE HIELO
// ========================================

function IceEffect({ size }) {
  return (
    <group position={[0, size.y / 2 + 0.1, 0]}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[
          MathUtils.randomFloat(-size.x / 3, size.x / 3),
          MathUtils.randomFloat(0, 0.3),
          MathUtils.randomFloat(-size.z / 3, size.z / 3)
        ]}>
          <coneGeometry args={[0.05, 0.2, 6]} />
          <meshStandardMaterial
            color={0x87ceeb}
            transparent
            opacity={0.7}
            metalness={0.1}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

// ========================================
// 🌸 EFECTO DE REBOTE
// ========================================

function BounceEffect({ size }) {
  return (
    <group position={[0, -size.y / 2 - 0.1, 0]}>
      <mesh>
        <cylinderGeometry args={[size.x * 0.4, size.x * 0.6, 0.2, 8]} />
        <meshStandardMaterial
          color={0xff69b4}
          metalness={0.2}
          roughness={0.6}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

// ========================================
// ⭐ EFECTO DE CHECKPOINT
// ========================================

function CheckpointEffect({ size }) {
  return (
    <group>
      <mesh>
        <torusGeometry args={[size.x * 0.8, 0.1, 8, 16]} />
        <meshBasicMaterial
          color={0x00ff00}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial
          color={0x00ff00}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

// ========================================
// 🛠️ UTILITY FUNCTIONS
// ========================================

function generateProceduralPlatforms(level) {
  const platforms = [];
  const platformCount = Math.min(10 + level * 2, 30);

  // Starting platform
  platforms.push({
    id: 'start',
    position: { x: 0, y: 0, z: 0 },
    size: { x: 4, y: 0.5, z: 4 },
    type: 'static',
    color: 0x00ff00
  });

  for (let i = 1; i < platformCount; i++) {
    const distance = i * MathUtils.randomFloat(3, 6);
    const angle = (i / platformCount) * Math.PI * 2 + MathUtils.randomFloat(-0.5, 0.5);

    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = MathUtils.randomFloat(0, level * 2);

    const platformType = getPlatformType(level, i);

    platforms.push({
      id: `platform-${i}`,
      position: { x, y, z },
      size: {
        x: MathUtils.randomFloat(1.5, 3),
        y: 0.5,
        z: MathUtils.randomFloat(1.5, 3)
      },
      type: platformType,
      ...getPlatformTypeConfig(platformType)
    });
  }

  return platforms;
}

function getPlatformType(level, index) {
  const rand = Math.random();

  if (index % 10 === 0) return 'checkpoint';
  if (level > 2 && rand < 0.1) return 'fire';
  if (level > 1 && rand < 0.15) return 'ice';
  if (rand < 0.2) return 'bounce';
  if (level > 3 && rand < 0.1) return 'breakable';
  if (rand < 0.3) return 'moving';

  return 'static';
}

function getPlatformTypeConfig(type) {
  switch (type) {
    case 'moving':
      return {
        movement: {
          path: [
            { x: 0, y: 0, z: 0 },
            { x: MathUtils.randomFloat(-3, 3), y: MathUtils.randomFloat(-1, 1), z: MathUtils.randomFloat(-3, 3) }
          ],
          speed: MathUtils.randomFloat(1, 3),
          loop: false
        }
      };
    case 'bounce':
      return {
        bounceForce: 15,
        color: 0xff69b4
      };
    case 'fire':
      return {
        color: 0xff4500
      };
    case 'ice':
      return {
        color: 0x87ceeb
      };
    case 'breakable':
      return {
        respawnTime: 5000,
        color: 0x8b4513
      };
    default:
      return {};
  }
}

function calculatePathLength(path) {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    length += VectorUtils.distance(path[i - 1], path[i]);
  }
  return length;
}

function getPositionOnPath(path, progress) {
  if (path.length < 2) return path[0] || { x: 0, y: 0, z: 0 };

  const totalLength = calculatePathLength(path);
  const targetDistance = progress * totalLength;

  let currentDistance = 0;

  for (let i = 1; i < path.length; i++) {
    const segmentLength = VectorUtils.distance(path[i - 1], path[i]);

    if (currentDistance + segmentLength >= targetDistance) {
      const segmentProgress = (targetDistance - currentDistance) / segmentLength;
      return VectorUtils.lerp(path[i - 1], path[i], segmentProgress);
    }

    currentDistance += segmentLength;
  }

  return path[path.length - 1];
}

export default Platforms;
