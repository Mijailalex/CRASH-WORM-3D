import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, Box, Plane, Text, Environment, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// ========================================
// SISTEMA DE CONFIGURACIÓN AVANZADO
// ========================================

const GAME_CONFIG = {
  GRAPHICS: {
    QUALITY_LEVELS: {
      LOW: { shadows: false, particles: 50, bloom: false, postProcessing: false },
      MEDIUM: { shadows: true, particles: 100, bloom: true, postProcessing: false },
      HIGH: { shadows: true, particles: 200, bloom: true, postProcessing: true },
      ULTRA: { shadows: true, particles: 500, bloom: true, postProcessing: true, reflections: true }
    },
    AUTO_ADJUST: true,
    TARGET_FPS: 60,
    MIN_FPS: 30
  },
  PHYSICS: {
    GRAVITY: -9.81,
    TIME_STEP: 1/60,
    WORLD_BOUNDS: { x: 1000, y: 500, z: 3000 },
    COLLISION_GROUPS: {
      PLAYER: 1,
      ENEMY: 2,
      PLATFORM: 4,
      COLLECTIBLE: 8,
      PROJECTILE: 16
    }
  },
  GAMEPLAY: {
    PLAYER: {
      SPEED: 8,
      JUMP_FORCE: 15,
      DASH_FORCE: 20,
      HEALTH: 100,
      LIVES: 3,
      INVULNERABILITY_TIME: 2000
    },
    LEVELS: {
      MAX_PROCEDURAL_DEPTH: 10,
      CHUNK_SIZE: 500,
      PRELOAD_CHUNKS: 3,
      UNLOAD_DISTANCE: 1500
    }
  },
  AUDIO: {
    MASTER_VOLUME: 0.8,
    SFX_VOLUME: 0.7,
    MUSIC_VOLUME: 0.6,
    SPATIAL_AUDIO: true,
    REVERB_SETTINGS: {
      roomSize: 0.5,
      decay: 2.0,
      wet: 0.3
    }
  }
};

// ========================================
// SISTEMA DE GESTIÓN DE ESTADO GLOBAL
// ========================================

const GameContext = React.createContext();

const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    // Estado del juego
    phase: 'MENU', // MENU, LOADING, PLAYING, PAUSED, GAME_OVER, EDITOR
    currentLevel: 1,
    score: 0,
    highScore: localStorage.getItem('highScore') || 0,
    
    // Estado del jugador
    player: {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      health: GAME_CONFIG.GAMEPLAY.PLAYER.HEALTH,
      lives: GAME_CONFIG.GAMEPLAY.PLAYER.LIVES,
      gems: 0,
      powerUps: {},
      isInvulnerable: false,
      lastDamageTime: 0
    },
    
    // Configuración
    settings: {
      graphics: 'AUTO',
      audio: true,
      controls: 'KEYBOARD',
      difficulty: 'NORMAL'
    },
    
    // Estado del mundo
    world: {
      currentChunk: { x: 0, z: 0 },
      loadedChunks: new Set(),
      enemies: [],
      collectibles: [],
      platforms: [],
      effects: []
    },
    
    // Rendimiento
    performance: {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      qualityLevel: 'HIGH'
    },
    
    // Estadísticas
    stats: {
      enemiesDefeated: 0,
      gemsCollected: 0,
      jumpsPerformed: 0,
      distanceTraveled: 0,
      timePlayedSeconds: 0,
      achievements: []
    }
  });

  const updateGameState = useCallback((updates) => {
    setGameState(prev => {
      if (typeof updates === 'function') {
        return updates(prev);
      }
      return { ...prev, ...updates };
    });
  }, []);

  const value = useMemo(() => ({
    gameState,
    updateGameState,
    resetGame: () => setGameState(prev => ({
      ...prev,
      player: {
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        health: GAME_CONFIG.GAMEPLAY.PLAYER.HEALTH,
        lives: GAME_CONFIG.GAMEPLAY.PLAYER.LIVES,
        gems: 0,
        powerUps: {},
        isInvulnerable: false,
        lastDamageTime: 0
      },
      currentLevel: 1,
      score: 0
    }))
  }), [gameState, updateGameState]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

const useGame = () => {
  const context = React.useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

// ========================================
// SISTEMA DE GENERACIÓN PROCEDURAL DE NIVELES
// ========================================

class ProceduralLevelGenerator {
  constructor(config = {}) {
    this.config = {
      chunkSize: config.chunkSize || 500,
      platformDensity: config.platformDensity || 0.3,
      enemyDensity: config.enemyDensity || 0.1,
      gemDensity: config.gemDensity || 0.2,
      heightVariation: config.heightVariation || 100,
      biomes: config.biomes || ['forest', 'desert', 'ice', 'volcano', 'space'],
      ...config
    };
    
    this.noiseGenerator = this.initializeNoise();
    this.biomeTransitions = new Map();
    this.templateLibrary = this.initializeTemplates();
  }

  initializeNoise() {
    // Implementación de ruido Perlin simplificado
    const permutation = Array.from({ length: 256 }, (_, i) => i).sort(() => Math.random() - 0.5);
    const perm = [...permutation, ...permutation];
    
    return {
      noise2D: (x, y) => {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const a = perm[X] + Y;
        const b = perm[X + 1] + Y;
        
        return this.lerp(v,
          this.lerp(u, this.grad2D(perm[a], x, y), this.grad2D(perm[b], x - 1, y)),
          this.lerp(u, this.grad2D(perm[a + 1], x, y - 1), this.grad2D(perm[b + 1], x - 1, y - 1))
        );
      }
    };
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad2D(hash, x, y) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  initializeTemplates() {
    return {
      forest: {
        platforms: [
          { type: 'wood', color: '#8B4513', probability: 0.6 },
          { type: 'stone', color: '#696969', probability: 0.3 },
          { type: 'mushroom', color: '#FF6347', probability: 0.1 }
        ],
        enemies: [
          { type: 'squirrel', speed: 2, health: 20, probability: 0.4 },
          { type: 'bee', speed: 3, health: 10, probability: 0.3 },
          { type: 'bear', speed: 1, health: 50, probability: 0.1 }
        ],
        collectibles: [
          { type: 'acorn', value: 10, probability: 0.5 },
          { type: 'berry', value: 25, probability: 0.3 },
          { type: 'crystal', value: 100, probability: 0.05 }
        ]
      },
      desert: {
        platforms: [
          { type: 'sand', color: '#F4A460', probability: 0.5 },
          { type: 'rock', color: '#CD853F', probability: 0.4 },
          { type: 'cactus', color: '#228B22', probability: 0.1 }
        ],
        enemies: [
          { type: 'scorpion', speed: 1.5, health: 30, probability: 0.3 },
          { type: 'snake', speed: 2.5, health: 15, probability: 0.4 },
          { type: 'sandworm', speed: 1, health: 80, probability: 0.05 }
        ],
        collectibles: [
          { type: 'gold', value: 50, probability: 0.3 },
          { type: 'emerald', value: 75, probability: 0.2 },
          { type: 'artifact', value: 200, probability: 0.02 }
        ]
      }
    };
  }

  generateChunk(chunkX, chunkZ, biome = 'forest') {
    const chunk = {
      id: `${chunkX}_${chunkZ}`,
      position: { x: chunkX * this.config.chunkSize, z: chunkZ * this.config.chunkSize },
      biome,
      platforms: [],
      enemies: [],
      collectibles: [],
      decorations: []
    };

    const template = this.templateLibrary[biome];
    const baseHeight = this.noiseGenerator.noise2D(chunkX * 0.1, chunkZ * 0.1) * this.config.heightVariation;

    // Generar plataformas
    for (let x = 0; x < 20; x++) {
      for (let z = 0; z < 20; z++) {
        if (Math.random() < this.config.platformDensity) {
          const worldX = chunk.position.x + (x * 25);
          const worldZ = chunk.position.z + (z * 25);
          const height = baseHeight + this.noiseGenerator.noise2D(worldX * 0.05, worldZ * 0.05) * 50;

          const platformType = this.selectRandomFromProbability(template.platforms);
          
          chunk.platforms.push({
            id: `platform_${worldX}_${worldZ}`,
            position: { x: worldX, y: height, z: worldZ },
            size: { x: 20 + Math.random() * 10, y: 5, z: 20 + Math.random() * 10 },
            type: platformType.type,
            color: platformType.color,
            rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
            material: this.generatePlatformMaterial(platformType.type),
            isMoving: Math.random() < 0.1,
            movementPattern: Math.random() < 0.1 ? this.generateMovementPattern() : null
          });
        }
      }
    }

    // Generar enemigos
    const enemyCount = Math.floor(this.config.enemyDensity * chunk.platforms.length);
    for (let i = 0; i < enemyCount; i++) {
      if (chunk.platforms.length > 0) {
        const platform = chunk.platforms[Math.floor(Math.random() * chunk.platforms.length)];
        const enemyType = this.selectRandomFromProbability(template.enemies);
        
        chunk.enemies.push({
          id: `enemy_${chunk.id}_${i}`,
          type: enemyType.type,
          position: {
            x: platform.position.x + (Math.random() - 0.5) * platform.size.x,
            y: platform.position.y + platform.size.y + 10,
            z: platform.position.z + (Math.random() - 0.5) * platform.size.z
          },
          velocity: { x: 0, y: 0, z: 0 },
          health: enemyType.health,
          maxHealth: enemyType.health,
          speed: enemyType.speed,
          ai: this.generateAIBehavior(enemyType.type),
          patrol: {
            center: { ...platform.position },
            radius: Math.min(platform.size.x, platform.size.z) / 2,
            angle: Math.random() * Math.PI * 2
          }
        });
      }
    }

    // Generar coleccionables
    const collectibleCount = Math.floor(this.config.gemDensity * chunk.platforms.length);
    for (let i = 0; i < collectibleCount; i++) {
      if (chunk.platforms.length > 0) {
        const platform = chunk.platforms[Math.floor(Math.random() * chunk.platforms.length)];
        const collectibleType = this.selectRandomFromProbability(template.collectibles);
        
        chunk.collectibles.push({
          id: `collectible_${chunk.id}_${i}`,
          type: collectibleType.type,
          value: collectibleType.value,
          position: {
            x: platform.position.x + (Math.random() - 0.5) * platform.size.x * 0.8,
            y: platform.position.y + platform.size.y + 15 + Math.sin(Date.now() * 0.001 + i) * 5,
            z: platform.position.z + (Math.random() - 0.5) * platform.size.z * 0.8
          },
          rotation: { x: 0, y: 0, z: 0 },
          animation: {
            type: 'float',
            speed: 0.02 + Math.random() * 0.01,
            amplitude: 5 + Math.random() * 3,
            phase: Math.random() * Math.PI * 2
          },
          effect: {
            particles: true,
            glow: true,
            sound: `collect_${collectibleType.type}`
          }
        });
      }
    }

    return chunk;
  }

  selectRandomFromProbability(items) {
    const random = Math.random();
    let cumulative = 0;
    
    for (const item of items) {
      cumulative += item.probability;
      if (random <= cumulative) {
        return item;
      }
    }
    
    return items[items.length - 1];
  }

  generatePlatformMaterial(type) {
    const materials = {
      wood: { roughness: 0.8, metalness: 0.1, color: '#8B4513' },
      stone: { roughness: 0.9, metalness: 0.0, color: '#696969' },
      sand: { roughness: 1.0, metalness: 0.0, color: '#F4A460' },
      ice: { roughness: 0.1, metalness: 0.0, color: '#87CEEB', transparent: true, opacity: 0.8 },
      metal: { roughness: 0.2, metalness: 0.9, color: '#C0C0C0' }
    };
    
    return materials[type] || materials.stone;
  }

  generateMovementPattern() {
    const patterns = ['horizontal', 'vertical', 'circular', 'pendulum'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    return {
      type: pattern,
      speed: 0.5 + Math.random() * 1.5,
      amplitude: 50 + Math.random() * 100,
      phase: Math.random() * Math.PI * 2
    };
  }

  generateAIBehavior(enemyType) {
    const behaviors = {
      squirrel: { type: 'patrol', aggressiveness: 0.3, detectionRange: 100 },
      bee: { type: 'swarm', aggressiveness: 0.5, detectionRange: 150 },
      bear: { type: 'guard', aggressiveness: 0.8, detectionRange: 200 },
      scorpion: { type: 'ambush', aggressiveness: 0.6, detectionRange: 80 },
      snake: { type: 'chase', aggressiveness: 0.7, detectionRange: 120 }
    };
    
    return behaviors[enemyType] || behaviors.squirrel;
  }
}

// ========================================
// SISTEMA DE GESTIÓN DE RENDIMIENTO
// ========================================

class PerformanceManager {
  constructor() {
    this.fps = 60;
    this.frameTime = 16.67;
    this.frameTimes = [];
    this.maxFrameTimeHistory = 60;
    this.qualityLevel = 'HIGH';
    this.autoAdjustEnabled = true;
    this.lastAdjustment = 0;
    this.adjustmentCooldown = 5000; // 5 segundos
  }

  update(deltaTime) {
    this.frameTime = deltaTime;
    this.frameTimes.push(deltaTime);
    
    if (this.frameTimes.length > this.maxFrameTimeHistory) {
      this.frameTimes.shift();
    }
    
    this.fps = 1000 / this.getAverageFrameTime();
    
    if (this.autoAdjustEnabled && Date.now() - this.lastAdjustment > this.adjustmentCooldown) {
      this.adjustQuality();
    }
  }

  getAverageFrameTime() {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  adjustQuality() {
    const avgFps = this.fps;
    const currentTime = Date.now();
    
    if (avgFps < GAME_CONFIG.GRAPHICS.MIN_FPS && this.qualityLevel !== 'LOW') {
      // Reducir calidad
      const levels = ['ULTRA', 'HIGH', 'MEDIUM', 'LOW'];
      const currentIndex = levels.indexOf(this.qualityLevel);
      if (currentIndex < levels.length - 1) {
        this.qualityLevel = levels[currentIndex + 1];
        this.lastAdjustment = currentTime;
        console.log(`Performance: Calidad reducida a ${this.qualityLevel} (FPS: ${avgFps.toFixed(1)})`);
      }
    } else if (avgFps > GAME_CONFIG.GRAPHICS.TARGET_FPS + 10 && this.qualityLevel !== 'ULTRA') {
      // Aumentar calidad
      const levels = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
      const currentIndex = levels.indexOf(this.qualityLevel);
      if (currentIndex < levels.length - 1) {
        this.qualityLevel = levels[currentIndex + 1];
        this.lastAdjustment = currentTime;
        console.log(`Performance: Calidad aumentada a ${this.qualityLevel} (FPS: ${avgFps.toFixed(1)})`);
      }
    }
  }

  getQualitySettings() {
    return GAME_CONFIG.GRAPHICS.QUALITY_LEVELS[this.qualityLevel];
  }
}

// ========================================
// COMPONENTES DE JUGADOR AVANZADO
// ========================================

const Player = ({ position, onPositionChange, onCollectGem, onDamage }) => {
  const { gameState, updateGameState } = useGame();
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const [isJumping, setIsJumping] = useState(false);
  const [isDashing, setIsDashing] = useState(false);
  const [lastDashTime, setLastDashTime] = useState(0);
  
  const keys = useRef({
    w: false, a: false, s: false, d: false,
    space: false, shift: false
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key] = true;
      }
      if (event.code === 'Space') {
        keys.current.space = true;
        event.preventDefault();
      }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        keys.current.shift = true;
      }
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key] = false;
      }
      if (event.code === 'Space') {
        keys.current.space = false;
      }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        keys.current.shift = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current || gameState.phase !== 'PLAYING') return;

    const { PLAYER } = GAME_CONFIG.GAMEPLAY;
    const velocity = rigidBodyRef.current.linvel();
    const currentPos = rigidBodyRef.current.translation();

    // Movimiento horizontal
    let moveX = 0;
    let moveZ = 0;

    if (keys.current.a) moveX -= 1;
    if (keys.current.d) moveX += 1;
    if (keys.current.w) moveZ -= 1;
    if (keys.current.s) moveZ += 1;

    // Normalizar movimiento diagonal
    if (moveX !== 0 && moveZ !== 0) {
      moveX *= 0.707;
      moveZ *= 0.707;
    }

    // Aplicar dash
    const currentTime = Date.now();
    let speedMultiplier = 1;
    
    if (keys.current.shift && currentTime - lastDashTime > 1000) {
      setIsDashing(true);
      setLastDashTime(currentTime);
      speedMultiplier = PLAYER.DASH_FORCE / PLAYER.SPEED;
      
      setTimeout(() => setIsDashing(false), 300);
    }

    // Aplicar movimiento
    const speed = PLAYER.SPEED * speedMultiplier;
    const newVelX = moveX * speed;
    const newVelZ = moveZ * speed;

    // Salto
    if (keys.current.space && Math.abs(velocity.y) < 0.1 && !isJumping) {
      rigidBodyRef.current.setLinvel({ x: newVelX, y: PLAYER.JUMP_FORCE, z: newVelZ }, true);
      setIsJumping(true);
      
      updateGameState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          jumpsPerformed: prev.stats.jumpsPerformed + 1
        }
      }));
    } else {
      rigidBodyRef.current.setLinvel({ x: newVelX, y: velocity.y, z: newVelZ }, true);
    }

    // Detectar aterrizaje
    if (isJumping && Math.abs(velocity.y) < 0.1) {
      setIsJumping(false);
    }

    // Actualizar posición en el contexto
    if (onPositionChange) {
      onPositionChange({
        x: currentPos.x,
        y: currentPos.y,
        z: currentPos.z
      });
    }

    // Rotación del modelo basada en movimiento
    if (meshRef.current && (moveX !== 0 || moveZ !== 0)) {
      const targetRotation = Math.atan2(moveX, moveZ);
      meshRef.current.rotation.y += (targetRotation - meshRef.current.rotation.y) * 0.1;
    }

    // Efectos visuales
    if (meshRef.current) {
      // Squash and stretch en saltos
      const stretchY = isJumping ? 1.2 - Math.abs(velocity.y) * 0.02 : 1;
      const squashXZ = isJumping ? 1 + Math.abs(velocity.y) * 0.01 : 1;
      
      meshRef.current.scale.set(squashXZ, stretchY, squashXZ);
      
      // Glow cuando hace dash
      if (isDashing) {
        meshRef.current.material.emissive.setHex(0x4444ff);
        meshRef.current.material.emissiveIntensity = 0.5;
      } else {
        meshRef.current.material.emissive.setHex(0x000000);
        meshRef.current.material.emissiveIntensity = 0;
      }
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[position.x, position.y + 2, position.z]}
      colliders="ball"
      mass={1}
      linearDamping={0.5}
      angularDamping={0.8}
      onCollisionEnter={({ other }) => {
        // Lógica de colisión con enemigos y coleccionables
        if (other.rigidBodyObject?.userData?.type === 'enemy') {
          if (!gameState.player.isInvulnerable) {
            onDamage?.(20);
          }
        } else if (other.rigidBodyObject?.userData?.type === 'collectible') {
          onCollectGem?.(other.rigidBodyObject.userData);
        }
      }}
    >
      <Sphere ref={meshRef} args={[1]} castShadow receiveShadow>
        <meshStandardMaterial
          color="#FF1493"
          roughness={0.3}
          metalness={0.1}
          emissive="#000000"
        />
      </Sphere>
      
      {/* Partículas de rastro */}
      {(isDashing || isJumping) && (
        <ParticleTrail 
          active={isDashing || isJumping}
          color={isDashing ? "#4444ff" : "#ffffff"}
          intensity={isDashing ? 1.0 : 0.5}
        />
      )}
    </RigidBody>
  );
};

// ========================================
// SISTEMA DE PARTÍCULAS
// ========================================

const ParticleTrail = ({ active, color = "#ffffff", intensity = 1.0 }) => {
  const pointsRef = useRef();
  const particleCount = 50;
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      
      vel[i * 3] = (Math.random() - 0.5) * 0.1;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
    
    return [pos, vel];
  }, [particleCount]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !active) return;
    
    const pos = pointsRef.current.geometry.attributes.position.array;
    
    for (let i = 0; i < particleCount; i++) {
      // Actualizar posiciones
      pos[i * 3] += velocities[i * 3] * delta * 60;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60;
      
      // Resetear partículas que se alejan mucho
      const distance = Math.sqrt(pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2);
      if (distance > 5) {
        pos[i * 3] = (Math.random() - 0.5) * 0.5;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.1}
        transparent
        opacity={0.6 * intensity}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ========================================
// SISTEMA DE ENEMIGOS CON IA
// ========================================

const Enemy = ({ enemyData, playerPosition, onDestroy }) => {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  const [health, setHealth] = useState(enemyData.health);
  const [isChasing, setIsChasing] = useState(false);
  const [patrolTarget, setPatrolTarget] = useState({ x: 0, z: 0 });

  useFrame((state, delta) => {
    if (!rigidBodyRef.current || health <= 0) return;

    const currentPos = rigidBodyRef.current.translation();
    const distanceToPlayer = Math.sqrt(
      (currentPos.x - playerPosition.x) ** 2 +
      (currentPos.z - playerPosition.z) ** 2
    );

    // IA basada en comportamiento
    switch (enemyData.ai.type) {
      case 'patrol':
        if (distanceToPlayer < enemyData.ai.detectionRange) {
          setIsChasing(true);
          // Mover hacia el jugador
          const dirX = (playerPosition.x - currentPos.x) / distanceToPlayer;
          const dirZ = (playerPosition.z - currentPos.z) / distanceToPlayer;
          
          rigidBodyRef.current.setLinvel({
            x: dirX * enemyData.speed,
            y: rigidBodyRef.current.linvel().y,
            z: dirZ * enemyData.speed
          }, true);
        } else {
          setIsChasing(false);
          // Patrullar
          const patrolDistance = Math.sqrt(
            (currentPos.x - enemyData.patrol.center.x) ** 2 +
            (currentPos.z - enemyData.patrol.center.z) ** 2
          );
          
          if (patrolDistance > enemyData.patrol.radius) {
            const dirX = (enemyData.patrol.center.x - currentPos.x) / patrolDistance;
            const dirZ = (enemyData.patrol.center.z - currentPos.z) / patrolDistance;
            
            rigidBodyRef.current.setLinvel({
              x: dirX * enemyData.speed * 0.5,
              y: rigidBodyRef.current.linvel().y,
              z: dirZ * enemyData.speed * 0.5
            }, true);
          }
        }
        break;
        
      case 'chase':
        if (distanceToPlayer < enemyData.ai.detectionRange) {
          const dirX = (playerPosition.x - currentPos.x) / distanceToPlayer;
          const dirZ = (playerPosition.z - currentPos.z) / distanceToPlayer;
          
          rigidBodyRef.current.setLinvel({
            x: dirX * enemyData.speed * 1.5,
            y: rigidBodyRef.current.linvel().y,
            z: dirZ * enemyData.speed * 1.5
          }, true);
        }
        break;
    }

    // Animación visual
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (isChasing ? 4 : 2);
      
      // Cambio de color según estado
      const material = meshRef.current.material;
      if (isChasing) {
        material.color.setHex(0xff4444);
        material.emissive.setHex(0x220000);
      } else {
        material.color.setHex(0xff8844);
        material.emissive.setHex(0x000000);
      }
    }
  });

  const takeDamage = (damage) => {
    setHealth(prev => {
      const newHealth = prev - damage;
      if (newHealth <= 0) {
        onDestroy?.(enemyData.id);
      }
      return newHealth;
    });
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[enemyData.position.x, enemyData.position.y, enemyData.position.z]}
      colliders="ball"
      mass={0.5}
      userData={{ type: 'enemy', id: enemyData.id, takeDamage }}
    >
      <Sphere ref={meshRef} args={[0.8]} castShadow>
        <meshStandardMaterial
          color="#ff8844"
          roughness={0.4}
          metalness={0.2}
        />
      </Sphere>
      
      {/* Barra de vida */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {health}/{enemyData.maxHealth}
      </Text>
    </RigidBody>
  );
};

// ========================================
// COLECCIONABLES ANIMADOS
// ========================================

const Collectible = ({ collectibleData, onCollect }) => {
  const meshRef = useRef();
  const rigidBodyRef = useRef();
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Animación de flotación
    const time = state.clock.elapsedTime;
    const floatY = Math.sin(time * collectibleData.animation.speed + collectibleData.animation.phase) * collectibleData.animation.amplitude;
    
    // Rotación
    meshRef.current.rotation.x += delta * 2;
    meshRef.current.rotation.y += delta * 3;
    
    // Actualizar posición de flotación
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setTranslation({
        x: collectibleData.position.x,
        y: collectibleData.position.y + floatY * 0.1,
        z: collectibleData.position.z
      }, true);
    }
  });

  const getGemColor = () => {
    const colors = {
      acorn: "#8B4513",
      berry: "#DC143C",
      crystal: "#9932CC",
      gold: "#FFD700",
      emerald: "#50C878",
      artifact: "#FF1493"
    };
    return colors[collectibleData.type] || "#FFD700";
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[collectibleData.position.x, collectibleData.position.y, collectibleData.position.z]}
      colliders="ball"
      sensor
      userData={{ type: 'collectible', data: collectibleData }}
      onIntersectionEnter={() => onCollect?.(collectibleData)}
    >
      <Box ref={meshRef} args={[0.8, 0.8, 0.8]} castShadow>
        <meshStandardMaterial
          color={getGemColor()}
          roughness={0.1}
          metalness={0.8}
          emissive={getGemColor()}
          emissiveIntensity={0.2}
        />
      </Box>
      
      {/* Efecto de brillo */}
      <pointLight
        color={getGemColor()}
        intensity={0.5}
        distance={10}
        decay={2}
      />
    </RigidBody>
  );
};

// ========================================
// MUNDO DEL JUEGO PRINCIPAL
// ========================================

const GameWorld = () => {
  const { gameState, updateGameState } = useGame();
  const [chunks, setChunks] = useState(new Map());
  const [performanceManager] = useState(() => new PerformanceManager());
  const [levelGenerator] = useState(() => new ProceduralLevelGenerator());
  const playerPositionRef = useRef({ x: 0, y: 0, z: 0 });
  
  // Cargar chunks basado en la posición del jugador
  useEffect(() => {
    const playerChunkX = Math.floor(playerPositionRef.current.x / GAME_CONFIG.GAMEPLAY.LEVELS.CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPositionRef.current.z / GAME_CONFIG.GAMEPLAY.LEVELS.CHUNK_SIZE);
    
    const newChunks = new Map();
    
    // Cargar chunks en un radio alrededor del jugador
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const chunkX = playerChunkX + x;
        const chunkZ = playerChunkZ + z;
        const chunkKey = `${chunkX}_${chunkZ}`;
        
        if (!chunks.has(chunkKey)) {
          const biome = Math.abs(chunkX + chunkZ) % 2 === 0 ? 'forest' : 'desert';
          const chunk = levelGenerator.generateChunk(chunkX, chunkZ, biome);
          newChunks.set(chunkKey, chunk);
        } else {
          newChunks.set(chunkKey, chunks.get(chunkKey));
        }
      }
    }
    
    setChunks(newChunks);
  }, [playerPositionRef.current.x, playerPositionRef.current.z]);

  const handlePlayerPositionChange = useCallback((newPosition) => {
    playerPositionRef.current = newPosition;
    
    updateGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        position: newPosition
      }
    }));
  }, [updateGameState]);

  const handleCollectGem = useCallback((gemData) => {
    updateGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        gems: prev.player.gems + gemData.value
      },
      score: prev.score + gemData.value * 10,
      stats: {
        ...prev.stats,
        gemsCollected: prev.stats.gemsCollected + 1
      }
    }));
  }, [updateGameState]);

  const handlePlayerDamage = useCallback((damage) => {
    const currentTime = Date.now();
    
    updateGameState(prev => {
      if (prev.player.isInvulnerable) return prev;
      
      const newHealth = Math.max(0, prev.player.health - damage);
      const newLives = newHealth <= 0 ? prev.player.lives - 1 : prev.player.lives;
      
      return {
        ...prev,
        player: {
          ...prev.player,
          health: newHealth > 0 ? newHealth : 100,
          lives: newLives,
          isInvulnerable: true,
          lastDamageTime: currentTime
        }
      };
    });
    
    // Remover invulnerabilidad después de un tiempo
    setTimeout(() => {
      updateGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          isInvulnerable: false
        }
      }));
    }, GAME_CONFIG.GAMEPLAY.PLAYER.INVULNERABILITY_TIME);
  }, [updateGameState]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 10, 10], fov: 75 }}
      gl={{ 
        antialias: true, 
        powerPreference: "high-performance",
        stencil: false,
        depth: true
      }}
    >
      {/* Iluminación */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 50, 50]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {/* Física */}
      <Physics gravity={[0, GAME_CONFIG.PHYSICS.GRAVITY, 0]}>
        {/* Jugador */}
        <Player
          position={gameState.player.position}
          onPositionChange={handlePlayerPositionChange}
          onCollectGem={handleCollectGem}
          onDamage={handlePlayerDamage}
        />

        {/* Renderizar chunks cargados */}
        {Array.from(chunks.values()).map(chunk => (
          <React.Fragment key={chunk.id}>
            {/* Plataformas */}
            {chunk.platforms.map(platform => (
              <RigidBody
                key={platform.id}
                position={[platform.position.x, platform.position.y, platform.position.z]}
                rotation={[platform.rotation.x, platform.rotation.y, platform.rotation.z]}
                type="kinematicPosition"
                colliders="cuboid"
              >
                <Box
                  args={[platform.size.x, platform.size.y, platform.size.z]}
                  castShadow
                  receiveShadow
                >
                  <meshStandardMaterial
                    color={platform.color}
                    roughness={platform.material.roughness}
                    metalness={platform.material.metalness}
                    transparent={platform.material.transparent}
                    opacity={platform.material.opacity || 1}
                  />
                </Box>
              </RigidBody>
            ))}

            {/* Enemigos */}
            {chunk.enemies.map(enemy => (
              <Enemy
                key={enemy.id}
                enemyData={enemy}
                playerPosition={playerPositionRef.current}
                onDestroy={(enemyId) => {
                  updateGameState(prev => ({
                    ...prev,
                    stats: {
                      ...prev.stats,
                      enemiesDefeated: prev.stats.enemiesDefeated + 1
                    }
                  }));
                }}
              />
            ))}

            {/* Coleccionables */}
            {chunk.collectibles.map(collectible => (
              <Collectible
                key={collectible.id}
                collectibleData={collectible}
                onCollect={handleCollectGem}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Suelo invisible para evitar caídas infinitas */}
        <RigidBody position={[0, -100, 0]} type="fixed" colliders="cuboid">
          <Box args={[10000, 1, 10000]} visible={false} />
        </RigidBody>
      </Physics>

      {/* Entorno */}
      <Environment preset="sunset" />
      
      {/* Cámara que sigue al jugador */}
      <CameraController playerPosition={playerPositionRef.current} />

      {/* Post-procesamiento */}
      {performanceManager.getQualitySettings().postProcessing && (
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.9} />
          <ChromaticAberration offset={[0.002, 0.002]} />
          <Vignette darkness={0.5} offset={0.3} />
        </EffectComposer>
      )}
    </Canvas>
  );
};

// ========================================
// CONTROLADOR DE CÁMARA
// ========================================

const CameraController = ({ playerPosition }) => {
  const { camera } = useThree();
  
  useFrame(() => {
    // Posición objetivo de la cámara
    const targetX = playerPosition.x;
    const targetY = playerPosition.y + 15;
    const targetZ = playerPosition.z + 20;
    
    // Suavizar movimiento de cámara
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z += (targetZ - camera.position.z) * 0.05;
    
    // Hacer que la cámara mire al jugador
    camera.lookAt(playerPosition.x, playerPosition.y + 2, playerPosition.z);
  });
  
  return null;
};

// ========================================
// HUD Y UI DEL JUEGO
// ========================================

const GameHUD = () => {
  const { gameState } = useGame();
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      {/* Stats principales */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.8)',
        padding: '20px',
        borderRadius: '12px',
        color: 'white',
        fontSize: '16px',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(255,255,255,0.2)'
      }}>
        <div>❤️ Vida: {gameState.player.health}/100</div>
        <div>💖 Vidas: {gameState.player.lives}</div>
        <div>💎 Gemas: {gameState.player.gems}</div>
        <div>🏆 Puntos: {gameState.score.toLocaleString()}</div>
        <div>🎯 Nivel: {gameState.currentLevel}</div>
      </div>

      {/* Minimapa */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '200px',
        height: '200px',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '12px',
        border: '2px solid rgba(255,255,255,0.2)',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '6px',
          height: '6px',
          background: '#FF1493',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2
        }} />
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: 'white',
          fontSize: '12px'
        }}>
          Minimapa
        </div>
      </div>

      {/* Barra de experiencia */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '400px',
        height: '20px',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: '10px',
        border: '2px solid rgba(255,255,255,0.2)',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${(gameState.stats.gemsCollected % 100)}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #FFD700, #FFA500)',
          borderRadius: '8px',
          transition: 'width 0.3s ease'
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          EXP: {gameState.stats.gemsCollected % 100}/100
        </div>
      </div>

      {/* Indicador de invulnerabilidad */}
      {gameState.player.isInvulnerable && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#FF4444',
          fontSize: '24px',
          fontWeight: 'bold',
          animation: 'blink 0.5s infinite'
        }}>
          ¡INVULNERABLE!
        </div>
      )}
    </div>
  );
};

// ========================================
// MENÚ PRINCIPAL
// ========================================

const MainMenu = () => {
  const { gameState, updateGameState } = useGame();
  const [selectedDifficulty, setSelectedDifficulty] = useState('NORMAL');

  const startGame = () => {
    updateGameState({
      phase: 'LOADING',
      settings: {
        ...gameState.settings,
        difficulty: selectedDifficulty
      }
    });

    // Simular carga
    setTimeout(() => {
      updateGameState({ phase: 'PLAYING' });
    }, 2000);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #2d4a7a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Orbitron, sans-serif'
    }}>
      <h1 style={{
        fontSize: '4rem',
        marginBottom: '2rem',
        background: 'linear-gradient(45deg, #FF6B35, #FFD700)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent'
      }}>
        Crash Worm 3D
      </h1>

      <p style={{
        fontSize: '1.5rem',
        marginBottom: '3rem',
        textAlign: 'center',
        maxWidth: '800px'
      }}>
        Aventura épica del gusano cósmico con gráficos premium y física realista
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <button
          onClick={startGame}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.5rem',
            background: 'linear-gradient(45deg, #FF6B35, #FFD700)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          🚀 Comenzar Aventura
        </button>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          style={{
            padding: '0.5rem',
            fontSize: '1rem',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '4px'
          }}
        >
          <option value="EASY">🟢 Fácil</option>
          <option value="NORMAL">🟡 Normal</option>
          <option value="HARD">🔴 Difícil</option>
          <option value="EXTREME">⚫ Extremo</option>
        </select>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        maxWidth: '600px',
        fontSize: '0.9rem',
        opacity: 0.8
      }}>
        <div>🎮 WASD - Movimiento</div>
        <div>⚡ Espacio - Saltar</div>
        <div>🏃 Shift - Dash</div>
        <div>⏸️ ESC - Pausar</div>
      </div>
    </div>
  );
};

// ========================================
// PANTALLA DE CARGA
// ========================================

const LoadingScreen = () => {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #2d4a7a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Orbitron, sans-serif'
    }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
        Generando Mundo 3D...
      </h2>

      <div style={{
        width: '400px',
        height: '20px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${loadingProgress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00FFFF, #40E0D0)',
          borderRadius: '10px',
          transition: 'width 0.3s ease'
        }} />
      </div>

      <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
        {Math.round(loadingProgress)}%
      </p>
    </div>
  );
};

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const CrashWorm3DAdvanced = () => {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
};

const GameContent = () => {
  const { gameState } = useGame();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {gameState.phase === 'MENU' && <MainMenu />}
      {gameState.phase === 'LOADING' && <LoadingScreen />}
      {gameState.phase === 'PLAYING' && (
        <>
          <GameWorld />
          <GameHUD />
        </>
      )}
      
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CrashWorm3DAdvanced;