/* ============================================================================ */
/* 🎮 CRASH WORM 3D - SISTEMA DE COLECCIONABLES */
/* ============================================================================ */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGame } from '@/context/GameContext';
import { gameConfig } from '@/data/gameConfig';
import useAudioManager from '@/hooks/useAudioManager';

// ========================================
// 🏭 MANAGER DE COLECCIONABLES
// ========================================

export function CollectibleManager({ collectibleSpawns = [], playerRef }) {
  const [collectibles, setCollectibles] = useState([]);
  const { state, utils } = useGame();
  const nextCollectibleId = useRef(0);

  // Spawn inicial de coleccionables
  useEffect(() => {
    if (collectibleSpawns.length > 0) {
      const initialCollectibles = collectibleSpawns.map(spawn => ({
        id: nextCollectibleId.current++,
        type: spawn.type || 'coin',
        position: spawn.position,
        config: spawn.config || {},
        collected: false,
        active: true
      }));

      setCollectibles(initialCollectibles);
    }
  }, [collectibleSpawns]);

  // Limpiar coleccionables inactivos
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setCollectibles(prev => prev.filter(collectible => collectible.active));
    }, 10000);

    return () => clearInterval(cleanupInterval);
  }, []);

  const spawnCollectible = useCallback((type, position, config = {}) => {
    const newCollectible = {
      id: nextCollectibleId.current++,
      type,
      position,
      config,
      collected: false,
      active: true
    };

    setCollectibles(prev => [...prev, newCollectible]);
    return newCollectible.id;
  }, []);

  const collectItem = useCallback((collectibleId) => {
    setCollectibles(prev => prev.map(collectible =>
      collectible.id === collectibleId
        ? { ...collectible, collected: true, active: false }
        : collectible
    ));
  }, []);

  const spawnRandomCollectibles = useCallback((count = 5, area = { x: 20, z: 20 }) => {
    const types = ['coin', 'gem', 'powerup'];
    const newCollectibles = [];

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const position = [
        (Math.random() - 0.5) * area.x,
        2 + Math.random() * 3,
        (Math.random() - 0.5) * area.z
      ];

      newCollectibles.push({
        id: nextCollectibleId.current++,
        type,
        position,
        config: {},
        collected: false,
        active: true
      });
    }

    setCollectibles(prev => [...prev, ...newCollectibles]);
  }, []);

  if (!utils.isPlaying) return null;

  return (
    <group>
      {collectibles.map(collectible => collectible.active && !collectible.collected && (
        <Collectible
          key={collectible.id}
          collectibleId={collectible.id}
          type={collectible.type}
          position={collectible.position}
          playerRef={playerRef}
          config={collectible.config}
          onCollect={() => collectItem(collectible.id)}
        />
      ))}
    </group>
  );
}

// ========================================
// 💎 COMPONENTE COLECCIONABLE INDIVIDUAL
// ========================================

export function Collectible({
  collectibleId,
  type = 'coin',
  position = [0, 2, 0],
  playerRef,
  config = {},
  onCollect
}) {
  const collectibleRef = useRef();
  const meshRef = useRef();
  const magnetRef = useRef(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [scale, setScale] = useState(1);

  const { actions } = useGame();
  const { playSound } = useAudioManager();

  // Configuración del coleccionable
  const collectibleConfig = { ...gameConfig.collectibles[type], ...config };

  // ========================================
  // 💫 EFECTOS VISUALES
  // ========================================

  useFrame((state, deltaTime) => {
    if (!meshRef.current || !playerRef?.current) return;

    const collectiblePos = collectibleRef.current?.translation();
    const playerPos = playerRef.current.translation();

    if (!collectiblePos) return;

    // Calcular distancia al jugador
    const distance = new THREE.Vector3(
      playerPos.x - collectiblePos.x,
      playerPos.y - collectiblePos.y,
      playerPos.z - collectiblePos.z
    ).length();

    // Efectos de magnetismo
    if (distance <= collectibleConfig.magnetRadius) {
      magnetRef.current = true;

      // Atraer hacia el jugador
      const direction = new THREE.Vector3(
        playerPos.x - collectiblePos.x,
        playerPos.y - collectiblePos.y,
        playerPos.z - collectiblePos.z
      ).normalize();

      const magnetForce = {
        x: direction.x * 10 * deltaTime,
        y: direction.y * 10 * deltaTime,
        z: direction.z * 10 * deltaTime
      };

      collectibleRef.current?.applyImpulse(magnetForce, true);
    }

    // Animaciones
    if (!isCollecting) {
      // Rotación
      meshRef.current.rotation.y += collectibleConfig.rotationSpeed * deltaTime;

      // Flotación
      const bobOffset = Math.sin(state.clock.elapsedTime * 2 + collectibleId) * collectibleConfig.bobAmount;
      meshRef.current.position.y = bobOffset;

      // Pulsación cuando está cerca del jugador
      if (distance <= collectibleConfig.collectRadius * 2) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
        setScale(pulse);
      } else {
        setScale(1);
      }
    }

    // Efecto de recolección
    if (isCollecting) {
      const collectScale = Math.max(0, scale - deltaTime * 3);
      setScale(collectScale);

      if (collectScale <= 0.1 && onCollect) {
        onCollect();
      }
    }
  });

  // ========================================
  // 🤲 LÓGICA DE RECOLECCIÓN
  // ========================================

  const handleCollect = useCallback(() => {
    if (isCollecting) return;

    setIsCollecting(true);

    // Aplicar efectos según el tipo
    switch (type) {
      case 'coin':
        actions.updateScore(collectibleConfig.points);
        actions.addCollectible();
        playSound('collect', { volume: 0.6, rate: 1.0 });
        break;

      case 'gem':
        actions.updateScore(collectibleConfig.points);
        actions.addCollectible();
        playSound('collect', { volume: 0.8, rate: 1.2 });
        break;

      case 'powerup':
        applyPowerup();
        playSound('collect', { volume: 1.0, rate: 1.5 });
        break;

      case 'health':
        actions.updateHealth(25);
        playSound('collect', { volume: 0.7, rate: 0.8 });
        break;

      case 'life':
        actions.updateLives(1);
        playSound('collect', { volume: 1.0, rate: 2.0 });
        break;
    }

    // Crear partículas de recolección
    createCollectionParticles();
  }, [isCollecting, type, actions, playSound, collectibleConfig.points]);

  const applyPowerup = useCallback(() => {
    const powerupTypes = ['speed', 'jump', 'invincible', 'magnet'];
    const randomPowerup = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];

    // Implementar diferentes power-ups
    switch (randomPowerup) {
      case 'speed':
        // Speed boost temporal
        console.log('Speed boost activated!');
        break;
      case 'jump':
        // Jump boost temporal
        console.log('Jump boost activated!');
        break;
      case 'invincible':
        // Invencibilidad temporal
        console.log('Invincible activated!');
        break;
      case 'magnet':
        // Magnetismo mejorado
        console.log('Magnet activated!');
        break;
    }
  }, []);

  const createCollectionParticles = useCallback(() => {
    // Las partículas se crearán en un componente separado
    console.log(`Collection particles for ${type}`);
  }, [type]);

  // ========================================
  // 💥 MANEJO DE COLISIONES
  // ========================================

  const handleCollision = useCallback((event) => {
    const { other } = event;

    if (other.rigidBodyObject?.userData?.type === 'player') {
      handleCollect();
    }
  }, [handleCollect]);

  // ========================================
  // 🎨 FUNCIONES DE RENDER
  // ========================================

  const getCollectibleGeometry = () => {
    switch (type) {
      case 'coin':
        return <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />;
      case 'gem':
        return <octahedronGeometry args={[0.3]} />;
      case 'powerup':
        return <icosahedronGeometry args={[0.25]} />;
      case 'health':
        return <sphereGeometry args={[0.2]} />;
      case 'life':
        return <dodecahedronGeometry args={[0.25]} />;
      default:
        return <sphereGeometry args={[0.2]} />;
    }
  };

  const getCollectibleColor = () => {
    switch (type) {
      case 'coin': return '#ffdd00';
      case 'gem': return '#00ffff';
      case 'powerup': return '#ff00ff';
      case 'health': return '#ff3333';
      case 'life': return '#33ff33';
      default: return '#ffffff';
    }
  };

  const getEmissiveColor = () => {
    switch (type) {
      case 'coin': return '#ffaa00';
      case 'gem': return '#0088aa';
      case 'powerup': return '#aa00aa';
      case 'health': return '#aa1111';
      case 'life': return '#11aa11';
      default: return '#000000';
    }
  };

  // ========================================
  // 🎨 RENDER DEL COLECCIONABLE
  // ========================================

  return (
    <RigidBody
      ref={collectibleRef}
      position={position}
      type="dynamic"
      colliders={false}
      gravityScale={0.1}
      onCollisionEnter={handleCollision}
      userData={{
        type: 'collectible',
        collectibleType: type,
        points: collectibleConfig.points,
        value: collectibleConfig.points
      }}
    >
      {/* Collider del coleccionable */}
      <CuboidCollider args={[0.3, 0.3, 0.3]} sensor />

      {/* Mesh visual del coleccionable */}
      <group ref={meshRef} scale={[scale, scale, scale]}>
        <mesh castShadow>
          {getCollectibleGeometry()}
          <meshStandardMaterial
            color={getCollectibleColor()}
            emissive={getEmissiveColor()}
            emissiveIntensity={magnetRef.current ? 0.3 : 0.1}
            metalness={type === 'coin' ? 0.8 : 0.2}
            roughness={type === 'coin' ? 0.2 : 0.8}
            transparent={isCollecting}
            opacity={isCollecting ? 0.5 : 1.0}
          />
        </mesh>

        {/* Efectos especiales por tipo */}
        {type === 'coin' && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.31, 0.35, 16]} />
            <meshBasicMaterial
              color="#ffdd00"
              transparent
              opacity={0.6}
            />
          </mesh>
        )}

        {type === 'gem' && (
          <pointLight
            color="#00ffff"
            intensity={0.5}
            distance={3}
            position={[0, 0, 0]}
          />
        )}

        {type === 'powerup' && (
          <group>
            {[...Array(6)].map((_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              const x = Math.cos(angle) * 0.4;
              const z = Math.sin(angle) * 0.4;

              return (
                <mesh key={i} position={[x, 0, z]}>
                  <sphereGeometry args={[0.02]} />
                  <meshBasicMaterial
                    color="#ff00ff"
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              );
            })}
          </group>
        )}

        {type === 'health' && (
          <group>
            {/* Cruz roja */}
            <mesh position={[0, 0, 0.21]}>
              <boxGeometry args={[0.15, 0.05, 0.01]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0, 0.21]}>
              <boxGeometry args={[0.05, 0.15, 0.01]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        )}

        {type === 'life' && (
          <pointLight
            color="#33ff33"
            intensity={0.3}
            distance={2}
            position={[0, 0, 0]}
          />
        )}

        {/* Aura de magnetismo */}
        {magnetRef.current && (
          <mesh>
            <sphereGeometry args={[0.5]} />
            <meshBasicMaterial
              color={getCollectibleColor()}
              transparent
              opacity={0.1}
              wireframe
            />
          </mesh>
        )}

        {/* Partículas flotantes */}
        <FloatingParticles type={type} active={!isCollecting} />
      </group>
    </RigidBody>
  );
}

// ========================================
// ✨ COMPONENTE DE PARTÍCULAS FLOTANTES
// ========================================

function FloatingParticles({ type, active }) {
  const particlesRef = useRef();
  const particlesCount = type === 'powerup' ? 8 : 4;

  useFrame((state, deltaTime) => {
    if (!particlesRef.current || !active) return;

    particlesRef.current.rotation.y += deltaTime * 0.5;

    particlesRef.current.children.forEach((particle, i) => {
      const offset = (i / particlesCount) * Math.PI * 2;
      const radius = 0.6 + Math.sin(state.clock.elapsedTime * 2 + offset) * 0.1;
      const height = Math.sin(state.clock.elapsedTime * 3 + offset) * 0.2;

      particle.position.x = Math.cos(offset + state.clock.elapsedTime) * radius;
      particle.position.y = height;
      particle.position.z = Math.sin(offset + state.clock.elapsedTime) * radius;
    });
  });

  if (!active) return null;

  return (
    <group ref={particlesRef}>
      {[...Array(particlesCount)].map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.02]} />
          <meshBasicMaterial
            color={type === 'coin' ? '#ffdd00' :
                  type === 'gem' ? '#00ffff' :
                  type === 'powerup' ? '#ff00ff' : '#ffffff'}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// ========================================
// 🎁 COMPONENTES ESPECIALIZADOS
// ========================================

export function Coin({ position, onCollect }) {
  return (
    <Collectible
      type="coin"
      position={position}
      onCollect={onCollect}
    />
  );
}

export function Gem({ position, onCollect }) {
  return (
    <Collectible
      type="gem"
      position={position}
      onCollect={onCollect}
    />
  );
}

export function PowerUp({ position, onCollect }) {
  return (
    <Collectible
      type="powerup"
      position={position}
      onCollect={onCollect}
    />
  );
}

export function HealthPack({ position, onCollect }) {
  return (
    <Collectible
      type="health"
      position={position}
      onCollect={onCollect}
    />
  );
}

export function ExtraLife({ position, onCollect }) {
  return (
    <Collectible
      type="life"
      position={position}
      onCollect={onCollect}
    />
  );
}

export default CollectibleManager;
