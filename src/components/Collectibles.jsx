/* ============================================================================ */
/* 🎮 CRASH WORM 3D - SISTEMA DE COLECCIONABLES */
/* ============================================================================ */
/* Ubicación: src/components/Collectibles.jsx */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameContext } from '../context/GameContext';
import { useAudioManager } from '../hooks/useAudioManager';
import { gameConfig } from '../data/gameConfig';
import { MathUtils, VectorUtils, GameUtils } from '../utils/gameUtils';

// ========================================
// 💎 COMPONENTE PRINCIPAL DE COLECCIONABLES
// ========================================

export function Collectibles({ levelData, onCollect, ...props }) {
  const { currentLevel, player, addScore, addCoins, healPlayer, addPowerUp } = useGameContext();
  const [collectibles, setCollectibles] = useState([]);

  // Generate collectibles based on level data or procedurally
  useEffect(() => {
    if (levelData?.collectibles) {
      setCollectibles(levelData.collectibles);
    } else {
      // Procedural collectible generation
      const generated = generateProceduralCollectibles(currentLevel);
      setCollectibles(generated);
    }
  }, [levelData, currentLevel]);

  const handleCollect = useCallback((collectibleId, collectibleData) => {
    // Remove collectible from state
    setCollectibles(prev => prev.filter(item => item.id !== collectibleId));

    // Handle collection effects
    handleCollectionEffects(collectibleData);

    // Notify parent component
    onCollect?.(collectibleData);
  }, [onCollect]);

  const handleCollectionEffects = useCallback((collectibleData) => {
    switch (collectibleData.type) {
      case 'coin':
        addCoins(collectibleData.value || 1);
        addScore(collectibleData.scoreValue || 10);
        break;
      case 'gem':
        addCoins(collectibleData.value || 5);
        addScore(collectibleData.scoreValue || 50);
        break;
      case 'heart':
        healPlayer(collectibleData.healAmount || 25);
        addScore(collectibleData.scoreValue || 25);
        break;
      case 'star':
        addScore(collectibleData.scoreValue || 100);
        break;
      case 'powerup':
        addPowerUp(collectibleData.powerUp);
        addScore(collectibleData.scoreValue || 75);
        break;
      default:
        addScore(collectibleData.scoreValue || 10);
    }
  }, [addCoins, addScore, healPlayer, addPowerUp]);

  return (
    <group {...props}>
      {collectibles.map((collectibleData) => (
        <Collectible
          key={collectibleData.id}
          data={collectibleData}
          onCollect={(data) => handleCollect(collectibleData.id, data)}
        />
      ))}
    </group>
  );
}

// ========================================
// 🏆 COMPONENTE DE COLECCIONABLE INDIVIDUAL
// ========================================

function Collectible({ data, onCollect }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const groupRef = useRef();
  const [isCollected, setIsCollected] = useState(false);
  const [animationTime, setAnimationTime] = useState(Math.random() * Math.PI * 2);
  const [magnetTarget, setMagnetTarget] = useState(null);
  const [collectionAnimation, setCollectionAnimation] = useState(0);

  const { playSound } = useAudioManager();
  const { settings, player } = useGameContext();

  // Collectible configuration
  const config = useMemo(() => ({
    type: data.type || 'coin',
    position: data.position || { x: 0, y: 1, z: 0 },
    value: data.value || 1,
    size: data.size || 0.3,
    color: data.color || getDefaultColor(data.type),
    animation: data.animation || 'rotate',
    magnetRange: data.magnetRange || 2,
    floatHeight: data.floatHeight || 0.3,
    ...data
  }), [data]);

  // ========================================
  // 🔄 ANIMATION LOGIC
  // ========================================

  useFrame((state, delta) => {
    if (isCollected || !meshRef.current || !groupRef.current) return;

    setAnimationTime(prev => prev + delta);

    // Check for magnet effect
    checkMagnetEffect();

    // Apply animations
    switch (config.animation) {
      case 'rotate':
        handleRotateAnimation();
        break;
      case 'float':
        handleFloatAnimation();
        break;
      case 'pulse':
        handlePulseAnimation();
        break;
      case 'spin':
        handleSpinAnimation();
        break;
      default:
        handleRotateAnimation();
    }

    // Handle magnet movement
    if (magnetTarget) {
      handleMagnetMovement(delta);
    }

    // Collection animation
    if (collectionAnimation > 0) {
      handleCollectionAnimation(delta);
    }
  });

  const checkMagnetEffect = useCallback(() => {
    if (magnetTarget || !player.position) return;

    const distance = VectorUtils.distance(config.position, player.position);
    if (distance <= config.magnetRange) {
      setMagnetTarget(player.position);
      playSound('magnet', { volume: settings.audio.sfxVolume * 0.3 });
    }
  }, [magnetTarget, player.position, config.position, config.magnetRange, playSound, settings]);

  const handleRotateAnimation = useCallback(() => {
    if (!meshRef.current) return;

    meshRef.current.rotation.y = animationTime * 2;

    // Float up and down
    const floatOffset = Math.sin(animationTime * 3) * config.floatHeight;
    groupRef.current.position.y = config.position.y + floatOffset;
  }, [animationTime, config.floatHeight, config.position.y]);

  const handleFloatAnimation = useCallback(() => {
    if (!groupRef.current) return;

    const floatOffset = Math.sin(animationTime * 2) * config.floatHeight;
    groupRef.current.position.y = config.position.y + floatOffset;
  }, [animationTime, config.floatHeight, config.position.y]);

  const handlePulseAnimation = useCallback(() => {
    if (!meshRef.current) return;

    const scale = 1 + Math.sin(animationTime * 4) * 0.2;
    meshRef.current.scale.setScalar(scale);
  }, [animationTime]);

  const handleSpinAnimation = useCallback(() => {
    if (!meshRef.current) return;

    meshRef.current.rotation.x = animationTime * 3;
    meshRef.current.rotation.y = animationTime * 2;
    meshRef.current.rotation.z = animationTime * 1;
  }, [animationTime]);

  const handleMagnetMovement = useCallback((delta) => {
    if (!rigidBodyRef.current || !magnetTarget) return;

    const currentPos = rigidBodyRef.current.translation();
    const direction = VectorUtils.subtract(magnetTarget, currentPos);
    const distance = VectorUtils.magnitude(direction);

    if (distance < 0.5) {
      // Close enough to collect
      triggerCollection();
      return;
    }

    // Move towards target
    const normalizedDirection = VectorUtils.normalize(direction);
    const speed = 8; // Magnet speed
    const velocity = VectorUtils.multiply(normalizedDirection, speed);

    rigidBodyRef.current.setLinvel(velocity, true);
  }, [magnetTarget]);

  const handleCollectionAnimation = useCallback((delta) => {
    if (!meshRef.current || !groupRef.current) return;

    setCollectionAnimation(prev => prev + delta * 5);

    // Scale up and fade out
    const scale = 1 + collectionAnimation;
    const opacity = Math.max(0, 1 - collectionAnimation);

    meshRef.current.scale.setScalar(scale);
    if (meshRef.current.material) {
      meshRef.current.material.opacity = opacity;
    }

    // Remove when animation completes
    if (collectionAnimation >= 1) {
      groupRef.current.visible = false;
    }
  }, [collectionAnimation]);

  // ========================================
  // 💥 COLLISION HANDLING
  // ========================================

  const handleCollisionEnter = useCallback((event) => {
    const { other } = event;

    if (other.rigidBodyObject?.userData?.type === 'player' && !isCollected) {
      triggerCollection();
    }
  }, [isCollected]);

  const triggerCollection = useCallback(() => {
    if (isCollected) return;

    setIsCollected(true);
    setCollectionAnimation(0.01); // Start collection animation

    // Play collection sound
    const soundName = getCollectionSound(config.type);
    playSound(soundName, {
      volume: settings.audio.sfxVolume,
      rate: MathUtils.randomFloat(0.9, 1.1) // Slight pitch variation
    });

    // Trigger collection effects
    onCollect(config);

    // Remove rigidbody collision
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setEnabled(false);
    }
  }, [isCollected, config, playSound, settings, onCollect]);

  // ========================================
  // 🎨 RENDERING
  // ========================================

  const getGeometry = useCallback(() => {
    switch (config.type) {
      case 'coin':
        return <cylinderGeometry args={[config.size, config.size, config.size * 0.2, 16]} />;
      case 'gem':
        return <octahedronGeometry args={[config.size, 1]} />;
      case 'heart':
        return <HeartGeometry size={config.size} />;
      case 'star':
        return <StarGeometry size={config.size} />;
      case 'powerup':
        return <boxGeometry args={[config.size, config.size, config.size]} />;
      default:
        return <sphereGeometry args={[config.size, 16, 16]} />;
    }
  }, [config.type, config.size]);

  const getMaterial = useCallback(() => {
    const baseProps = {
      color: config.color,
      metalness: 0.2,
      roughness: 0.3,
      transparent: true,
      opacity: 1
    };

    switch (config.type) {
      case 'coin':
        return (
          <meshStandardMaterial
            {...baseProps}
            metalness={0.8}
            roughness={0.1}
            emissive={new THREE.Color(config.color).multiplyScalar(0.1)}
          />
        );
      case 'gem':
        return (
          <meshStandardMaterial
            {...baseProps}
            metalness={0.1}
            roughness={0.0}
            emissive={new THREE.Color(config.color).multiplyScalar(0.2)}
          />
        );
      case 'heart':
        return (
          <meshStandardMaterial
            {...baseProps}
            emissive={new THREE.Color(config.color).multiplyScalar(0.3)}
          />
        );
      case 'star':
        return (
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0.9}
          />
        );
      case 'powerup':
        return (
          <meshStandardMaterial
            {...baseProps}
            emissive={new THREE.Color(config.color).multiplyScalar(0.4)}
          />
        );
      default:
        return (
          <meshStandardMaterial {...baseProps} />
        );
    }
  }, [config.type, config.color]);

  if (isCollected && collectionAnimation >= 1) {
    return null;
  }

  return (
    <group ref={groupRef} position={[config.position.x, config.position.y, config.position.z]}>
      <RigidBody
        ref={rigidBodyRef}
        type="fixed"
        colliders={false}
        sensor
        onCollisionEnter={handleCollisionEnter}
        userData={{
          type: 'collectible',
          collectibleType: config.type,
          id: config.id
        }}
      >
        {config.type === 'coin' ? (
          <CuboidCollider args={[config.size, config.size * 0.2, config.size]} sensor />
        ) : (
          <BallCollider args={[config.size]} sensor />
        )}

        <mesh ref={meshRef} castShadow>
          {getGeometry()}
          {getMaterial()}
        </mesh>

        {/* Collection Effects */}
        <CollectibleEffects
          type={config.type}
          size={config.size}
          color={config.color}
          isCollected={isCollected}
        />
      </RigidBody>
    </group>
  );
}

// ========================================
// ❤️ GEOMETRÍA PERSONALIZADA - CORAZÓN
// ========================================

function HeartGeometry({ size }) {
  const heartShape = useMemo(() => {
    const shape = new THREE.Shape();
    const x = 0, y = 0;

    shape.moveTo(x + 5, y + 5);
    shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    shape.bezierCurveTo(x - 6, y, x - 6, y + 3.5, x - 6, y + 3.5);
    shape.bezierCurveTo(x - 6, y + 5.5, x - 4, y + 7.5, x, y + 10);
    shape.bezierCurveTo(x + 4, y + 7.5, x + 6, y + 5.5, x + 6, y + 3.5);
    shape.bezierCurveTo(x + 6, y + 3.5, x + 6, y, x, y);
    shape.bezierCurveTo(x + 4, y, x + 5, y + 5, x + 5, y + 5);

    return shape;
  }, []);

  return (
    <extrudeGeometry
      args={[
        heartShape,
        {
          depth: size * 0.3,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 2,
          bevelSize: size * 0.05,
          bevelThickness: size * 0.05
        }
      ]}
      scale={[size * 0.05, size * 0.05, 1]}
    />
  );
}

// ========================================
// ⭐ GEOMETRÍA PERSONALIZADA - ESTRELLA
// ========================================

function StarGeometry({ size }) {
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1;
    const innerRadius = 0.4;
    const spikes = 5;

    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * Math.PI * 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }

    shape.closePath();
    return shape;
  }, []);

  return (
    <extrudeGeometry
      args={[
        starShape,
        {
          depth: size * 0.2,
          bevelEnabled: true,
          bevelSegments: 1,
          steps: 1,
          bevelSize: size * 0.02,
          bevelThickness: size * 0.02
        }
      ]}
      scale={[size, size, 1]}
    />
  );
}

// ========================================
// ✨ EFECTOS DE COLECCIONABLES
// ========================================

function CollectibleEffects({ type, size, color, isCollected }) {
  const effectRef = useRef();

  useFrame((state) => {
    if (!effectRef.current || isCollected) return;

    const time = state.clock.elapsedTime;

    switch (type) {
      case 'coin':
        // Coin sparkle effect
        effectRef.current.rotation.z = time * 2;
        break;
      case 'gem':
        // Gem crystal effect
        effectRef.current.rotation.y = time * 3;
        effectRef.current.scale.setScalar(1 + Math.sin(time * 5) * 0.1);
        break;
      case 'heart':
        // Heart pulse effect
        effectRef.current.scale.setScalar(1 + Math.sin(time * 4) * 0.2);
        break;
      case 'star':
        // Star twinkle effect
        effectRef.current.rotation.z = time;
        break;
      case 'powerup':
        // Power-up energy effect
        effectRef.current.rotation.x = time * 2;
        effectRef.current.rotation.y = time * 1.5;
        break;
    }
  });

  return (
    <group ref={effectRef}>
      {type === 'coin' && <CoinSparkleEffect size={size} color={color} />}
      {type === 'gem' && <GemCrystalEffect size={size} color={color} />}
      {type === 'heart' && <HeartPulseEffect size={size} color={color} />}
      {type === 'star' && <StarTwinkleEffect size={size} color={color} />}
      {type === 'powerup' && <PowerUpEnergyEffect size={size} color={color} />}
    </group>
  );
}

// ========================================
// 💫 EFECTOS ESPECÍFICOS
// ========================================

function CoinSparkleEffect({ size, color }) {
  const particlesRef = useRef();
  const particleCount = 8;
  const positions = useMemo(() => {
    const array = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = size * 1.5;
      array[i * 3] = Math.cos(angle) * radius;
      array[i * 3 + 1] = MathUtils.randomFloat(-size * 0.5, size * 0.5);
      array[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return array;
  }, [size]);

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
        color={color}
        transparent
        opacity={0.6}
      />
    </points>
  );
}

function GemCrystalEffect({ size, color }) {
  return (
    <mesh>
      <octahedronGeometry args={[size * 1.2, 0]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        wireframe
      />
    </mesh>
  );
}

function HeartPulseEffect({ size, color }) {
  return (
    <mesh>
      <sphereGeometry args={[size * 1.5, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2}
      />
    </mesh>
  );
}

function StarTwinkleEffect({ size, color }) {
  const linesRef = useRef();

  const positions = useMemo(() => {
    const array = new Float32Array(6 * 3 * 2); // 3 lines, 2 points each
    const length = size * 2;

    // Horizontal line
    array[0] = -length; array[1] = 0; array[2] = 0;
    array[3] = length; array[4] = 0; array[5] = 0;

    // Vertical line
    array[6] = 0; array[7] = -length; array[8] = 0;
    array[9] = 0; array[10] = length; array[11] = 0;

    // Diagonal line
    array[12] = -length * 0.7; array[13] = -length * 0.7; array[14] = 0;
    array[15] = length * 0.7; array[16] = length * 0.7; array[17] = 0;

    return array;
  }, [size]);

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={6}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.8}
      />
    </lineSegments>
  );
}

function PowerUpEnergyEffect({ size, color }) {
  return (
    <group>
      <mesh>
        <torusGeometry args={[size * 1.2, size * 0.1, 6, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 1.2, size * 0.1, 6, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

// ========================================
// 🛠️ UTILITY FUNCTIONS
// ========================================

function getDefaultColor(type) {
  const colors = gameConfig.collectibles.types;
  return colors[type]?.color || 0xffff00;
}

function getCollectionSound(type) {
  switch (type) {
    case 'coin':
      return 'collect';
    case 'gem':
      return 'gem_collect';
    case 'heart':
      return 'heal';
    case 'star':
      return 'star_collect';
    case 'powerup':
      return 'powerup';
    default:
      return 'collect';
  }
}

function generateProceduralCollectibles(level) {
  const collectibles = [];
  const collectibleCount = Math.min(20 + level * 5, 50);

  for (let i = 0; i < collectibleCount; i++) {
    const distance = MathUtils.randomFloat(5, 30);
    const angle = Math.random() * Math.PI * 2;
    const height = MathUtils.randomFloat(1, 8);

    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    const type = getRandomCollectibleType(level);
    const config = gameConfig.collectibles.types[type] || {};

    collectibles.push({
      id: `collectible-${i}`,
      type,
      position: { x, y: height, z },
      value: config.value || 1,
      size: config.size || 0.3,
      color: config.color || 0xffff00,
      scoreValue: getScoreValue(type),
      ...getTypeSpecificConfig(type)
    });
  }

  return collectibles;
}

function getRandomCollectibleType(level) {
  const rand = Math.random();

  // Higher level = more valuable items
  if (level > 3 && rand < 0.05) return 'powerup';
  if (level > 2 && rand < 0.1) return 'star';
  if (rand < 0.15) return 'gem';
  if (rand < 0.25) return 'heart';

  return 'coin'; // Most common
}

function getScoreValue(type) {
  switch (type) {
    case 'coin': return 10;
    case 'gem': return 50;
    case 'heart': return 25;
    case 'star': return 100;
    case 'powerup': return 75;
    default: return 10;
  }
}

function getTypeSpecificConfig(type) {
  switch (type) {
    case 'heart':
      return { healAmount: 25 };
    case 'powerup':
      return {
        powerUp: {
          id: Date.now(),
          type: 'speedBoost',
          name: 'Speed Boost',
          duration: 10000,
          effect: { walkSpeed: 1.5, runSpeed: 1.5 },
          color: 0x00ff00,
          icon: '⚡'
        }
      };
    default:
      return {};
  }
}

export default Collectibles;
