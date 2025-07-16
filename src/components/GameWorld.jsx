// ========================================
// COMPONENTE MUNDO DEL JUEGO 3D
// Mundo principal con Three.js y React Three Fiber
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

// Importar sistemas del juego
import { useGameEngine } from '../hooks/useGameEngine';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { useAudioManager } from '../hooks/useAudioManager';

// Importar componentes
import Player from './Player';
import Enemies from './Enemies';
import Collectibles from './Collectibles';
import Platforms from './Platforms';
import ParticleEffects from './ParticleEffects';
import GameUI from './GameUI';

// ========================================
// COMPONENTE PRINCIPAL DEL MUNDO
// ========================================

const GameWorld = ({ gameConfig, onGameEvent, className }) => {
  const [worldState, setWorldState] = useState({
    isLoaded: false,
    currentLevel: 1,
    difficulty: 'normal',
    playerCount: 1,
    gameMode: 'adventure'
  });

  const [performanceSettings, setPerformanceSettings] = useState({
    quality: 'high',
    shadows: true,
    postProcessing: true,
    particleCount: 'high',
    renderDistance: 1000
  });

  const canvasRef = useRef();
  const worldGroupRef = useRef();
  
  // Hooks personalizados
  const { 
    gameEngine, 
    isEngineReady,
    createEntity,
    updateEntity,
    destroyEntity 
  } = useGameEngine();
  
  const { 
    playSound, 
    setListenerPosition,
    playBackgroundMusic 
  } = useAudioManager();
  
  const {
    networkState,
    sendPlayerUpdate,
    onPlayerJoin,
    onPlayerLeave
  } = useNetworkSync();

  // Estado de cámara
  const [cameraState, setCameraState] = useState({
    position: [0, 15, 30],
    target: [0, 0, 0],
    fov: 75,
    mode: 'thirdPerson' // thirdPerson, firstPerson, orbital, cinematic
  });

  // Efectos y configuración
  const qualityConfig = useMemo(() => {
    const configs = {
      low: {
        shadows: false,
        postProcessing: false,
        particleCount: 500,
        renderDistance: 300,
        antialias: false,
        shadowMapSize: 512
      },
      medium: {
        shadows: true,
        postProcessing: false,
        particleCount: 1500,
        renderDistance: 600,
        antialias: true,
        shadowMapSize: 1024
      },
      high: {
        shadows: true,
        postProcessing: true,
        particleCount: 3000,
        renderDistance: 1000,
        antialias: true,
        shadowMapSize: 2048
      },
      ultra: {
        shadows: true,
        postProcessing: true,
        particleCount: 5000,
        renderDistance: 1500,
        antialias: true,
        shadowMapSize: 4096
      }
    };
    return configs[performanceSettings.quality] || configs.high;
  }, [performanceSettings.quality]);

  // ========================================
  // EFECTOS Y CONFIGURACIÓN INICIAL
  // ========================================

  useEffect(() => {
    if (isEngineReady) {
      initializeWorld();
      loadLevel(worldState.currentLevel);
      setupEventListeners();
      
      // Reproducir música de fondo
      playBackgroundMusic(`level_${worldState.currentLevel}_theme`);
    }
    
    return () => {
      cleanupWorld();
    };
  }, [isEngineReady]);

  useEffect(() => {
    // Ajustar configuración según rendimiento
    const fpsMeter = setInterval(() => {
      checkPerformanceAndAdjust();
    }, 5000);
    
    return () => clearInterval(fpsMeter);
  }, []);

  // ========================================
  // FUNCIONES DE INICIALIZACIÓN
  // ========================================

  const initializeWorld = useCallback(() => {
    console.log('🌍 Inicializando mundo del juego...');
    
    // Crear entidades básicas del mundo
    createWorldEntities();
    
    // Configurar sistemas
    setupPhysicsWorld();
    setupRenderingPipeline();
    setupAudioEnvironment();
    
    setWorldState(prev => ({ ...prev, isLoaded: true }));
    onGameEvent?.({ type: 'worldLoaded', data: worldState });
  }, [createEntity]);

  const createWorldEntities = useCallback(() => {
    // Crear entidad del suelo
    const groundEntity = createEntity('ground');
    if (gameEngine) {
      gameEngine.addComponent(groundEntity, 'transform', {
        position: { x: 0, y: -10, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1000, y: 1, z: 1000 }
      });
      
      gameEngine.addComponent(groundEntity, 'renderable', {
        geometry: { type: 'plane', width: 1000, height: 1000 },
        material: { 
          type: 'standard',
          color: '#4a5d23',
          roughness: 0.8,
          metalness: 0.1
        },
        receiveShadow: true
      });
      
      gameEngine.addComponent(groundEntity, 'collider', {
        type: 'box',
        size: { x: 1000, y: 1, z: 1000 },
        isStatic: true
      });
    }
    
    // Crear límites del mundo
    createWorldBounds();
    
    // Crear puntos de spawn
    createSpawnPoints();
    
    console.log('✅ Entidades del mundo creadas');
  }, [createEntity, gameEngine]);

  const createWorldBounds = useCallback(() => {
    const bounds = [
      { pos: [500, 0, 0], size: [1, 100, 1000] },   // Derecha
      { pos: [-500, 0, 0], size: [1, 100, 1000] },  // Izquierda
      { pos: [0, 0, 500], size: [1000, 100, 1] },   // Frente
      { pos: [0, 0, -500], size: [1000, 100, 1] },  // Atrás
      { pos: [0, 200, 0], size: [1000, 1, 1000] }   // Techo
    ];
    
    bounds.forEach((bound, index) => {
      const boundEntity = createEntity(`bound_${index}`);
      if (gameEngine) {
        gameEngine.addComponent(boundEntity, 'transform', {
          position: { x: bound.pos[0], y: bound.pos[1], z: bound.pos[2] },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        });
        
        gameEngine.addComponent(boundEntity, 'collider', {
          type: 'box',
          size: { x: bound.size[0], y: bound.size[1], z: bound.size[2] },
          isStatic: true,
          isTrigger: false
        });
      }
    });
  }, [createEntity, gameEngine]);

  const createSpawnPoints = useCallback(() => {
    const spawnPoints = [
      { x: 0, y: 5, z: 0 },      // Spawn principal
      { x: 50, y: 5, z: 50 },   // Spawn secundario
      { x: -50, y: 5, z: 50 },  // Spawn terciario
      { x: 0, y: 5, z: 100 }    // Spawn de respaldo
    ];
    
    spawnPoints.forEach((point, index) => {
      const spawnEntity = createEntity(`spawn_${index}`);
      if (gameEngine) {
        gameEngine.addComponent(spawnEntity, 'transform', {
          position: point,
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        });
        
        gameEngine.addComponent(spawnEntity, 'spawnPoint', {
          index,
          isOccupied: false,
          playerType: 'any'
        });
      }
    });
  }, [createEntity, gameEngine]);

  const loadLevel = useCallback(async (levelNumber) => {
    console.log(`🗺️ Cargando nivel ${levelNumber}...`);
    
    try {
      // Limpiar nivel anterior
      clearCurrentLevel();
      
      // Generar nuevo nivel
      const levelGenerator = gameEngine.getSystem('levelGenerator');
      if (levelGenerator) {
        // Generar chunks iniciales alrededor del spawn
        for (let x = -1; x <= 1; x++) {
          for (let z = -1; z <= 1; z++) {
            levelGenerator.generateChunk(x, z);
          }
        }
      }
      
      // Crear elementos específicos del nivel
      await createLevelElements(levelNumber);
      
      // Configurar ambiente del nivel
      setupLevelEnvironment(levelNumber);
      
      onGameEvent?.({ type: 'levelLoaded', data: { level: levelNumber } });
      console.log(`✅ Nivel ${levelNumber} cargado exitosamente`);
      
    } catch (error) {
      console.error(`❌ Error cargando nivel ${levelNumber}:`, error);
      onGameEvent?.({ type: 'levelLoadError', data: { level: levelNumber, error } });
    }
  }, [gameEngine, onGameEvent]);

  const createLevelElements = useCallback(async (levelNumber) => {
    // Elementos específicos según el nivel
    const levelConfigs = {
      1: {
        biome: 'forest',
        enemyCount: 5,
        collectibleCount: 20,
        platformCount: 15,
        specialElements: ['bridge', 'waterfall']
      },
      2: {
        biome: 'desert',
        enemyCount: 8,
        collectibleCount: 25,
        platformCount: 20,
        specialElements: ['oasis', 'sandstorm']
      },
      3: {
        biome: 'ice',
        enemyCount: 12,
        collectibleCount: 30,
        platformCount: 25,
        specialElements: ['ice_cave', 'aurora']
      }
    };
    
    const config = levelConfigs[levelNumber] || levelConfigs[1];
    
    // Crear elementos especiales
    for (const element of config.specialElements) {
      await createSpecialElement(element, config.biome);
    }
    
  }, [createEntity, gameEngine]);

  const createSpecialElement = useCallback(async (elementType, biome) => {
    switch (elementType) {
      case 'bridge':
        createBridge();
        break;
      case 'waterfall':
        createWaterfall();
        break;
      case 'oasis':
        createOasis();
        break;
      case 'sandstorm':
        createSandstormEffect();
        break;
      case 'ice_cave':
        createIceCave();
        break;
      case 'aurora':
        createAuroraEffect();
        break;
    }
  }, []);

  const createBridge = useCallback(() => {
    const bridgeEntity = createEntity('bridge_main');
    if (gameEngine) {
      gameEngine.addComponent(bridgeEntity, 'transform', {
        position: { x: 0, y: 10, z: 200 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      });
      
      gameEngine.addComponent(bridgeEntity, 'renderable', {
        geometry: { type: 'box', width: 100, height: 5, depth: 20 },
        material: { 
          type: 'standard',
          color: '#8B4513',
          roughness: 0.8,
          metalness: 0.1
        },
        castShadow: true,
        receiveShadow: true
      });
      
      gameEngine.addComponent(bridgeEntity, 'collider', {
        type: 'box',
        size: { x: 100, y: 5, z: 20 },
        isStatic: true
      });
    }
  }, [createEntity, gameEngine]);

  // ========================================
  // CONFIGURACIÓN DE SISTEMAS
  // ========================================

  const setupPhysicsWorld = useCallback(() => {
    const physicsSystem = gameEngine.getSystem('physics');
    if (physicsSystem) {
      // Configurar gravedad
      physicsSystem.setGravity(0, -9.81, 0);
      
      // Configurar colisiones
      physicsSystem.setCollisionGroups({
        player: 1,
        enemy: 2,
        platform: 4,
        collectible: 8,
        boundary: 16
      });
    }
  }, [gameEngine]);

  const setupRenderingPipeline = useCallback(() => {
    const renderSystem = gameEngine.getSystem('render');
    if (renderSystem) {
      // Configurar calidad según settings
      renderSystem.setQuality(performanceSettings.quality);
      
      // Configurar sombras
      if (qualityConfig.shadows) {
        renderSystem.enableShadows(true);
        renderSystem.setShadowMapSize(qualityConfig.shadowMapSize);
      }
      
      // Configurar post-procesamiento
      if (qualityConfig.postProcessing) {
        renderSystem.enablePostProcessing(true);
      }
    }
  }, [gameEngine, performanceSettings, qualityConfig]);

  const setupAudioEnvironment = useCallback(() => {
    // Configurar audio espacial
    if (setListenerPosition) {
      setListenerPosition(cameraState.position);
    }
    
    // Reproducir sonidos ambientales
    playSound('ambient_forest', { 
      loop: true, 
      volume: 0.3,
      spatial: false 
    });
  }, [cameraState.position, setListenerPosition, playSound]);

  const setupLevelEnvironment = useCallback((levelNumber) => {
    const environments = {
      1: { skyColor: '#87CEEB', fogColor: '#ffffff', fogDensity: 0.001 },
      2: { skyColor: '#FFE4B5', fogColor: '#DEB887', fogDensity: 0.002 },
      3: { skyColor: '#E0E6FF', fogColor: '#B0C4DE', fogDensity: 0.0005 }
    };
    
    const env = environments[levelNumber] || environments[1];
    
    // Configurar en el sistema de renderizado
    const renderSystem = gameEngine.getSystem('render');
    if (renderSystem) {
      renderSystem.setSkyColor(env.skyColor);
      renderSystem.setFog(env.fogColor, env.fogDensity);
    }
  }, [gameEngine]);

  // ========================================
  // GESTIÓN DE EVENTOS
  // ========================================

  const setupEventListeners = useCallback(() => {
    // Eventos del motor de juego
    gameEngine.on('entityCreated', handleEntityCreated);
    gameEngine.on('entityDestroyed', handleEntityDestroyed);
    gameEngine.on('collisionStart', handleCollisionStart);
    gameEngine.on('collisionEnd', handleCollisionEnd);
    
    // Eventos de red
    if (networkState.isConnected) {
      onPlayerJoin(handlePlayerJoin);
      onPlayerLeave(handlePlayerLeave);
    }
    
    // Eventos de input
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      gameEngine.off('entityCreated', handleEntityCreated);
      gameEngine.off('entityDestroyed', handleEntityDestroyed);
      gameEngine.off('collisionStart', handleCollisionStart);
      gameEngine.off('collisionEnd', handleCollisionEnd);
      
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameEngine, networkState.isConnected, onPlayerJoin, onPlayerLeave]);

  const handleEntityCreated = useCallback((entity) => {
    console.log(`🎯 Entidad creada: ${entity.id}`);
    onGameEvent?.({ type: 'entityCreated', data: entity });
  }, [onGameEvent]);

  const handleEntityDestroyed = useCallback((entityId) => {
    console.log(`💥 Entidad destruida: ${entityId}`);
    onGameEvent?.({ type: 'entityDestroyed', data: { entityId } });
  }, [onGameEvent]);

  const handleCollisionStart = useCallback((collision) => {
    const { entityA, entityB } = collision;
    
    // Verificar tipos de colisión
    const compA = gameEngine.getComponent(entityA, 'type');
    const compB = gameEngine.getComponent(entityB, 'type');
    
    if (compA?.data.type === 'player' && compB?.data.type === 'collectible') {
      handlePlayerCollectItem(entityA, entityB);
    } else if (compA?.data.type === 'player' && compB?.data.type === 'enemy') {
      handlePlayerEnemyCollision(entityA, entityB);
    }
  }, [gameEngine]);

  const handlePlayerCollectItem = useCallback((playerId, itemId) => {
    // Efectos visuales y audio
    playSound('collect_item', { 
      position: gameEngine.getComponent(itemId, 'transform')?.data.position 
    });
    
    // Crear efecto de partículas
    const particleSystem = gameEngine.getSystem('particles');
    if (particleSystem) {
      particleSystem.playEffect('sparkle', 
        gameEngine.getComponent(itemId, 'transform').data.position
      );
    }
    
    // Destruir item
    destroyEntity(itemId);
    
    // Evento de juego
    onGameEvent?.({ 
      type: 'itemCollected', 
      data: { playerId, itemId } 
    });
  }, [gameEngine, playSound, destroyEntity, onGameEvent]);

  const handlePlayerEnemyCollision = useCallback((playerId, enemyId) => {
    // Aplicar daño al jugador
    const playerHealth = gameEngine.getComponent(playerId, 'health');
    if (playerHealth && playerHealth.data.current > 0) {
      playerHealth.data.current -= 20;
      
      // Efectos de daño
      playSound('player_hurt');
      
      // Crear efecto visual
      const particleSystem = gameEngine.getSystem('particles');
      if (particleSystem) {
        particleSystem.playEffect('damage', 
          gameEngine.getComponent(playerId, 'transform').data.position
        );
      }
      
      onGameEvent?.({ 
        type: 'playerDamaged', 
        data: { playerId, damage: 20, source: enemyId } 
      });
    }
  }, [gameEngine, playSound, onGameEvent]);

  const handleKeyDown = useCallback((event) => {
    switch (event.code) {
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'KeyP':
        togglePause();
        break;
      case 'KeyM':
        toggleMusic();
        break;
      case 'Tab':
        event.preventDefault();
        toggleHUD();
        break;
    }
  }, []);

  const handleKeyUp = useCallback((event) => {
    // Manejar teclas liberadas
  }, []);

  // ========================================
  // FUNCIONES DE CONTROL
  // ========================================

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      canvasRef.current?.requestFullscreen();
    }
  }, []);

  const togglePause = useCallback(() => {
    onGameEvent?.({ type: 'togglePause' });
  }, [onGameEvent]);

  const toggleMusic = useCallback(() => {
    onGameEvent?.({ type: 'toggleMusic' });
  }, [onGameEvent]);

  const toggleHUD = useCallback(() => {
    onGameEvent?.({ type: 'toggleHUD' });
  }, [onGameEvent]);

  const checkPerformanceAndAdjust = useCallback(() => {
    const renderSystem = gameEngine.getSystem('render');
    if (renderSystem) {
      const metrics = renderSystem.getMetrics();
      
      if (metrics.fps < 30 && performanceSettings.quality !== 'low') {
        console.log('📉 Rendimiento bajo, reduciendo calidad...');
        
        setPerformanceSettings(prev => {
          const qualityLevels = ['low', 'medium', 'high', 'ultra'];
          const currentIndex = qualityLevels.indexOf(prev.quality);
          const newQuality = qualityLevels[Math.max(0, currentIndex - 1)];
          
          return { ...prev, quality: newQuality };
        });
      } else if (metrics.fps > 55 && performanceSettings.quality !== 'ultra') {
        console.log('📈 Buen rendimiento, aumentando calidad...');
        
        setPerformanceSettings(prev => {
          const qualityLevels = ['low', 'medium', 'high', 'ultra'];
          const currentIndex = qualityLevels.indexOf(prev.quality);
          const newQuality = qualityLevels[Math.min(3, currentIndex + 1)];
          
          return { ...prev, quality: newQuality };
        });
      }
    }
  }, [gameEngine, performanceSettings.quality]);

  // ========================================
  // FUNCIONES DE LIMPIEZA
  // ========================================

  const clearCurrentLevel = useCallback(() => {
    // Limpiar entidades del nivel anterior
    const levelGenerator = gameEngine.getSystem('levelGenerator');
    if (levelGenerator) {
      const loadedChunks = levelGenerator.getLoadedChunks();
      loadedChunks.forEach(chunkId => {
        levelGenerator.unloadChunk(chunkId);
      });
    }
  }, [gameEngine]);

  const cleanupWorld = useCallback(() => {
    console.log('🧹 Limpiando mundo del juego...');
    
    // Limpiar eventos
    if (gameEngine) {
      gameEngine.removeAllListeners();
    }
    
    // Parar música de fondo
    // stopBackgroundMusic(); // Si existe esta función
    
    console.log('✅ Mundo limpiado');
  }, [gameEngine]);

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================

  const WorldEnvironment = () => (
    <>
      {/* Cielo dinámico */}
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0}
        azimuth={0.25}
      />
      
      {/* Estrellas para niveles nocturnos */}
      {worldState.currentLevel >= 3 && (
        <Stars
          radius={300}
          depth={60}
          count={1000}
          factor={6}
          saturation={0}
          fade
        />
      )}
      
      {/* Nubes */}
      <Cloud
        opacity={0.5}
        speed={0.4}
        width={10}
        depth={1.5}
        segments={20}
        position={[50, 30, 50]}
      />
      <Cloud
        opacity={0.3}
        speed={0.3}
        width={15}
        depth={2}
        segments={25}
        position={[-30, 25, 80]}
      />
    </>
  );

  const PostProcessingEffects = () => {
    if (!qualityConfig.postProcessing) return null;
    
    return (
      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.9}
          luminanceSmoothing={0.9}
        />
        <ChromaticAberration
          offset={[0.001, 0.001]}
        />
        <Vignette
          eskil={false}
          offset={0.1}
          darkness={0.9}
        />
        {performanceSettings.quality === 'ultra' && (
          <>
            <SSAO
              samples={31}
              radius={0.1}
              intensity={1}
              luminanceInfluence={0.6}
            />
            <DepthOfField
              focusDistance={0.02}
              focalLength={0.05}
              bokehScale={3}
            />
          </>
        )}
      </EffectComposer>
    );
  };

  const GameCamera = () => {
    const { camera } = useThree();
    
    useFrame(() => {
      // Actualizar posición del listener de audio
      if (setListenerPosition) {
        setListenerPosition([camera.position.x, camera.position.y, camera.position.z]);
      }
    });
    
    return (
      <PerspectiveCamera
        ref={camera}
        makeDefault
        position={cameraState.position}
        fov={cameraState.fov}
        near={0.1}
        far={qualityConfig.renderDistance}
      />
    );
  };

  const WorldLighting = () => (
    <>
      {/* Luz ambiental */}
      <ambientLight intensity={0.4} color="#404040" />
      
      {/* Luz direccional principal (sol) */}
      <directionalLight
        position={[100, 100, 50]}
        intensity={1.2}
        castShadow={qualityConfig.shadows}
        shadow-mapSize-width={qualityConfig.shadowMapSize}
        shadow-mapSize-height={qualityConfig.shadowMapSize}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
      />
      
      {/* Luz de relleno */}
      <directionalLight
        position={[-50, 30, -50]}
        intensity={0.3}
        color="#87CEEB"
      />
      
      {/* Luces puntuales dinámicas */}
      <pointLight
        position={[0, 20, 0]}
        intensity={0.8}
        distance={100}
        decay={2}
        color="#ffffff"
      />
    </>
  );

  // ========================================
  // RENDERIZADO PRINCIPAL
  // ========================================

  if (!worldState.isLoaded) {
    return (
      <div className="loading-world">
        <div className="loading-spinner" />
        <h2>Cargando Mundo 3D...</h2>
        <p>Generando terreno y entidades...</p>
      </div>
    );
  }

  return (
    <div 
      className={`game-world ${className || ''}`}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Canvas
        ref={canvasRef}
        shadows={qualityConfig.shadows}
        gl={{
          antialias: qualityConfig.antialias,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false
        }}
        camera={false} // Usamos cámara personalizada
        style={{ background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)' }}
      >
        {/* Cámara personalizada */}
        <GameCamera />
        
        {/* Controles de cámara */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          maxDistance={100}
          minDistance={5}
          target={cameraState.target}
        />
        
        {/* Entorno */}
        <WorldEnvironment />
        
        {/* Iluminación */}
        <WorldLighting />
        
        {/* Física */}
        <Physics
          gravity={[0, -9.81, 0]}
          colliders="trimesh"
          debug={process.env.NODE_ENV === 'development'}
        >
          {/* Suelo con sombras de contacto */}
          <RigidBody type="fixed" colliders="cuboid">
            <Box
              args={[1000, 1, 1000]}
              position={[0, -10, 0]}
              receiveShadow
            >
              <meshStandardMaterial
                color="#4a5d23"
                roughness={0.8}
                metalness={0.1}
              />
            </Box>
          </RigidBody>
          
          {/* Componentes del juego */}
          <Player
            gameEngine={gameEngine}
            networkSync={networkState.isConnected ? sendPlayerUpdate : null}
            onPlayerEvent={onGameEvent}
            position={[0, 5, 0]}
            cameraRef={cameraState}
          />
          
          <Enemies
            gameEngine={gameEngine}
            worldState={worldState}
            onEnemyEvent={onGameEvent}
          />
          
          <Collectibles
            gameEngine={gameEngine}
            worldState={worldState}
            onCollectEvent={onGameEvent}
          />
          
          <Platforms
            gameEngine={gameEngine}
            worldState={worldState}
          />
          
          {/* Efectos de partículas */}
          <ParticleEffects
            gameEngine={gameEngine}
            maxParticles={qualityConfig.particleCount}
            quality={performanceSettings.quality}
          />
          
          {/* Sombras de contacto para mejor realismo */}
          {qualityConfig.shadows && (
            <ContactShadows
              rotation-x={Math.PI / 2}
              position={[0, -9.9, 0]}
              opacity={0.4}
              width={100}
              height={100}
              blur={1}
              far={20}
            />
          )}
        </Physics>
        
        {/* Post-procesamiento */}
        <PostProcessingEffects />
        
        {/* HTML Overlay para HUD */}
        <Html fullscreen>
          <GameUI
            worldState={worldState}
            performanceSettings={performanceSettings}
            networkState={networkState}
            onSettingsChange={setPerformanceSettings}
            onGameEvent={onGameEvent}
          />
        </Html>
      </Canvas>
    </div>
  );
};

export default GameWorld;