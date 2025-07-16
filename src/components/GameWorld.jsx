// ========================================
// SISTEMA DE INTEGRACIÓN COMPLETO
// Conecta todos los sistemas avanzados
// ========================================

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { 
  Sphere, Box, Plane, Text, Environment, PerspectiveCamera, 
  OrbitControls, Sky, Cloud, Stars, Html, Billboard,
  useTexture, useFBX, useGLTF, Shadow, ContactShadows
} from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, SSAO, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';

// Importar sistemas avanzados
import { AdvancedPhysicsSystem, AISystem, ProceduralSystem } from './AdvancedSystems';
import { PerformanceManager, VFXSystem, ResourceManager } from './PerformanceAndEffects';
import { useGameEngine } from '../hooks/useGameEngine';
import { useAudioManager } from '../hooks/useAudioManager';
import { useGame } from '../context/GameContext';

// Importar componentes mejorados
import { Player, Enemies, Collectibles, Platforms, GameUI } from './GameComponents';

// ========================================
// GAMEWORLD MEJORADO CON TODOS LOS SISTEMAS
// ========================================

export function GameWorld({ onGameEvent }) {
  const { scene, camera, gl: renderer } = useThree();
  const { state, actions } = useGame();
  const { playSound, setListenerPosition } = useAudioManager();
  
  // Referencias a sistemas
  const performanceManagerRef = useRef();
  const vfxSystemRef = useRef();
  const resourceManagerRef = useRef();
  const physicsSystemRef = useRef();
  const aiSystemRef = useRef();
  const proceduralSystemRef = useRef();
  
  // Estado del mundo
  const [worldState, setWorldState] = useState({
    isLoaded: false,
    currentChunk: { x: 0, z: 0 },
    loadedChunks: new Map(),
    playerPosition: { x: 0, y: 0, z: 0 },
    qualityLevel: 'high',
    debugMode: false
  });

  const [dynamicContent, setDynamicContent] = useState({
    platforms: [],
    enemies: [],
    collectibles: [],
    effects: []
  });

  // Configuración de calidad adaptativa
  const [qualitySettings, setQualitySettings] = useState({
    shadowMapSize: 1024,
    particleCount: 3000,
    viewDistance: 400,
    LOD: true,
    antialiasing: true,
    postProcessing: true,
    physicsSteps: 6
  });

  // ========================================
  // INICIALIZACIÓN DE SISTEMAS
  // ========================================

  useEffect(() => {
    const initializeSystems = async () => {
      try {
        console.log('🚀 Inicializando sistemas avanzados...');

        // 1. Performance Manager
        performanceManagerRef.current = new PerformanceManager({
          targetFPS: 60,
          adaptiveQuality: true,
          profilingEnabled: process.env.NODE_ENV === 'development'
        });

        // 2. Resource Manager
        resourceManagerRef.current = new ResourceManager();
        await resourceManagerRef.current.preloadCriticalResources();

        // 3. VFX System
        vfxSystemRef.current = new VFXSystem(scene, {
          maxParticles: qualitySettings.particleCount
        });

        // 4. Physics System
        physicsSystemRef.current = new AdvancedPhysicsSystem({
          gravity: { x: 0, y: -9.81, z: 0 },
          maxVelocity: 50
        });

        // 5. AI System
        aiSystemRef.current = new AISystem();

        // 6. Procedural System
        proceduralSystemRef.current = new ProceduralSystem({
          chunkSize: 100,
          maxChunks: 9
        });

        // Configurar event listeners
        setupSystemEventListeners();

        // Generar chunk inicial
        generateInitialWorld();

        setWorldState(prev => ({ ...prev, isLoaded: true }));
        console.log('✅ Todos los sistemas inicializados correctamente');

      } catch (error) {
        console.error('❌ Error inicializando sistemas:', error);
        onGameEvent?.({ type: 'systemError', error });
      }
    };

    initializeSystems();

    return () => {
      cleanupSystems();
    };
  }, [scene]);

  const setupSystemEventListeners = useCallback(() => {
    // Listener para cambios de calidad
    const handleQualityChange = (event) => {
      const { quality, settings } = event.detail;
      setQualitySettings(settings);
      setWorldState(prev => ({ ...prev, qualityLevel: quality }));
      
      // Actualizar VFX System
      if (vfxSystemRef.current) {
        vfxSystemRef.current.config.maxParticles = settings.particleCount;
      }
      
      console.log(`🎨 Calidad actualizada a: ${quality}`);
    };

    window.addEventListener('qualityChanged', handleQualityChange);

    return () => {
      window.removeEventListener('qualityChanged', handleQualityChange);
    };
  }, []);

  const generateInitialWorld = useCallback(() => {
    if (!proceduralSystemRef.current) return;

    // Generar chunks iniciales (3x3 grid alrededor del origen)
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const biome = Math.abs(x + z) % 2 === 0 ? 'forest' : 'desert';
        const chunk = proceduralSystemRef.current.generateChunk(x, z, biome);
        
        setWorldState(prev => ({
          ...prev,
          loadedChunks: new Map(prev.loadedChunks).set(`${x}_${z}`, chunk)
        }));
      }
    }

    updateDynamicContent();
  }, []);

  const updateDynamicContent = useCallback(() => {
    if (!proceduralSystemRef.current) return;

    const chunks = proceduralSystemRef.current.getLoadedChunks();
    
    const allPlatforms = [];
    const allEnemies = [];
    const allCollectibles = [];
    
    chunks.forEach(chunk => {
      allPlatforms.push(...chunk.platforms);
      allEnemies.push(...chunk.enemies);
      allCollectibles.push(...chunk.collectibles);
    });

    setDynamicContent({
      platforms: allPlatforms,
      enemies: allEnemies,
      collectibles: allCollectibles,
      effects: []
    });
  }, []);

  // ========================================
  // LOOP PRINCIPAL DEL JUEGO
  // ========================================

  useFrame((state, deltaTime) => {
    if (!worldState.isLoaded) return;

    const systems = {
      performance: performanceManagerRef.current,
      vfx: vfxSystemRef.current,
      physics: physicsSystemRef.current,
      ai: aiSystemRef.current,
      procedural: proceduralSystemRef.current
    };

    // Actualizar Performance Manager
    if (systems.performance) {
      systems.performance.update(deltaTime * 1000, renderer, scene, camera);
    }

    // Actualizar VFX System
    if (systems.vfx) {
      systems.vfx.update(deltaTime * 1000);
    }

    // Actualizar Physics System
    if (systems.physics) {
      systems.physics.update(deltaTime * 1000);
    }

    // Actualizar AI System
    if (systems.ai) {
      systems.ai.update(deltaTime * 1000, {
        entities: new Map([
          ['player', { position: worldState.playerPosition }]
        ])
      });
    }

    // Actualizar posición del listener de audio
    if (setListenerPosition) {
      setListenerPosition(worldState.playerPosition);
    }

    // Verificar si necesitamos generar nuevos chunks
    checkChunkGeneration();
  });

  const checkChunkGeneration = useCallback(() => {
    if (!proceduralSystemRef.current) return;

    const playerChunkX = Math.floor(worldState.playerPosition.x / 100);
    const playerChunkZ = Math.floor(worldState.playerPosition.z / 100);

    // Generar chunks en un radio de 1 alrededor del jugador
    for (let x = playerChunkX - 1; x <= playerChunkX + 1; x++) {
      for (let z = playerChunkZ - 1; z <= playerChunkZ + 1; z++) {
        const chunkKey = `${x}_${z}`;
        
        if (!worldState.loadedChunks.has(chunkKey)) {
          const biome = Math.abs(x + z) % 3 === 0 ? 'forest' : 
                       Math.abs(x + z) % 3 === 1 ? 'desert' : 'ice';
          
          const chunk = proceduralSystemRef.current.generateChunk(x, z, biome);
          
          setWorldState(prev => ({
            ...prev,
            loadedChunks: new Map(prev.loadedChunks).set(chunkKey, chunk),
            currentChunk: { x: playerChunkX, z: playerChunkZ }
          }));
          
          updateDynamicContent();
        }
      }
    }
  }, [worldState.playerPosition, worldState.loadedChunks]);

  // ========================================
  // MANEJO DE EVENTOS DEL JUEGO
  // ========================================

  const handlePlayerPositionChange = useCallback((newPosition) => {
    setWorldState(prev => ({
      ...prev,
      playerPosition: newPosition
    }));

    actions.updatePlayerPosition(newPosition);
  }, [actions]);

  const handleCollision = useCallback((event) => {
    const { entity1, entity2, normal, penetration } = event;
    
    // Reproducir efectos según el tipo de colisión
    if (vfxSystemRef.current) {
      if (entity1.includes('player') && entity2.includes('gem')) {
        vfxSystemRef.current.playEffect('sparkle', worldState.playerPosition);
        playSound('collect-gem');
      } else if (entity1.includes('player') && entity2.includes('enemy')) {
        vfxSystemRef.current.playEffect('explosion', worldState.playerPosition);
        playSound('player-damage');
      }
    }
  }, [worldState.playerPosition, playSound]);

  const handleCollectItem = useCallback((itemId, itemType, position) => {
    // Reproducir efecto visual
    if (vfxSystemRef.current) {
      const effectType = itemType === 'gem' ? 'collect' : 'sparkle';
      vfxSystemRef.current.playEffect(effectType, position);
    }

    // Reproducir sonido
    playSound(itemType === 'gem' ? 'collect-gem' : 'collect-powerup');

    // Actualizar estado del juego
    if (itemType === 'gem') {
      actions.collectGem(10);
    } else {
      actions.collectPowerUp(itemType);
    }

    // Remover item del contenido dinámico
    setDynamicContent(prev => ({
      ...prev,
      collectibles: prev.collectibles.filter(item => item.id !== itemId)
    }));
  }, [actions, playSound]);

  const handleEnemyDefeated = useCallback((enemyId, position) => {
    // Efecto de explosión
    if (vfxSystemRef.current) {
      vfxSystemRef.current.playEffect('explosion', position, {
        particles: 80,
        color: { start: '#ff4400', end: '#ff0000' }
      });
    }

    playSound('hit-enemy');
    actions.updateScore(100);

    // Remover enemigo
    setDynamicContent(prev => ({
      ...prev,
      enemies: prev.enemies.filter(enemy => enemy.id !== enemyId)
    }));
  }, [actions, playSound]);

  // ========================================
  // CLEANUP DE SISTEMAS
  // ========================================

  const cleanupSystems = useCallback(() => {
    if (performanceManagerRef.current) {
      performanceManagerRef.current.dispose();
    }
    
    if (vfxSystemRef.current) {
      vfxSystemRef.current.dispose();
    }
    
    if (resourceManagerRef.current) {
      resourceManagerRef.current.dispose();
    }
    
    console.log('🧹 Sistemas limpiados correctamente');
  }, []);

  // ========================================
  // DEBUG Y HERRAMIENTAS DE DESARROLLO
  // ========================================

  const toggleDebugMode = useCallback(() => {
    setWorldState(prev => ({ ...prev, debugMode: !prev.debugMode }));
  }, []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'F3' && process.env.NODE_ENV === 'development') {
        toggleDebugMode();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleDebugMode]);

  // ========================================
  // RENDERIZADO DEL MUNDO
  // ========================================

  if (!worldState.isLoaded) {
    return (
      <Html center>
        <div style={{ 
          color: 'white', 
          fontSize: '24px', 
          textAlign: 'center',
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <div>🌍 Generando mundo...</div>
          <div style={{ fontSize: '16px', marginTop: '10px' }}>
            Inicializando sistemas avanzados
          </div>
        </div>
      </Html>
    );
  }

  return (
    <group>
      {/* Suelo principal */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[500, 1, 500]} position={[0, -0.5, 0]} receiveShadow>
          <meshStandardMaterial 
            color="#2d5a27" 
            roughness={0.8}
            metalness={0.1} 
          />
        </Box>
      </RigidBody>

      {/* Cielo procedural */}
      <Sky 
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.49}
        azimuth={0.25}
      />

      {/* Componentes dinámicos */}
      <Player 
        position={[0, 5, 0]}
        onPositionChange={handlePlayerPositionChange}
        onCollision={handleCollision}
        physicsSystem={physicsSystemRef.current}
      />

      <DynamicPlatforms 
        platforms={dynamicContent.platforms}
        qualitySettings={qualitySettings}
      />

      <DynamicEnemies 
        enemies={dynamicContent.enemies}
        playerPosition={worldState.playerPosition}
        aiSystem={aiSystemRef.current}
        onDefeated={handleEnemyDefeated}
      />

      <DynamicCollectibles 
        collectibles={dynamicContent.collectibles}
        onCollect={handleCollectItem}
      />

      {/* Efectos ambientales */}
      <EnvironmentalEffects 
        chunks={worldState.loadedChunks}
        qualitySettings={qualitySettings}
      />

      {/* Debug Info */}
      {worldState.debugMode && (
        <DebugInfo 
          performanceManager={performanceManagerRef.current}
          worldState={worldState}
        />
      )}
    </group>
  );
}

// ========================================
// COMPONENTES DINÁMICOS
// ========================================

function DynamicPlatforms({ platforms, qualitySettings }) {
  return (
    <group>
      {platforms.map((platform, index) => (
        <Platform 
          key={platform.id || index}
          {...platform}
          LOD={qualitySettings.LOD}
        />
      ))}
    </group>
  );
}

function DynamicEnemies({ enemies, playerPosition, aiSystem, onDefeated }) {
  return (
    <group>
      {enemies.map((enemy, index) => (
        <Enemy 
          key={enemy.id || index}
          {...enemy}
          playerPosition={playerPosition}
          aiSystem={aiSystem}
          onDefeated={onDefeated}
        />
      ))}
    </group>
  );
}

function DynamicCollectibles({ collectibles, onCollect }) {
  return (
    <group>
      {collectibles.map((collectible, index) => (
        <Collectible 
          key={collectible.id || index}
          {...collectible}
          onCollect={onCollect}
        />
      ))}
    </group>
  );
}

// ========================================
// EFECTOS AMBIENTALES
// ========================================

function EnvironmentalEffects({ chunks, qualitySettings }) {
  const particleSystemsRef = useRef([]);

  useEffect(() => {
    // Generar efectos ambientales basados en biomas de chunks
    const effects = [];
    
    for (const chunk of chunks.values()) {
      if (chunk.biome === 'forest') {
        effects.push({
          type: 'leaves',
          position: [chunk.x * 100, 10, chunk.z * 100],
          count: qualitySettings.particleCount / 20
        });
      } else if (chunk.biome === 'desert') {
        effects.push({
          type: 'sand',
          position: [chunk.x * 100, 5, chunk.z * 100],
          count: qualitySettings.particleCount / 30
        });
      }
    }

    particleSystemsRef.current = effects;
  }, [chunks, qualitySettings]);

  return (
    <group>
      {particleSystemsRef.current.map((effect, index) => (
        <AmbientParticleSystem 
          key={index}
          {...effect}
        />
      ))}
    </group>
  );
}

function AmbientParticleSystem({ type, position, count }) {
  const meshRef = useRef();
  const particlesRef = useRef();

  useEffect(() => {
    if (!meshRef.current) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = -Math.random() * 0.2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesRef.current = { positions, velocities };
  }, [count]);

  useFrame((_, delta) => {
    if (!meshRef.current || !particlesRef.current) return;

    const { positions, velocities } = particlesRef.current;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

      // Reset particles that fall too low
      if (positions[i * 3 + 1] < -5) {
        positions[i * 3 + 1] = 20;
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const color = type === 'leaves' ? '#228B22' : '#D2B48C';

  return (
    <points ref={meshRef} position={position}>
      <bufferGeometry />
      <pointsMaterial color={color} size={0.1} transparent opacity={0.6} />
    </points>
  );
}

// ========================================
// DEBUG INFO COMPONENT
// ========================================

function DebugInfo({ performanceManager, worldState }) {
  const [debugData, setDebugData] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      if (performanceManager) {
        setDebugData(performanceManager.getDetailedReport());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [performanceManager]);

  return (
    <Html position={[-50, 20, 0]} transform>
      <div style={{
        color: 'white',
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
        minWidth: '300px'
      }}>
        <h4>🔍 Debug Info</h4>
        <div>FPS: {debugData.metrics?.fps?.toFixed(1) || 'N/A'}</div>
        <div>Frame Time: {debugData.metrics?.frameTime?.toFixed(2) || 'N/A'}ms</div>
        <div>Memory: {debugData.metrics?.memory?.used?.toFixed(1) || 'N/A'}MB</div>
        <div>Entities: {debugData.metrics?.entities || 0}</div>
        <div>Quality: {debugData.quality || 'N/A'}</div>
        <div>Chunks: {worldState.loadedChunks?.size || 0}</div>
        <div>Position: ({worldState.playerPosition?.x?.toFixed(1)}, {worldState.playerPosition?.y?.toFixed(1)}, {worldState.playerPosition?.z?.toFixed(1)})</div>
        <div>Chunk: ({worldState.currentChunk?.x}, {worldState.currentChunk?.z})</div>
      </div>
    </Html>
  );
}

// ========================================
// EXPORTACIONES
// ========================================

export { GameWorld as default, EnvironmentalEffects, DebugInfo };