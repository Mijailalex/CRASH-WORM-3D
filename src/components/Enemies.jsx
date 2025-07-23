/* ============================================================================ */
/* 🎮 CRASH WORM 3D - SISTEMA DE ENEMIGOS */
/* ============================================================================ */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGame } from '@/context/GameContext';
import { gameConfig } from '@/data/gameConfig';
import useAudioManager from '@/hooks/useAudioManager';
import { MathUtils } from '@/utils/gameUtils';

// ========================================
// 🏭 COMPONENTE MANAGER DE ENEMIGOS
// ========================================

export function EnemyManager({ playerRef, enemySpawns = [] }) {
  const [enemies, setEnemies] = useState([]);
  const { state, utils } = useGame();
  const nextEnemyId = useRef(0);

  // Spawn inicial de enemigos
  useEffect(() => {
    if (enemySpawns.length > 0) {
      const initialEnemies = enemySpawns.map(spawn => ({
        id: nextEnemyId.current++,
        type: spawn.type || 'basic',
        position: spawn.position,
        config: spawn.config || {},
        active: true
      }));

      setEnemies(initialEnemies);
    }
  }, [enemySpawns]);

  // Limpiar enemigos inactivos
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setEnemies(prev => prev.filter(enemy => enemy.active));
    }, 5000);

    return () => clearInterval(cleanupInterval);
  }, []);

  const spawnEnemy = useCallback((type, position, config = {}) => {
    const newEnemy = {
      id: nextEnemyId.current++,
      type,
      position,
      config,
      active: true
    };

    setEnemies(prev => [...prev, newEnemy]);
    return newEnemy.id;
  }, []);

  const destroyEnemy = useCallback((enemyId) => {
    setEnemies(prev => prev.map(enemy =>
      enemy.id === enemyId ? { ...enemy, active: false } : enemy
    ));
  }, []);

  if (!utils.isPlaying) return null;

  return (
    <group>
      {enemies.map(enemy => enemy.active && (
        <Enemy
          key={enemy.id}
          enemyId={enemy.id}
          type={enemy.type}
          position={enemy.position}
          playerRef={playerRef}
          config={enemy.config}
          onDestroy={() => destroyEnemy(enemy.id)}
        />
      ))}
    </group>
  );
}

// ========================================
// 👹 COMPONENTE ENEMIGO INDIVIDUAL
// ========================================

export function Enemy({
  enemyId,
  type = 'basic',
  position = [0, 1, 0],
  playerRef,
  config = {},
  onDestroy
}) {
  const enemyRef = useRef();
  const meshRef = useRef();
  const aiStateRef = useRef('patrol');
  const targetRef = useRef(new THREE.Vector3());
  const lastAttackTime = useRef(0);
  const patrolPoints = useRef([]);
  const currentPatrolIndex = useRef(0);

  const { actions } = useGame();
  const { playSound } = useAudioManager();

  const [health, setHealth] = useState(gameConfig.enemies[type]?.health || 50);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isAlert, setIsAlert] = useState(false);
  const [animationState, setAnimationState] = useState('idle');

  // Configuración del enemigo
  const enemyConfig = { ...gameConfig.enemies[type], ...config };
  const maxHealth = enemyConfig.health;

  // ========================================
  // 🤖 INICIALIZACIÓN DE IA
  // ========================================

  useEffect(() => {
    // Configurar puntos de patrulla
    const patrolRadius = 5;
    patrolPoints.current = [
      new THREE.Vector3(position[0] - patrolRadius, position[1], position[2]),
      new THREE.Vector3(position[0] + patrolRadius, position[1], position[2]),
      new THREE.Vector3(position[0], position[1], position[2] - patrolRadius),
      new THREE.Vector3(position[0], position[1], position[2] + patrolRadius)
    ];

    targetRef.current.copy(patrolPoints.current[0]);
  }, [position]);

  // ========================================
  // 🧠 SISTEMA DE IA
  // ========================================

  const updateAI = useCallback((deltaTime) => {
    if (!enemyRef.current || !playerRef?.current) return;

    const enemyPos = enemyRef.current.translation();
    const playerPos = playerRef.current.translation();

    const distanceToPlayer = new THREE.Vector3(
      playerPos.x - enemyPos.x,
      playerPos.y - enemyPos.y,
      playerPos.z - enemyPos.z
    ).length();

    const detectionRadius = enemyConfig.detectionRadius;
    const attackRadius = enemyConfig.attackRadius;

    switch (aiStateRef.current) {
      case 'patrol':
        handlePatrolState(enemyPos, distanceToPlayer, detectionRadius);
        break;

      case 'chase':
        handleChaseState(enemyPos, playerPos, distanceToPlayer, attackRadius, detectionRadius);
        break;

      case 'attack':
        handleAttackState(distanceToPlayer, attackRadius);
        break;

      case 'return':
        handleReturnState(enemyPos, distanceToPlayer, detectionRadius);
        break;
    }

    // Actualizar animación basada en el estado
    updateAnimation();

  }, [enemyConfig, playerRef]);

  const handlePatrolState = (enemyPos, distanceToPlayer, detectionRadius) => {
    // Detectar jugador
    if (distanceToPlayer <= detectionRadius) {
      aiStateRef.current = 'chase';
      setIsAlert(true);
      return;
    }

    // Moverse hacia el punto de patrulla actual
    const target = patrolPoints.current[currentPatrolIndex.current];
    const distanceToTarget = new THREE.Vector3(
      target.x - enemyPos.x,
      target.y - enemyPos.y,
      target.z - enemyPos.z
    ).length();

    if (distanceToTarget < 0.5) {
      // Cambiar al siguiente punto de patrulla
      currentPatrolIndex.current = (currentPatrolIndex.current + 1) % patrolPoints.current.length;
    }

    targetRef.current.copy(target);
    setAnimationState('walking');
  };

  const handleChaseState = (enemyPos, playerPos, distanceToPlayer, attackRadius, detectionRadius) => {
    // Perder al jugador si está muy lejos
    if (distanceToPlayer > detectionRadius * 1.5) {
      aiStateRef.current = 'return';
      setIsAlert(false);
      return;
    }

    // Entrar en modo ataque si está cerca
    if (distanceToPlayer <= attackRadius) {
      aiStateRef.current = 'attack';
      return;
    }

    // Perseguir al jugador
    targetRef.current.set(playerPos.x, playerPos.y, playerPos.z);
    setAnimationState('running');
  };

  const handleAttackState = (distanceToPlayer, attackRadius) => {
    const currentTime = Date.now();

    // Salir del modo ataque si el jugador está lejos
    if (distanceToPlayer > attackRadius * 1.2) {
      aiStateRef.current = 'chase';
      setIsAttacking(false);
      return;
    }

    // Atacar si ha pasado suficiente tiempo
    if (currentTime - lastAttackTime.current >= enemyConfig.attackCooldown) {
      performAttack();
      lastAttackTime.current = currentTime;
    }
  };

  const handleReturnState = (enemyPos, distanceToPlayer, detectionRadius) => {
    // Detectar jugador de nuevo
    if (distanceToPlayer <= detectionRadius) {
      aiStateRef.current = 'chase';
      setIsAlert(true);
      return;
    }

    // Volver al punto de patrulla más cercano
    const originalPos = new THREE.Vector3(...position);
    const distanceToOrigin = new THREE.Vector3(
      originalPos.x - enemyPos.x,
      originalPos.y - enemyPos.y,
      originalPos.z - enemyPos.z
    ).length();

    if (distanceToOrigin < 1) {
      aiStateRef.current = 'patrol';
    }

    targetRef.current.copy(originalPos);
    setAnimationState('walking');
  };

  const updateAnimation = () => {
    switch (aiStateRef.current) {
      case 'patrol':
        setAnimationState('walking');
        break;
      case 'chase':
        setAnimationState('running');
        break;
      case 'attack':
        setAnimationState('attacking');
        break;
      case 'return':
        setAnimationState('walking');
        break;
      default:
        setAnimationState('idle');
    }
  };

  // ========================================
  // ⚔️ SISTEMA DE COMBATE
  // ========================================

  const performAttack = useCallback(() => {
    if (!playerRef?.current) return;

    setIsAttacking(true);
    playSound('enemy_attack', { volume: 0.6 });

    // Aplicar daño al jugador (esto será manejado por el sistema de colisiones)
    // El daño real se aplica en el componente Player cuando detecta la colisión

    setTimeout(() => {
      setIsAttacking(false);
    }, 500);
  }, [playerRef, playSound]);

  const takeDamage = useCallback((damage) => {
    const newHealth = Math.max(0, health - damage);
    setHealth(newHealth);

    // Efecto visual de daño
    if (meshRef.current) {
      meshRef.current.material.color.setHex(0xff4444);
      setTimeout(() => {
        meshRef.current.material.color.setHex(getEnemyColor(type));
      }, 200);
    }

    if (newHealth <= 0) {
      handleDeath();
    } else {
      // Knockback
      if (enemyRef.current && playerRef?.current) {
        const playerPos = playerRef.current.translation();
        const enemyPos = enemyRef.current.translation();
        const direction = new THREE.Vector3(
          enemyPos.x - playerPos.x,
          0,
          enemyPos.z - playerPos.z
        ).normalize();

        const knockback = {
          x: direction.x * 5,
          y: 2,
          z: direction.z * 5
        };

        enemyRef.current.applyImpulse(knockback, true);
      }
    }
  }, [health, type, playerRef]);

  const handleDeath = useCallback(() => {
    actions.updateScore(enemyConfig.points);
    playSound('enemy_death', { volume: 0.7 });

    // Efecto de muerte
    if (onDestroy) {
      onDestroy();
    }
  }, [actions, enemyConfig.points, playSound, onDestroy]);

  // ========================================
  // 🚶‍♂️ SISTEMA DE MOVIMIENTO
  // ========================================

  const moveTowardsTarget = useCallback((deltaTime) => {
    if (!enemyRef.current) return;

    const enemyPos = enemyRef.current.translation();
    const direction = new THREE.Vector3(
      targetRef.current.x - enemyPos.x,
      0,
      targetRef.current.z - enemyPos.z
    ).normalize();

    let speed = enemyConfig.speed;
    if (aiStateRef.current === 'chase') {
      speed *= 1.5; // Más rápido cuando persigue
    }

    const force = {
      x: direction.x * speed * deltaTime * 60,
      y: 0,
      z: direction.z * speed * deltaTime * 60
    };

    enemyRef.current.applyImpulse(force, true);

    // Rotar hacia la dirección de movimiento
    if (meshRef.current && (direction.x !== 0 || direction.z !== 0)) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y,
        targetRotation,
        deltaTime * 5
      );
    }
  }, [enemyConfig.speed]);

  // ========================================
  // 🔄 GAME LOOP
  // ========================================

  useFrame((state, deltaTime) => {
    updateAI(deltaTime);
    moveTowardsTarget(deltaTime);

    // Animación de flotación para enemigos voladores
    if (type === 'flying' && meshRef.current) {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.01;
    }

    // Efecto de alerta
    if (isAlert && meshRef.current) {
      const alertIntensity = Math.sin(state.clock.elapsedTime * 10) * 0.5 + 0.5;
      meshRef.current.material.emissiveIntensity = alertIntensity * 0.3;
    }
  });

  // ========================================
  // 💥 MANEJO DE COLISIONES
  // ========================================

  const handleCollision = useCallback((event) => {
    const { other } = event;

    if (other.rigidBodyObject?.userData?.type === 'player') {
      // Colisión con jugador - aplicar daño
      if (aiStateRef.current === 'attack' && isAttacking) {
        // El daño se maneja en el componente Player
      }
    }

    if (other.rigidBodyObject?.userData?.type === 'projectile') {
      // Colisión con proyectil del jugador
      takeDamage(other.rigidBodyObject.userData.damage || 25);
    }
  }, [isAttacking, takeDamage]);

  // ========================================
  // 🎨 RENDER DEL ENEMIGO
  // ========================================

  const getEnemyColor = (enemyType) => {
    switch (enemyType) {
      case 'basic': return 0xff4444;
      case 'flying': return 0x44ff44;
      case 'boss': return 0x8844ff;
      default: return 0xff4444;
    }
  };

  const getEnemyGeometry = () => {
    switch (type) {
      case 'flying':
        return <octahedronGeometry args={[0.6]} />;
      case 'boss':
        return <boxGeometry args={[1.5, 1.5, 1.5]} />;
      default:
        return <boxGeometry args={[0.8, 0.8, 0.8]} />;
    }
  };

  return (
    <RigidBody
      ref={enemyRef}
      position={position}
      type="dynamic"
      colliders={false}
      mass={enemyConfig.mass || 1}
      onCollisionEnter={handleCollision}
      userData={{
        type: 'enemy',
        enemyType: type,
        damage: enemyConfig.damage,
        health: health
      }}
    >
      {/* Collider del enemigo */}
      <CuboidCollider args={enemyConfig.size ?
        [enemyConfig.size.width/2, enemyConfig.size.height/2, enemyConfig.size.depth/2] :
        [0.4, 0.4, 0.4]}
      />

      {/* Mesh visual del enemigo */}
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          {getEnemyGeometry()}
          <meshStandardMaterial
            color={getEnemyColor(type)}
            emissive={isAlert ? '#ff2222' : '#000000'}
            emissiveIntensity={isAlert ? 0.2 : 0}
            transparent={health < maxHealth}
            opacity={health / maxHealth}
          />
        </mesh>

        {/* Barra de vida */}
        {health < maxHealth && (
          <group position={[0, 1, 0]}>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[1, 0.1]} />
              <meshBasicMaterial color="#ff0000" />
            </mesh>
            <mesh position={[(health/maxHealth - 1) * 0.5, 0, 0.02]} scale={[health/maxHealth, 1, 1]}>
              <planeGeometry args={[1, 0.1]} />
              <meshBasicMaterial color="#00ff00" />
            </mesh>
          </group>
        )}

        {/* Ojos del enemigo */}
        <mesh position={[-0.2, 0.2, 0.4]} castShadow>
          <sphereGeometry args={[0.05]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.2, 0.2, 0.4]} castShadow>
          <sphereGeometry args={[0.05]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Pupilas */}
        <mesh position={[-0.2, 0.2, 0.45]} castShadow>
          <sphereGeometry args={[0.02]} />
          <meshStandardMaterial color={isAlert ? "#ff0000" : "#000000"} />
        </mesh>
        <mesh position={[0.2, 0.2, 0.45]} castShadow>
          <sphereGeometry args={[0.02]} />
          <meshStandardMaterial color={isAlert ? "#ff0000" : "#000000"} />
        </mesh>

        {/* Efecto de ataque */}
        {isAttacking && (
          <mesh>
            <sphereGeometry args={[1.2]} />
            <meshBasicMaterial
              color="#ff0000"
              transparent
              opacity={0.3}
              wireframe
            />
          </mesh>
        )}

        {/* Indicador de estado */}
        {isAlert && (
          <mesh position={[0, 1.2, 0]}>
            <coneGeometry args={[0.1, 0.2]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        )}

        {/* Partículas para enemigos voladores */}
        {type === 'flying' && (
          <group>
            {[...Array(4)].map((_, i) => {
              const angle = (i / 4) * Math.PI * 2;
              const x = Math.cos(angle) * 0.8;
              const z = Math.sin(angle) * 0.8;

              return (
                <mesh key={i} position={[x, 0, z]}>
                  <sphereGeometry args={[0.02]} />
                  <meshBasicMaterial
                    color="#44ff44"
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              );
            })}
          </group>
        )}
      </group>
    </RigidBody>
  );
}

export default EnemyManager;
