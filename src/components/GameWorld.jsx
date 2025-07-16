import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { 
  Box, 
  Sphere, 
  Cylinder, 
  Plane, 
  Text3D, 
  Float,
  Sparkles,
  Trail,
  Gltf,
  useTexture,
  MeshWobbleMaterial,
  MeshDistortMaterial
} from '@react-three/drei';
import { 
  Vector3, 
  Color, 
  MathUtils,
  Box3,
  Matrix4 
} from 'three';
import * as THREE from 'three';
import { Physics, useBox, useSphere, usePlane, RigidBody } from '@react-three/rapier';
import { motion } from 'framer-motion-3d';
import { useGame, useGameActions } from '../context/GameContext';

// Configuración del mundo 3D
const WORLD_CONFIG = {
  size: { width: 100, height: 50, depth: 200 },
  gravity: [0, -9.81, 0],
  platforms: {
    count: 50,
    minSize: [2, 0.5, 2],
    maxSize: [6, 1, 6],
    spacing: 8
  },
  enemies: {
    count: 15,
    speed: 2,
    detectionRange: 10
  },
  collectibles: {
    gems: 40,
    powerUps: 8
  }
};

// Componente del Jugador (Gusano Cósmico)
function CosmicWorm({ position, onCollision, isPaused }) {
  const { state, actions } = useGame();
  const { camera } = useThree();
  const wormRef = useRef();
  const [velocity, setVelocity] = useState([0, 0, 0]);
  const [isGrounded, setIsGrounded] = useState(false);
  const [segments, setSegments] = useState([]);
  
  // Física del jugador
  const [ref, api] = useBox(() => ({
    mass: 1,
    position: position || [0, 5, 0],
    material: { friction: 0.4, restitution: 0.1 },
    onCollisionEnter: ({ other }) => {
      if (other.collisionFilterGroup === 2) { // Plataformas
        setIsGrounded(true);
      }
      if (onCollision) onCollision(other);
    }
  }));

  // Inicializar segmentos del gusano
  useEffect(() => {
    const newSegments = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      position: [0, 5 - i * 0.5, 0],
      scale: Math.max(0.3, 1 - i * 0.06),
      color: new Color().setHSL(0.9 - i * 0.02, 0.8, 0.6)
    }));
    setSegments(newSegments);
  }, []);

  // Controles del jugador
  useEffect(() => {
    const keys = state.input.keys;
    const handleKeyChange = (event) => {
      const isPressed = event.type === 'keydown';
      
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          actions.updateKeys({ forward: isPressed });
          break;
        case 'KeyS':
        case 'ArrowDown':
          actions.updateKeys({ backward: isPressed });
          break;
        case 'KeyA':
        case 'ArrowLeft':
          actions.updateKeys({ left: isPressed });
          break;
        case 'KeyD':
        case 'ArrowRight':
          actions.updateKeys({ right: isPressed });
          break;
        case 'Space':
          event.preventDefault();
          actions.updateKeys({ jump: isPressed });
          break;
        case 'ShiftLeft':
          actions.updateKeys({ dash: isPressed });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, [actions]);

  // Loop de actualización del jugador
  useFrame((frameState, delta) => {
    if (isPaused || !ref.current) return;

    const keys = state.input.keys;
    const speed = keys.dash ? 12 : 8;
    const jumpForce = 15;
    
    // Movimiento
    const movement = [0, 0, 0];
    
    if (keys.forward) movement[2] -= speed;
    if (keys.backward) movement[2] += speed * 0.5;
    if (keys.left) movement[0] -= speed;
    if (keys.right) movement[0] += speed;
    
    // Aplicar movimiento
    api.setLinvel([movement[0], velocity[1], movement[2]], false);
    
    // Salto
    if (keys.jump && isGrounded) {
      api.setLinvel([movement[0], jumpForce, movement[2]], false);
      setIsGrounded(false);
      actions.updateStatistics({ totalJumps: state.game.statistics.totalJumps + 1 });
    }

    // Actualizar posición del jugador en el estado
    if (ref.current) {
      const position = ref.current.translation();
      actions.updatePlayerPosition([position.x, position.y, position.z]);
      
      // Seguimiento de cámara suave
      const targetPosition = [
        position.x,
        position.y + 8,
        position.z + 15
      ];
      
      camera.position.lerp(
        new Vector3(...targetPosition),
        0.05
      );
      
      camera.lookAt(position.x, position.y + 2, position.z);
    }

    // Actualizar segmentos del gusano
    if (wormRef.current && segments.length > 0) {
      const headPosition = ref.current.translation();
      
      // Actualizar primer segmento (cabeza)
      segments[0].position = [headPosition.x, headPosition.y, headPosition.z];
      
      // Actualizar segmentos siguientes
      for (let i = 1; i < segments.length; i++) {
        const target = segments[i - 1].position;
        const current = segments[i].position;
        
        const dx = target[0] - current[0];
        const dy = target[1] - current[1];
        const dz = target[2] - current[2];
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const segmentDistance = 1.5;
        
        if (distance > segmentDistance) {
          const factor = (distance - segmentDistance) / distance;
          current[0] += dx * factor * 0.1;
          current[1] += dy * factor * 0.1;
          current[2] += dz * factor * 0.1;
        }
        
        // Ondulación natural
        const wave = Math.sin(frameState.clock.getElapsedTime() * 2 + i * 0.5) * 0.2;
        current[1] += wave;
      }
      
      setSegments([...segments]);
    }

    // Límites del mundo
    const position = ref.current.translation();
    if (position.y < -20) {
      // Respawn
      api.setTranslation([0, 10, 0], false);
      api.setLinvel([0, 0, 0], false);
      actions.updatePlayerHealth(state.player.health - 20);
      actions.shakeCamera(0.5);
    }
  });

  return (
    <group ref={wormRef}>
      {/* Física del jugador (invisible) */}
      <RigidBody ref={ref} colliders="ball" type="dynamic">
        <mesh visible={false}>
          <sphereGeometry args={[0.8]} />
        </mesh>
      </RigidBody>

      {/* Renderizar segmentos del gusano */}
      {segments.map((segment, index) => (
        <Float
          key={segment.id}
          speed={1 + index * 0.1}
          rotationIntensity={0.2}
          floatIntensity={0.1}
        >
          <mesh position={segment.position}>
            <sphereGeometry args={[segment.scale * 0.8]} />
            <MeshWobbleMaterial
              color={segment.color}
              speed={2}
              factor={0.1}
              wireframe={false}
            />
            
            {/* Ojos en la cabeza */}
            {index === 0 && (
              <>
                <mesh position={[-0.3, 0.2, 0.4]}>
                  <sphereGeometry args={[0.15]} />
                  <meshStandardMaterial color="white" />
                </mesh>
                <mesh position={[-0.3, 0.2, 0.45]}>
                  <sphereGeometry args={[0.08]} />
                  <meshStandardMaterial color="black" />
                </mesh>
                
                <mesh position={[0.3, 0.2, 0.4]}>
                  <sphereGeometry args={[0.15]} />
                  <meshStandardMaterial color="white" />
                </mesh>
                <mesh position={[0.3, 0.2, 0.45]}>
                  <sphereGeometry args={[0.08]} />
                  <meshStandardMaterial color="black" />
                </mesh>
              </>
            )}
            
            {/* Efectos de partículas en la cabeza */}
            {index === 0 && (
              <Sparkles
                count={50}
                scale={3}
                size={2}
                speed={0.4}
                color="#ff69b4"
              />
            )}
          </mesh>
        </Float>
      ))}

      {/* Trail del gusano */}
      <Trail
        width={2}
        length={10}
        color="#ff69b4"
        attenuation={(t) => t * t}
      >
        <mesh position={segments[0]?.position || [0, 0, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#ff69b4" transparent opacity={0} />
        </mesh>
      </Trail>
    </group>
  );
}

// Plataforma 3D
function Platform({ position, size, color = "#8B4513", type = "solid" }) {
  const [ref] = useBox(() => ({
    type: 'kinematicPosition',
    position,
    args: size,
    collisionFilterGroup: 2,
    material: { friction: 0.6, restitution: 0.1 }
  }));

  const [hovered, setHovered] = useState(false);
  
  return (
    <RigidBody ref={ref} type="fixed">
      <Box
        args={size}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <MeshDistortMaterial
          color={hovered ? "#A0522D" : color}
          distort={0.1}
          speed={2}
          roughness={0.8}
          metalness={0.2}
        />
      </Box>
      
      {/* Efectos de borde */}
      <Box args={[size[0] + 0.1, 0.05, size[2] + 0.1]} position={[0, size[1]/2, 0]}>
        <meshStandardMaterial
          color="#654321"
          emissive="#332211"
          emissiveIntensity={0.2}
        />
      </Box>
    </RigidBody>
  );
}

// Gema coleccionable
function Gem({ position, onCollect, value = 10, type = "normal" }) {
  const ref = useRef();
  const [collected, setCollected] = useState(false);
  
  const gemColor = type === "special" ? "#9932CC" : "#FFD700";
  const gemSize = type === "special" ? 0.6 : 0.4;

  useFrame((state) => {
    if (ref.current && !collected) {
      ref.current.rotation.y += 0.02;
      ref.current.rotation.x += 0.01;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  const handleCollision = () => {
    if (!collected) {
      setCollected(true);
      onCollect(value);
    }
  };

  if (collected) return null;

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
      <mesh
        ref={ref}
        position={position}
        onClick={handleCollision}
        castShadow
      >
        <octahedronGeometry args={[gemSize]} />
        <meshStandardMaterial
          color={gemColor}
          emissive={gemColor}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.1}
        />
        
        {/* Efectos de brillo */}
        <Sparkles
          count={20}
          scale={2}
          size={1}
          speed={0.6}
          color={gemColor}
        />
      </mesh>
      
      {/* Halo de luz */}
      <pointLight
        color={gemColor}
        intensity={0.5}
        distance={10}
        position={position}
      />
    </Float>
  );
}

// Enemigo 3D
function Enemy({ position, onDefeat, difficulty = 1 }) {
  const ref = useRef();
  const [health, setHealth] = useState(50 * difficulty);
  const [isAlive, setIsAlive] = useState(true);
  const [targetPosition, setTargetPosition] = useState(position);
  
  const enemyColor = `hsl(${0 + difficulty * 30}, 80%, 50%)`;

  useFrame((state) => {
    if (ref.current && isAlive) {
      // IA básica de patrullaje
      const time = state.clock.elapsedTime;
      const patrolRadius = 5;
      
      const newX = position[0] + Math.sin(time * 0.5) * patrolRadius;
      const newZ = position[2] + Math.cos(time * 0.3) * patrolRadius;
      
      ref.current.position.lerp(
        new Vector3(newX, position[1], newZ),
        0.02
      );
      
      // Rotación amenazante
      ref.current.rotation.y += 0.03;
      ref.current.rotation.x = Math.sin(time * 2) * 0.1;
    }
  });

  const handleDamage = () => {
    const newHealth = health - 25;
    setHealth(newHealth);
    
    if (newHealth <= 0) {
      setIsAlive(false);
      onDefeat(100);
    }
  };

  if (!isAlive) return null;

  return (
    <group ref={ref} position={position}>
      <Float speed={3} rotationIntensity={0.5} floatIntensity={0.3}>
        <mesh onClick={handleDamage} castShadow>
          <sphereGeometry args={[1]} />
          <MeshWobbleMaterial
            color={enemyColor}
            speed={2}
            factor={0.2}
          />
          
          {/* Ojos amenazantes */}
          <mesh position={[-0.4, 0.2, 0.6]}>
            <sphereGeometry args={[0.15]} />
            <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.4, 0.2, 0.6]}>
            <sphereGeometry args={[0.15]} />
            <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
          </mesh>
        </mesh>
        
        {/* Efectos de amenaza */}
        <Sparkles
          count={30}
          scale={4}
          size={1}
          speed={1}
          color="red"
        />
      </Float>
      
      {/* Barra de vida */}
      <sprite position={[0, 2, 0]} scale={[2, 0.2, 1]}>
        <spriteMaterial color="red" transparent opacity={0.8} />
      </sprite>
      <sprite position={[0, 2, 0]} scale={[(health / (50 * difficulty)) * 2, 0.15, 1]}>
        <spriteMaterial color="lime" transparent opacity={0.9} />
      </sprite>
    </group>
  );
}

// Componente principal del mundo
function GameWorld({ isPaused, onGameOver, onVictory, onStatsUpdate }) {
  const { state, actions } = useGame();
  const [platforms, setPlatforms] = useState([]);
  const [gems, setGems] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [worldGenerated, setWorldGenerated] = useState(false);

  // Generar mundo 3D
  useEffect(() => {
    if (worldGenerated) return;

    const newPlatforms = [];
    const newGems = [];
    const newEnemies = [];

    // Plataforma inicial
    newPlatforms.push({
      id: 0,
      position: [0, 0, 0],
      size: [8, 1, 8],
      color: "#8B4513",
      type: "solid"
    });

    // Generar plataformas en espiral ascendente
    for (let i = 1; i < WORLD_CONFIG.platforms.count; i++) {
      const angle = (i / WORLD_CONFIG.platforms.count) * Math.PI * 8;
      const radius = 15 + Math.sin(i * 0.1) * 10;
      const height = i * 2;
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius + i * 4;
      
      newPlatforms.push({
        id: i,
        position: [x, height, z],
        size: [
          MathUtils.randFloat(3, 6),
          MathUtils.randFloat(0.5, 1),
          MathUtils.randFloat(3, 6)
        ],
        color: `hsl(${(i * 137.508) % 360}, 70%, 50%)`,
        type: Math.random() > 0.8 ? "moving" : "solid"
      });

      // Gemas en las plataformas
      if (Math.random() > 0.4) {
        newGems.push({
          id: `gem-${i}`,
          position: [x, height + 2, z],
          value: Math.random() > 0.8 ? 50 : 10,
          type: Math.random() > 0.8 ? "special" : "normal"
        });
      }

      // Enemigos ocasionales
      if (Math.random() > 0.7 && i > 5) {
        newEnemies.push({
          id: `enemy-${i}`,
          position: [x, height + 1.5, z],
          difficulty: Math.min(3, Math.floor(i / 10) + 1)
        });
      }
    }

    setPlatforms(newPlatforms);
    setGems(newGems);
    setEnemies(newEnemies);
    setWorldGenerated(true);
  }, [worldGenerated]);

  // Manejar recolección de gemas
  const handleGemCollect = (value) => {
    actions.updateScore(value);
    actions.updateObjectives({ 
      gemsCollected: state.game.objectives.gemsCollected + 1 
    });
    
    // Efecto de sonido aquí
    actions.addNotification({
      type: 'gem',
      message: `+${value} puntos!`,
      duration: 2000
    });
  };

  // Manejar derrota de enemigos
  const handleEnemyDefeat = (points) => {
    actions.updateScore(points);
    actions.updateObjectives({ 
      enemiesKilled: state.game.objectives.enemiesKilled + 1 
    });
    actions.addExperience(40);
    
    actions.addNotification({
      type: 'enemy',
      message: `Enemigo derrotado! +${points}`,
      duration: 2000
    });

    // Verificar victoria
    if (state.game.objectives.enemiesKilled >= state.game.objectives.enemiesTarget) {
      onVictory();
    }
  };

  // Manejar colisión del jugador
  const handlePlayerCollision = (other) => {
    // Lógica de colisión personalizada
  };

  return (
    <Physics gravity={WORLD_CONFIG.gravity} debug={state.settings.graphics.quality === 'debug'}>
      {/* Suelo del mundo */}
      <RigidBody type="fixed">
        <Plane args={[200, 200]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} receiveShadow>
          <meshStandardMaterial color="#2d5a3d" />
        </Plane>
      </RigidBody>

      {/* Jugador */}
      <CosmicWorm
        position={[0, 5, 0]}
        onCollision={handlePlayerCollision}
        isPaused={isPaused}
      />

      {/* Plataformas */}
      {platforms.map(platform => (
        <Platform
          key={platform.id}
          position={platform.position}
          size={platform.size}
          color={platform.color}
          type={platform.type}
        />
      ))}

      {/* Gemas */}
      {gems.map(gem => (
        <Gem
          key={gem.id}
          position={gem.position}
          onCollect={handleGemCollect}
          value={gem.value}
          type={gem.type}
        />
      ))}

      {/* Enemigos */}
      {enemies.map(enemy => (
        <Enemy
          key={enemy.id}
          position={enemy.position}
          onDefeat={handleEnemyDefeat}
          difficulty={enemy.difficulty}
        />
      ))}

      {/* Iluminación ambiental */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Luces adicionales para ambiente */}
      <pointLight position={[0, 50, 0]} intensity={0.5} color="#87CEEB" />
      <spotLight
        position={[20, 30, 20]}
        angle={Math.PI / 6}
        penumbra={0.5}
        intensity={0.8}
        color="#FFD700"
        castShadow
      />

      {/* Efectos ambientales */}
      <fog attach="fog" args={['#87CEEB', 50, 200]} />
      
      {/* Skybox simple */}
      <mesh scale={[100, 100, 100]}>
        <sphereGeometry args={[1]} />
        <meshBasicMaterial 
          color="#87CEEB" 
          side={THREE.BackSide}
          transparent 
          opacity={0.8}
        />
      </mesh>
    </Physics>
  );
}

export default GameWorld;