import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { OrbitControls, Environment, Text, PerspectiveCamera, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// ========================================
// COMPONENTE JUGADOR
// ========================================

function Player({ position, onPositionChange, gameState }) {
  const playerRef = useRef();
  const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });
  const [isGrounded, setIsGrounded] = useState(false);
  const keysPressed = useRef({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.code] = true;
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!playerRef.current) return;

    const speed = 10;
    const jumpForce = 15;
    let newVelocity = { ...velocity };

    // Controles de movimiento
    if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) {
      newVelocity.z = -speed;
    } else if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) {
      newVelocity.z = speed;
    } else {
      newVelocity.z *= 0.8;
    }

    if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) {
      newVelocity.x = -speed;
    } else if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) {
      newVelocity.x = speed;
    } else {
      newVelocity.x *= 0.8;
    }

    // Salto
    if (keysPressed.current['Space'] && isGrounded) {
      newVelocity.y = jumpForce;
      setIsGrounded(false);
    }

    // Aplicar gravedad
    newVelocity.y -= 9.81 * delta;

    // Actualizar posición
    playerRef.current.setLinvel(newVelocity, true);
    setVelocity(newVelocity);

    // Obtener posición actual
    const currentPos = playerRef.current.translation();
    onPositionChange(currentPos);
  });

  const handleCollisionEnter = () => {
    setIsGrounded(true);
  };

  return (
    <RigidBody
      ref={playerRef}
      position={[position.x, position.y, position.z]}
      type="dynamic"
      onCollisionEnter={handleCollisionEnter}
      lockRotations
    >
      <CuboidCollider args={[0.5, 1, 0.5]} />
      <mesh castShadow>
        <capsuleGeometry args={[0.5, 1.5]} />
        <meshStandardMaterial color="lime" />
      </mesh>
    </RigidBody>
  );
}

// ========================================
// COMPONENTE PLATAFORMA
// ========================================

function Platform({ position, size, color = "gray", type = "static" }) {
  const platformRef = useRef();

  useFrame((state) => {
    if (type === "moving" && platformRef.current) {
      const time = state.clock.getElapsedTime();
      const newY = position.y + Math.sin(time * 2) * 2;
      platformRef.current.setTranslation({ x: position.x, y: newY, z: position.z });
    }
  });

  return (
    <RigidBody
      ref={platformRef}
      position={[position.x, position.y, position.z]}
      type={type === "moving" ? "kinematicPosition" : "fixed"}
    >
      <CuboidCollider args={[size.x / 2, size.y / 2, size.z / 2]} />
      <mesh receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}

// ========================================
// COMPONENTE COLECCIONABLE
// ========================================

function Collectible({ position, type = "gem", onCollect, id }) {
  const collectibleRef = useRef();
  const [collected, setCollected] = useState(false);

  useFrame((state) => {
    if (collectibleRef.current && !collected) {
      const time = state.clock.getElapsedTime();
      collectibleRef.current.rotation.y = time * 2;
      collectibleRef.current.position.y = position.y + Math.sin(time * 3) * 0.2;
    }
  });

  const handleCollisionEnter = ({ other }) => {
    if (other.rigidBodyObject && !collected) {
      setCollected(true);
      onCollect(id, type, position);
      // Hacer invisible o remover
      if (collectibleRef.current) {
        collectibleRef.current.scale.set(0, 0, 0);
      }
    }
  };

  if (collected) return null;

  const getColor = () => {
    switch (type) {
      case "gem": return "#00ffff";
      case "coin": return "#ffd700";
      case "powerup": return "#ff00ff";
      default: return "#ffffff";
    }
  };

  return (
    <RigidBody
      position={[position.x, position.y, position.z]}
      type="fixed"
      sensor
      onIntersectionEnter={handleCollisionEnter}
    >
      <CuboidCollider args={[0.3, 0.3, 0.3]} sensor />
      <mesh ref={collectibleRef}>
        <octahedronGeometry args={[0.3]} />
        <meshStandardMaterial 
          color={getColor()} 
          emissive={getColor()}
          emissiveIntensity={0.2}
        />
      </mesh>
    </RigidBody>
  );
}

// ========================================
// COMPONENTE ENEMIGO
// ========================================

function Enemy({ position, type = "basic", playerPosition, onDamage }) {
  const enemyRef = useRef();
  const [health, setHealth] = useState(30);
  const [alertLevel, setAlertLevel] = useState(0);

  useFrame((state, delta) => {
    if (!enemyRef.current || !playerPosition) return;

    const enemyPos = enemyRef.current.translation();
    const distance = Math.sqrt(
      Math.pow(playerPosition.x - enemyPos.x, 2) +
      Math.pow(playerPosition.z - enemyPos.z, 2)
    );

    // IA básica: perseguir al jugador si está cerca
    if (distance < 10) {
      setAlertLevel(Math.min(100, alertLevel + 1));
      
      const direction = {
        x: (playerPosition.x - enemyPos.x) / distance,
        z: (playerPosition.z - enemyPos.z) / distance
      };

      const speed = type === "fast" ? 6 : 3;
      enemyRef.current.setLinvel({
        x: direction.x * speed,
        y: 0,
        z: direction.z * speed
      }, true);
    } else {
      setAlertLevel(Math.max(0, alertLevel - 0.5));
      // Patrulla aleatoria
      const time = state.clock.getElapsedTime();
      const wanderSpeed = 1;
      enemyRef.current.setLinvel({
        x: Math.sin(time * 0.5) * wanderSpeed,
        y: 0,
        z: Math.cos(time * 0.3) * wanderSpeed
      }, true);
    }
  });

  const handleCollisionEnter = ({ other }) => {
    if (other.rigidBodyObject) {
      onDamage && onDamage(10);
    }
  };

  const getColor = () => {
    switch (type) {
      case "fast": return "#ff4444";
      case "heavy": return "#8B4513";
      case "elite": return "#800080";
      default: return "#ff6666";
    }
  };

  const getSize = () => {
    switch (type) {
      case "fast": return [0.4, 0.8, 0.4];
      case "heavy": return [0.8, 1.2, 0.8];
      case "elite": return [0.6, 1.5, 0.6];
      default: return [0.5, 1, 0.5];
    }
  };

  return (
    <RigidBody
      ref={enemyRef}
      position={[position.x, position.y, position.z]}
      type="dynamic"
      onCollisionEnter={handleCollisionEnter}
      lockRotations
    >
      <CuboidCollider args={getSize()} />
      <mesh castShadow>
        <boxGeometry args={getSize().map(s => s * 2)} />
        <meshStandardMaterial 
          color={getColor()}
          emissive={alertLevel > 50 ? "#ff0000" : "#000000"}
          emissiveIntensity={alertLevel / 200}
        />
      </mesh>
      
      {/* Barra de vida */}
      <mesh position={[0, getSize()[1] + 0.5, 0]}>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color={health > 15 ? "#00ff00" : "#ff0000"} />
      </mesh>
    </RigidBody>
  );
}

// ========================================
// EFECTOS DE PARTÍCULAS
// ========================================

function ParticleEffect({ position, type, active }) {
  const particlesRef = useRef();
  const particles = useRef([]);

  useEffect(() => {
    if (active && particlesRef.current) {
      // Crear partículas
      const particleCount = type === "explosion" ? 20 : 10;
      particles.current = [];

      for (let i = 0; i < particleCount; i++) {
        particles.current.push({
          position: { ...position },
          velocity: {
            x: (Math.random() - 0.5) * 10,
            y: Math.random() * 8 + 2,
            z: (Math.random() - 0.5) * 10
          },
          life: 1.0,
          decay: 0.02
        });
      }
    }
  }, [active, position, type]);

  useFrame((state, delta) => {
    if (!active || !particles.current.length) return;

    particles.current = particles.current.filter(particle => {
      particle.position.x += particle.velocity.x * delta;
      particle.position.y += particle.velocity.y * delta;
      particle.position.z += particle.velocity.z * delta;
      particle.velocity.y -= 9.81 * delta; // Gravedad
      particle.life -= particle.decay;
      return particle.life > 0;
    });
  });

  if (!active || !particles.current.length) return null;

  return (
    <group ref={particlesRef}>
      {particles.current.map((particle, index) => (
        <mesh key={index} position={[particle.position.x, particle.position.y, particle.position.z]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial 
            color={type === "explosion" ? "#ff4444" : "#44ff44"}
            transparent
            opacity={particle.life}
          />
        </mesh>
      ))}
    </group>
  );
}

// ========================================
// CÁMARA QUE SIGUE AL JUGADOR
// ========================================

function FollowCamera({ target, offset = { x: 0, y: 10, z: 10 } }) {
  const cameraRef = useRef();

  useFrame(() => {
    if (cameraRef.current && target) {
      const targetPos = new THREE.Vector3(
        target.x + offset.x,
        target.y + offset.y,
        target.z + offset.z
      );
      
      cameraRef.current.position.lerp(targetPos, 0.1);
      cameraRef.current.lookAt(target.x, target.y, target.z);
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[offset.x, offset.y, offset.z]} />;
}

// ========================================
// UI DEL JUEGO
// ========================================

function GameUI({ score, health, lives, collectibles }) {
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      zIndex: 100,
      background: 'rgba(0,0,0,0.5)',
      padding: '10px',
      borderRadius: '8px'
    }}>
      <div>Score: {score}</div>
      <div>Health: {health}/100</div>
      <div>Lives: {lives}</div>
      <div>Gems: {collectibles}</div>
    </div>
  );
}

// ========================================
// MUNDO DE JUEGO PRINCIPAL
// ========================================

export function GameWorld() {
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 5, z: 0 });
  const [gameState, setGameState] = useState({
    score: 0,
    health: 100,
    lives: 3,
    collectibles: 0,
    level: 1
  });
  const [effects, setEffects] = useState([]);

  // Generar plataformas del mundo
  const platforms = [
    { position: { x: 0, y: -1, z: 0 }, size: { x: 20, y: 2, z: 20 }, color: "#666666" },
    { position: { x: 10, y: 3, z: 5 }, size: { x: 8, y: 1, z: 8 }, color: "#8B4513" },
    { position: { x: -8, y: 2, z: -10 }, size: { x: 6, y: 1, z: 6 }, color: "#228B22" },
    { position: { x: 15, y: 6, z: -5 }, size: { x: 4, y: 1, z: 4 }, color: "#4169E1", type: "moving" },
    { position: { x: -15, y: 4, z: 8 }, size: { x: 5, y: 1, z: 5 }, color: "#DC143C" },
    { position: { x: 0, y: 8, z: 15 }, size: { x: 6, y: 1, z: 6 }, color: "#FF1493" },
  ];

  // Generar coleccionables
  const collectibles = [
    { id: "gem1", position: { x: 10, y: 5, z: 5 }, type: "gem" },
    { id: "gem2", position: { x: -8, y: 4, z: -10 }, type: "gem" },
    { id: "coin1", position: { x: 15, y: 8, z: -5 }, type: "coin" },
    { id: "powerup1", position: { x: -15, y: 6, z: 8 }, type: "powerup" },
    { id: "gem3", position: { x: 0, y: 10, z: 15 }, type: "gem" },
    { id: "gem4", position: { x: 5, y: 3, z: 0 }, type: "gem" },
  ];

  // Generar enemigos
  const enemies = [
    { id: "enemy1", position: { x: 8, y: 2, z: 3 }, type: "basic" },
    { id: "enemy2", position: { x: -10, y: 2, z: -8 }, type: "fast" },
    { id: "enemy3", position: { x: 12, y: 2, z: -3 }, type: "heavy" },
  ];

  const handlePlayerPositionChange = useCallback((newPosition) => {
    setPlayerPosition(newPosition);
  }, []);

  const handleCollectItem = useCallback((itemId, itemType, position) => {
    setGameState(prev => {
      const points = itemType === "gem" ? 10 : itemType === "coin" ? 5 : 25;
      return {
        ...prev,
        score: prev.score + points,
        collectibles: prev.collectibles + 1
      };
    });

    // Crear efecto de partículas
    setEffects(prev => [...prev, {
      id: Date.now(),
      position,
      type: "collect",
      active: true
    }]);

    // Remover efecto después de un tiempo
    setTimeout(() => {
      setEffects(prev => prev.filter(effect => effect.id !== Date.now()));
    }, 1000);

    console.log(`Collected ${itemType} at`, position);
  }, []);

  const handleTakeDamage = useCallback((damage) => {
    setGameState(prev => ({
      ...prev,
      health: Math.max(0, prev.health - damage)
    }));
  }, []);

  return (
    <>
      <GameUI 
        score={gameState.score}
        health={gameState.health}
        lives={gameState.lives}
        collectibles={gameState.collectibles}
      />
      
      <Canvas shadows>
        <FollowCamera target={playerPosition} />
        
        <ambientLight intensity={0.3} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <pointLight position={[0, 10, 0]} intensity={0.5} />
        
        <Physics gravity={[0, -9.81, 0]} debug={false}>
          <Player 
            position={playerPosition} 
            onPositionChange={handlePlayerPositionChange}
            gameState={gameState}
          />
          
          {/* Renderizar plataformas */}
          {platforms.map((platform, index) => (
            <Platform 
              key={`platform-${index}`}
              position={platform.position}
              size={platform.size}
              color={platform.color}
              type={platform.type}
            />
          ))}
          
          {/* Renderizar coleccionables */}
          {collectibles.map(collectible => (
            <Collectible
              key={collectible.id}
              id={collectible.id}
              position={collectible.position}
              type={collectible.type}
              onCollect={handleCollectItem}
            />
          ))}
          
          {/* Renderizar enemigos */}
          {enemies.map(enemy => (
            <Enemy
              key={enemy.id}
              position={enemy.position}
              type={enemy.type}
              playerPosition={playerPosition}
              onDamage={handleTakeDamage}
            />
          ))}
        </Physics>
        
        {/* Efectos de partículas */}
        {effects.map(effect => (
          <ParticleEffect
            key={effect.id}
            position={effect.position}
            type={effect.type}
            active={effect.active}
          />
        ))}
        
        <Environment preset="sunset" />
        
        {/* Texto 3D */}
        <Text
          position={[0, 15, 0]}
          fontSize={2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          CRASH WORM 3D
        </Text>
      </Canvas>
    </>
  );
}