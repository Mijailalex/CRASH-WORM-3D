/* ============================================================================ */
/* 🎮 CRASH WORM 3D - SISTEMA DE ENEMIGOS */
/* ============================================================================ */
/* Ubicación: src/components/Enemies.jsx */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, BallCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameContext } from '../context/GameContext';
import { useAudioManager } from '../hooks/useAudioManager';
import { gameConfig } from '../data/gameConfig';
import { MathUtils, VectorUtils, GameUtils } from '../utils/gameUtils';

// ========================================
// 👾 COMPONENTE PRINCIPAL DE ENEMIGOS
// ========================================

export function Enemies({ levelData, playerPosition, onEnemyDefeat, ...props }) {
  const { currentLevel, player, addScore } = useGameContext();
  const [enemies, setEnemies] = useState([]);

  // Generate enemies based on level data or procedurally
  useEffect(() => {
    if (levelData?.enemies) {
      setEnemies(levelData.enemies);
    } else {
      // Procedural enemy generation
      const generated = generateProceduralEnemies(currentLevel);
      setEnemies(generated);
    }
  }, [levelData, currentLevel]);

  const handleEnemyDefeat = useCallback((enemyId, enemyData) => {
    // Remove enemy from state
    setEnemies(prev => prev.filter(enemy => enemy.id !== enemyId));

    // Add score for defeating enemy
    addScore(enemyData.scoreValue || 100);

    // Notify parent component
    onEnemyDefeat?.(enemyData);
  }, [addScore, onEnemyDefeat]);

  const handleEnemyUpdate = useCallback((enemyId, updates) => {
    setEnemies(prev => prev.map(enemy =>
      enemy.id === enemyId ? { ...enemy, ...updates } : enemy
    ));
  }, []);

  return (
    <group {...props}>
      {enemies.map((enemyData) => (
        <Enemy
          key={enemyData.id}
          data={enemyData}
          playerPosition={playerPosition}
          onDefeat={(data) => handleEnemyDefeat(enemyData.id, data)}
          onUpdate={(updates) => handleEnemyUpdate(enemyData.id, updates)}
        />
      ))}
    </group>
  );
}

// ========================================
// 🤖 COMPONENTE DE ENEMIGO INDIVIDUAL
// ========================================

function Enemy({ data, playerPosition, onDefeat, onUpdate }) {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const groupRef = useRef();

  // Enemy state
  const [health, setHealth] = useState(data.maxHealth || 30);
  const [aiState, setAiState] = useState('idle'); // idle, patrol, chase, attack, hurt, dead
  const [targetPosition, setTargetPosition] = useState(null);
  const [lastPlayerPosition, setLastPlayerPosition] = useState(null);
  const [animationTime, setAnimationTime] = useState(Math.random() * Math.PI * 2);
  const [attackCooldown, setAttackCooldown] = useState(0);
  const [patrolTarget, setPatrolTarget] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const { playSound } = useAudioManager();
  const { settings } = useGameContext();

  // Enemy configuration
  const config = useMemo(() => ({
    type: data.type || 'basic',
    position: data.position || { x: 0, y: 1, z: 0 },
    maxHealth: data.maxHealth || 30,
    speed: data.speed || 2,
    damage: data.damage || 10,
    attackRange: data.attackRange || 1.5,
    detectionRange: data.detectionRange || 8,
    scoreValue: data.scoreValue || 100,
    size: data.size || { x: 1, y: 1, z: 1 },
    color: data.color || gameConfig.enemies.types[data.type]?.color || 0xff4444,
    patrolRange: data.patrolRange || 5,
    behavior: data.behavior || 'aggressive', // aggressive, defensive, patrol, guard
    ...data
  }), [data]);

  // ========================================
  // 🧠 AI SYSTEM
  // ========================================

  useFrame((state, delta) => {
    if (health <= 0 || !rigidBodyRef.current) return;

    setAnimationTime(prev => prev + delta);

    // Update cooldowns
    if (attackCooldown > 0) {
      setAttackCooldown(prev => prev - delta);
    }

    // AI decision making
    updateAI(delta);

    // Apply movement
    applyMovement(delta);

    // Update animations
    updateAnimations();
  });

  const updateAI = useCallback((delta) => {
    if (!playerPosition) return;

    const distanceToPlayer = VectorUtils.distance(
      rigidBodyRef.current.translation(),
      playerPosition
    );

    // Update AI state based on distance and behavior
    switch (aiState) {
      case 'idle':
        handleIdleState(distanceToPlayer);
        break;
      case 'patrol':
        handlePatrolState(distanceToPlayer);
        break;
      case 'chase':
        handleChaseState(distanceToPlayer);
        break;
      case 'attack':
        handleAttackState(distanceToPlayer, delta);
        break;
      case 'hurt':
        handleHurtState(delta);
        break;
      default:
        setAiState('idle');
    }
  }, [aiState, playerPosition]);

  const handleIdleState = useCallback((distanceToPlayer) => {
    if (distanceToPlayer <= config.detectionRange) {
      setAiState('chase');
      setLastPlayerPosition(playerPosition);
      playSound('enemy_alert', { volume: settings.audio.sfxVolume * 0.5 });
    } else if (config.behavior === 'patrol') {
      setAiState('patrol');
      generatePatrolTarget();
    }
  }, [config.detectionRange, config.behavior, playerPosition, playSound, settings]);

  const handlePatrolState = useCallback((distanceToPlayer) => {
    if (distanceToPlayer <= config.detectionRange) {
      setAiState('chase');
      setLastPlayerPosition(playerPosition);
      return;
    }

    // Continue patrolling
    if (!patrolTarget || VectorUtils.distance(rigidBodyRef.current.translation(), patrolTarget) < 1) {
      generatePatrolTarget();
    }

    setTargetPosition(patrolTarget);
  }, [config.detectionRange, playerPosition, patrolTarget]);

  const handleChaseState = useCallback((distanceToPlayer) => {
    if (distanceToPlayer > config.detectionRange * 1.5) {
      // Lost player
      setAiState('patrol');
      setTargetPosition(null);
      return;
    }

    if (distanceToPlayer <= config.attackRange) {
      setAiState('attack');
      setTargetPosition(null);
    } else {
      setTargetPosition(playerPosition);
      setLastPlayerPosition(playerPosition);
    }
  }, [config.detectionRange, config.attackRange, playerPosition]);

  const handleAttackState = useCallback((distanceToPlayer, delta) => {
    if (distanceToPlayer > config.attackRange) {
      setAiState('chase');
      return;
    }

    if (attackCooldown <= 0) {
      performAttack();
      setAttackCooldown(2); // 2 second cooldown
    }
  }, [config.attackRange, attackCooldown]);

  const handleHurtState = useCallback((delta) => {
    // Stay in hurt state for a short time
    setTimeout(() => {
      if (health > 0) {
        setAiState('chase');
      }
    }, 500);
  }, [health]);

  const generatePatrolTarget = useCallback(() => {
    const basePosition = config.position;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * config.patrolRange;

    const newTarget = {
      x: basePosition.x + Math.cos(angle) * distance,
      y: basePosition.y,
      z: basePosition.z + Math.sin(angle) * distance
    };

    setPatrolTarget(newTarget);
  }, [config.position, config.patrolRange]);

  // ========================================
  // 🏃‍♂️ MOVEMENT SYSTEM
  // ========================================

  const applyMovement = useCallback((delta) => {
    if (!targetPosition || !rigidBodyRef.current) return;

    const currentPos = rigidBodyRef.current.translation();
    const direction = VectorUtils.subtract(targetPosition, currentPos);
    direction.y = 0; // Don't move vertically

    const distance = VectorUtils.magnitude(direction);
    if (distance < 0.1) return;

    const normalizedDirection = VectorUtils.normalize(direction);
    const speed = getMovementSpeed();
    const velocity = VectorUtils.multiply(normalizedDirection, speed);

    // Apply movement
    rigidBodyRef.current.setLinvel({
      x: velocity.x,
      y: rigidBodyRef.current.linvel().y, // Preserve Y velocity
      z: velocity.z
    }, true);

    // Face movement direction
    if (meshRef.current && distance > 0.1) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      meshRef.current.rotation.y = MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotation,
        5 * delta
      );
    }
  }, [targetPosition]);

  const getMovementSpeed = useCallback(() => {
    switch (aiState) {
      case 'chase':
        return config.speed * 1.2;
      case 'attack':
        return 0; // Don't move while attacking
      case 'hurt':
        return config.speed * 0.3;
      default:
        return config.speed;
    }
  }, [aiState, config.speed]);

  // ========================================
  // ⚔️ COMBAT SYSTEM
  // ========================================

  const performAttack = useCallback(() => {
    playSound('enemy_attack', { volume: settings.audio.sfxVolume });

    // Trigger attack animation
    if (meshRef.current) {
      const originalScale = meshRef.current.scale.clone();
      meshRef.current.scale.multiplyScalar(1.2);

      setTimeout(() => {
        if (meshRef.current) {
          meshRef.current.scale.copy(originalScale);
        }
      }, 200);
    }

    // Deal damage to player (this would be handled by collision detection)
    // The actual damage is applied in the Player component when collision occurs
  }, [playSound, settings]);

  const takeDamage = useCallback((damage) => {
    const newHealth = Math.max(0, health - damage);
    setHealth(newHealth);

    setAiState('hurt');
    playSound('enemy_hurt', { volume: settings.audio.sfxVolume });

    if (newHealth <= 0) {
      handleDeath();
    }

    // Update parent component
    onUpdate({ health: newHealth });
  }, [health, playSound, settings, onUpdate]);

  const handleDeath = useCallback(() => {
    setAiState('dead');
    playSound('enemy_death', { volume: settings.audio.sfxVolume });

    // Death animation
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.PI / 2; // Fall over
    }

    // Disable physics
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setEnabled(false);
    }

    // Remove after animation
    setTimeout(() => {
      setIsVisible(false);
      onDefeat(config);
    }, 1000);
  }, [config, onDefeat, playSound, settings]);

  // ========================================
  // 💥 COLLISION HANDLING
  // ========================================

  const handleCollisionEnter = useCallback((event) => {
    const { other } = event;

    if (other.rigidBodyObject?.userData?.type === 'player') {
      // Handle player collision (damage is applied by player component)
      // This is mainly for triggering effects
    }

    if (other.rigidBodyObject?.userData?.type === 'projectile') {
      // Handle projectile damage
      const projectileData = other.rigidBodyObject.userData;
      takeDamage(projectileData.damage || 10);
    }
  }, [takeDamage]);

  // ========================================
  // 🎨 ANIMATIONS
  // ========================================

  const updateAnimations = useCallback(() => {
    if (!meshRef.current) return;

    switch (aiState) {
      case 'idle':
        // Idle breathing animation
        meshRef.current.scale.y = 1 + Math.sin(animationTime * 2) * 0.05;
        break;
      case 'patrol':
      case 'chase':
        // Walking animation
        meshRef.current.position.y = Math.sin(animationTime * 8) * 0.1;
        break;
      case 'attack':
        // Attack animation handled in performAttack
        break;
      case 'hurt':
        // Hurt animation
        meshRef.current.rotation.x = Math.sin(animationTime * 20) * 0.2;
        break;
    }
  }, [aiState, animationTime]);

  // ========================================
  // 🎨 RENDERING
  // ========================================

  const getGeometry = useCallback(() => {
    switch (config.type) {
      case 'fast':
        return <capsuleGeometry args={[config.size.x * 0.4, config.size.y * 0.8]} />;
      case 'heavy':
        return <boxGeometry args={[config.size.x, config.size.y, config.size.z]} />;
      case 'flying':
        return <sphereGeometry args={[config.size.x * 0.6, 8, 8]} />;
      default:
        return <capsuleGeometry args={[config.size.x * 0.5, config.size.y]} />;
    }
  }, [config.type, config.size]);

  const getMaterial = useCallback(() => {
    let color = config.color;

    // Change color based on state
    if (aiState === 'hurt') {
      color = 0xff8888; // Red tint when hurt
    } else if (aiState === 'attack') {
      color = 0xff0000; // Bright red when attacking
    }

    // Health-based opacity
    const healthPercent = health / config.maxHealth;
    const opacity = Math.max(0.3, healthPercent);

    return (
      <meshStandardMaterial
        color={color}
        metalness={0.1}
        roughness={0.7}
        transparent
        opacity={opacity}
        emissive={new THREE.Color(color).multiplyScalar(0.1)}
      />
    );
  }, [config.color, config.maxHealth, aiState, health]);

  if (!isVisible || health <= 0) {
    return null;
  }

  return (
    <group ref={groupRef} position={[config.position.x, config.position.y, config.position.z]}>
      <RigidBody
        ref={rigidBodyRef}
        type="dynamic"
        colliders={false}
        mass={1}
        onCollisionEnter={handleCollisionEnter}
        userData={{
          type: 'enemy',
          enemyType: config.type,
          damage: config.damage,
          id: config.id,
          position: config.position
        }}
      >
        {config.type === 'flying' ? (
          <BallCollider args={[config.size.x * 0.6]} />
        ) : (
          <CapsuleCollider args={[config.size.x * 0.5, config.size.y * 0.5]} />
        )}

        <mesh ref={meshRef} castShadow receiveShadow>
          {getGeometry()}
          {getMaterial()}
        </mesh>

        {/* Enemy Effects */}
        <EnemyEffects
          type={config.type}
          aiState={aiState}
          health={health}
          maxHealth={config.maxHealth}
          size={config.size}
        />
      </RigidBody>
    </group>
  );
}

// ========================================
// ✨ EFECTOS DE ENEMIGOS
// ========================================

function EnemyEffects({ type, aiState, health, maxHealth, size }) {
  const effectRef = useRef();

  useFrame((state) => {
    if (!effectRef.current) return;

    const time = state.clock.elapsedTime;

    switch (aiState) {
      case 'chase':
        // Angry eyes effect
        effectRef.current.visible = Math.sin(time * 10) > 0;
        break;
      case 'attack':
        // Attack warning effect
        effectRef.current.scale.setScalar(1 + Math.sin(time * 15) * 0.3);
        break;
      case 'hurt':
        // Damage flash effect
        effectRef.current.visible = Math.sin(time * 20) > 0;
        break;
      default:
        effectRef.current.visible = true;
        effectRef.current.scale.setScalar(1);
    }
  });

  const healthPercent = health / maxHealth;

  return (
    <group ref={effectRef}>
      {/* Health Bar */}
      <HealthBar health={healthPercent} size={size} />

      {/* Type-specific effects */}
      {type === 'fire' && <FireEnemyEffect size={size} />}
      {type === 'fast' && <SpeedTrailEffect size={size} />}
      {type === 'flying' && <FlyingParticles size={size} />}

      {/* State effects */}
      {aiState === 'chase' && <AngryEyes size={size} />}
      {aiState === 'attack' && <AttackWarning size={size} />}
    </group>
  );
}

// ========================================
// ❤️ BARRA DE VIDA DEL ENEMIGO
// ========================================

function HealthBar({ health, size }) {
  if (health >= 1) return null; // Don't show full health bar

  return (
    <group position={[0, size.y + 0.5, 0]}>
      <mesh>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color={0x444444} transparent opacity={0.8} />
      </mesh>
      <mesh position={[-(1 - health) / 2, 0, 0.01]}>
        <planeGeometry args={[health, 0.08]} />
        <meshBasicMaterial
          color={health > 0.5 ? 0x00ff00 : health > 0.25 ? 0xffff00 : 0xff0000}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// ========================================
// 🔥 EFECTO DE ENEMIGO DE FUEGO
// ========================================

function FireEnemyEffect({ size }) {
  const particlesRef = useRef();
  const particleCount = 20;
  const positions = useMemo(() => new Float32Array(particleCount * 3), []);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const time = state.clock.elapsedTime;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = Math.sin(time * 2 + i) * size.x * 0.3;
      positions[i3 + 1] = size.y * 0.5 + Math.sin(time * 3 + i) * 0.2;
      positions[i3 + 2] = Math.cos(time * 2 + i) * size.z * 0.3;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

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
// 💨 EFECTO DE ESTELA DE VELOCIDAD
// ========================================

function SpeedTrailEffect({ size }) {
  return (
    <group position={[0, 0, -size.z]}>
      <mesh>
        <coneGeometry args={[0.1, size.z * 0.5, 4]} />
        <meshBasicMaterial
          color={0x00ffff}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

// ========================================
// 🌪️ PARTÍCULAS VOLADORAS
// ========================================

function FlyingParticles({ size }) {
  const particlesRef = useRef();
  const particleCount = 12;
  const positions = useMemo(() => new Float32Array(particleCount * 3), []);

  useFrame((state) => {
    if (!particlesRef.current) return;

    const time = state.clock.elapsedTime;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const angle = (i / particleCount) * Math.PI * 2 + time;
      const radius = size.x;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(time * 2 + i) * 0.3;
      positions[i3 + 2] = Math.sin(angle) * radius;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

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
        color={0x88aaff}
        transparent
        opacity={0.7}
      />
    </points>
  );
}

// ========================================
// 👀 OJOS ENOJADOS
// ========================================

function AngryEyes({ size }) {
  return (
    <group position={[0, size.y * 0.3, size.z * 0.4]}>
      <mesh position={[-0.15, 0, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>
      <mesh position={[0.15, 0, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>
    </group>
  );
}

// ========================================
// ⚠️ ADVERTENCIA DE ATAQUE
// ========================================

function AttackWarning({ size }) {
  return (
    <group position={[0, size.y + 0.3, 0]}>
      <mesh>
        <coneGeometry args={[0.2, 0.4, 3]} />
        <meshBasicMaterial
          color={0xff0000}
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

function generateProceduralEnemies(level) {
  const enemies = [];
  const enemyCount = Math.min(5 + level * 2, 20);

  for (let i = 0; i < enemyCount; i++) {
    const distance = MathUtils.randomFloat(10, 25);
    const angle = Math.random() * Math.PI * 2;

    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = 1;

    const type = getRandomEnemyType(level);
    const config = gameConfig.enemies.types[type] || {};

    enemies.push({
      id: `enemy-${i}`,
      type,
      position: { x, y, z },
      maxHealth: config.health || 30,
      speed: config.speed || 2,
      damage: config.damage || 10,
      attackRange: config.attackRange || 1.5,
      detectionRange: config.detectionRange || 8,
      scoreValue: config.scoreValue || 100,
      size: config.size || { x: 1, y: 1, z: 1 },
      color: config.color || 0xff4444,
      behavior: getRandomBehavior()
    });
  }

  return enemies;
}

function getRandomEnemyType(level) {
  const rand = Math.random();

  if (level > 3 && rand < 0.1) return 'heavy';
  if (level > 2 && rand < 0.2) return 'flying';
  if (level > 1 && rand < 0.3) return 'fast';

  return 'basic';
}

function getRandomBehavior() {
  const behaviors = ['aggressive', 'patrol', 'guard'];
  return behaviors[Math.floor(Math.random() * behaviors.length)];
}

export default Enemies;
