/* ============================================================================ */
/* 🎮 CRASH WORM 3D - MUNDO DEL JUEGO INTEGRADO */
/* ============================================================================ */
/* Ubicación: src/components/GameWorld.jsx */

import React, { useRef, useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Sky,
  ContactShadows,
  PerspectiveCamera,
  Stats
} from '@react-three/drei';
import { Physics, Debug } from '@react-three/rapier';
import * as THREE from 'three';

// Game Components
import Player from './Player';
import Platforms from './Platforms';
import Collectibles from './Collectibles';
import Enemies from './Enemies';
import ParticleEffects, { useParticleEffects } from './ParticleEffects';

// Context and Hooks
import { useGameContext } from '../context/GameContext';
import { useGameEngine } from '../hooks/useGameEngine';
import { useAudioManager } from '../hooks/useAudioManager';
import { useNetworkSync } from '../hooks/useNetworkSync';

// Utils and Config
import { gameConfig } from '../data/gameConfig';
import { DeviceUtils, MathUtils, GameUtils } from '../utils/gameUtils';

// ========================================
// 🌍 COMPONENTE PRINCIPAL DEL MUNDO
// ========================================

export function GameWorld() {
  const {
    gameState,
    currentLevel,
    mode,
    settings,
    player,
    room,
    updatePerformance,
    setPlayerPosition,
    showNotification
  } = useGameContext();

  const { playMusic, playAmbient } = useAudioManager();
  const { isConnected, syncPlayerState } = useNetworkSync();

  // World state
  const [worldData, setWorldData] = useState(null);
  const [isWorldLoaded, setIsWorldLoaded] = useState(false);
  const [cameraMode, setCameraMode] = useState('follow'); // follow, free, cinematic

  // Load world data based on current level
  useEffect(() => {
    loadWorldData(currentLevel).then(data => {
      setWorldData(data);
      setIsWorldLoaded(true);

      // Start appropriate music
      const theme = data.theme || 'forest';
      playMusic(gameConfig.levels.themes[theme]?.music || 'gameplay');
      playAmbient(gameConfig.levels.themes[theme]?.ambient || 'forest');
    });
  }, [currentLevel, playMusic, playAmbient]);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      updatePerformance({
        memoryUsage: (performance.memory?.usedJSHeapSize || 0) / 1024 / 1024,
        timestamp: Date.now()
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [updatePerformance]);

  if (!isWorldLoaded || !worldData) {
    return <WorldLoadingFallback />;
  }

  return (
    <div className="game-canvas-container">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 5, 10] }}
        gl={{
          antialias: settings.graphics.antialiasing,
          powerPreference: 'high-performance',
          alpha: false
        }}
        dpr={[1, settings.graphics.quality === 'ultra' ? 2 : 1.5]}
      >
        <Suspense fallback={<WorldLoadingFallback />}>
          <GameScene
            worldData={worldData}
            cameraMode={cameraMode}
            onCameraModeChange={setCameraMode}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ========================================
// 🎬 ESCENA PRINCIPAL DEL JUEGO
// ========================================

function GameScene({ worldData, cameraMode, onCameraModeChange }) {
  const { camera, scene, gl } = useThree();
  const {
    gameState,
    settings,
    player,
    mode,
    takeDamage,
    addScore,
    showNotification,
    setPlayerPosition
  } = useGameContext();

  // Game engine integration
  const {
    engine,
    isInitialized,
    performance,
    startEngine,
    stopEngine,
    pauseEngine,
    resumeEngine
  } = useGameEngine();

  // Particle effects
  const {
    effects: particleEffects,
    addEffect,
    createExplosion,
    createSparkle,
    createHeal
  } = useParticleEffects();

  // Refs
  const playerRef = useRef();
  const lightRef = useRef();
  const [playerPosition, setPlayerPos] = useState({ x: 0, y: 1, z: 0 });

  // ========================================
  // ⚙️ GAME ENGINE INTEGRATION
  // ========================================

  useEffect(() => {
    if (isInitialized) {
      switch (gameState) {
        case 'PLAYING':
          startEngine();
          break;
        case 'PAUSED':
          pauseEngine();
          break;
        case 'GAME_OVER':
          stopEngine();
          break;
        default:
          break;
      }
    }
  }, [gameState, isInitialized, startEngine, stopEngine, pauseEngine, resumeEngine]);

  // ========================================
  // 📹 CAMERA SYSTEM
  // ========================================

  useFrame((state, delta) => {
    // Update camera based on mode
    updateCameraSystem(delta);

    // Update lighting
    updateDynamicLighting(delta);

    // Performance monitoring
    monitorPerformance(state);
  });

  const updateCameraSystem = useCallback((delta) => {
    if (!playerRef.current) return;

    switch (cameraMode) {
      case 'follow':
        updateFollowCamera(delta);
        break;
      case 'cinematic':
        updateCinematicCamera(delta);
        break;
      case 'free':
        // Free camera handled by OrbitControls
        break;
    }
  }, [cameraMode]);

  const updateFollowCamera = useCallback((delta) => {
    const config = gameConfig.player.camera;
    const targetPos = new THREE.Vector3(
      playerPosition.x + config.followOffset.x,
      playerPosition.y + config.followOffset.y,
      playerPosition.z + config.followOffset.z
    );

    camera.position.lerp(targetPos, config.followSpeed * delta);

    // Look at player with slight ahead offset
    const lookAtPos = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y + 1,
      playerPosition.z
    );
    camera.lookAt(lookAtPos);
  }, [playerPosition, camera]);

  const updateCinematicCamera = useCallback((delta) => {
    // Cinematic camera movement - orbiting around player
    const time = Date.now() * 0.001;
    const radius = 15;
    const height = 8;

    camera.position.x = playerPosition.x + Math.cos(time * 0.3) * radius;
    camera.position.y = playerPosition.y + height + Math.sin(time * 0.2) * 2;
    camera.position.z = playerPosition.z + Math.sin(time * 0.3) * radius;

    camera.lookAt(playerPosition.x, playerPosition.y + 2, playerPosition.z);
  }, [playerPosition, camera]);

  // ========================================
  // 💡 DYNAMIC LIGHTING
  // ========================================

  const updateDynamicLighting = useCallback((delta) => {
    if (!lightRef.current) return;

    // Dynamic sun position
    const time = Date.now() * 0.0001;
    const sunAngle = time % (Math.PI * 2);

    lightRef.current.position.x = Math.cos(sunAngle) * 50;
    lightRef.current.position.y = Math.max(10, Math.sin(sunAngle) * 30 + 20);
    lightRef.current.position.z = Math.sin(sunAngle) * 50;

    // Adjust light intensity based on time of day
    const intensity = Math.max(0.3, Math.sin(sunAngle) * 0.7 + 0.5);
    lightRef.current.intensity = intensity;
  }, []);

  // ========================================
  // 📊 PERFORMANCE MONITORING
  // ========================================

  const monitorPerformance = useCallback((state) => {
    const fps = 1 / state.clock.getDelta();
    const frameTime = state.clock.getDelta() * 1000;

    // Update performance stats
    if (Math.random() < 0.1) { // Update 10% of frames to avoid overhead
      const renderInfo = gl.info.render;

      updatePerformance({
        fps: Math.round(fps),
        frameTime: Math.round(frameTime * 100) / 100,
        drawCalls: renderInfo.calls,
        triangles: renderInfo.triangles,
        geometries: renderInfo.geometries,
        textures: renderInfo.textures
      });
    }
  }, [gl, updatePerformance]);

  // ========================================
  // 🎮 GAME EVENT HANDLERS
  // ========================================

  const handlePlayerPositionChange = useCallback((position) => {
    setPlayerPos(position);
    setPlayerPosition(position);

    // Sync with multiplayer if connected
    if (mode === 'multiplayer') {
      // syncPlayerState would be called here
    }
  }, [setPlayerPosition, mode]);

  const handlePlatformInteraction = useCallback((interaction) => {
    switch (interaction.type) {
      case 'ice_effect':
        showNotification({
          message: 'Slippery!',
          type: 'info',
          icon: '❄️',
          duration: 1000
        });
        break;
      case 'damage':
        takeDamage(interaction.amount);
        createExplosion(interaction.player.translation(), 0.5);
        break;
      case 'checkpoint':
        showNotification({
          message: 'Checkpoint saved!',
          type: 'success',
          icon: '💾',
          duration: 2000
        });
        break;
    }
  }, [showNotification, takeDamage, createExplosion]);

  const handleCollectibleCollect = useCallback((collectible) => {
    // Create particle effect at collection point
    switch (collectible.type) {
      case 'coin':
        createSparkle(collectible.position, 0.8);
        break;
      case 'gem':
        createSparkle(collectible.position, 1.2);
        break;
      case 'heart':
        createHeal(collectible.position, 1.0);
        break;
      default:
        createSparkle(collectible.position, 1.0);
    }
  }, [createSparkle, createHeal]);

  const handleEnemyDefeat = useCallback((enemy) => {
    // Create explosion effect
    createExplosion(enemy.position, 1.0);

    showNotification({
      message: `Enemy defeated! +${enemy.scoreValue} points`,
      type: 'success',
      icon: '💥',
      duration: 1500
    });
  }, [createExplosion, showNotification]);

  // ========================================
  // 🎨 WORLD RENDERING
  // ========================================

  return (
    <>
      {/* Lighting Setup */}
      <LightingRig
        theme={worldData.theme}
        lightRef={lightRef}
        settings={settings}
      />

      {/* Environment */}
      <WorldEnvironment
        theme={worldData.theme}
        settings={settings}
      />

      {/* Physics World */}
      <Physics
        gravity={[0, -20, 0]}
        timeStep={1/60}
        paused={gameState === 'PAUSED'}
      >
        {settings.gameplay.showDebugInfo && (
          <Debug />
        )}

        {/* Player */}
        <Player
          ref={playerRef}
          position={worldData.spawnPoint}
          onPositionChange={handlePlayerPositionChange}
        />

        {/* Platforms */}
        <Platforms
          levelData={worldData}
          onPlatformInteraction={handlePlatformInteraction}
        />

        {/* Collectibles */}
        <Collectibles
          levelData={worldData}
          onCollect={handleCollectibleCollect}
        />

        {/* Enemies */}
        <Enemies
          levelData={worldData}
          playerPosition={playerPosition}
          onEnemyDefeat={handleEnemyDefeat}
        />

        {/* Static World Geometry */}
        <WorldGeometry worldData={worldData} />
      </Physics>

      {/* Particle Effects */}
      <ParticleEffects
        effects={particleEffects}
        globalEffects={settings.graphics.particles}
      />

      {/* Camera Controls */}
      <CameraControls
        mode={cameraMode}
        onModeChange={onCameraModeChange}
        enabled={cameraMode === 'free'}
      />

      {/* Debug Information */}
      {settings.gameplay.showDebugInfo && (
        <>
          <Stats />
          <DebugInfo
            playerPosition={playerPosition}
            performance={performance}
            worldData={worldData}
          />
        </>
      )}
    </>
  );
}

// ========================================
// 💡 SISTEMA DE ILUMINACIÓN
// ========================================

function LightingRig({ theme, lightRef, settings }) {
  const lightingConfig = gameConfig.graphics.lighting;

  return (
    <>
      {/* Ambient Light */}
      <ambientLight
        color={lightingConfig.ambient.color}
        intensity={lightingConfig.ambient.intensity}
      />

      {/* Directional Light (Sun) */}
      <directionalLight
        ref={lightRef}
        color={lightingConfig.directional.color}
        intensity={lightingConfig.directional.intensity}
        position={[
          lightingConfig.directional.position.x,
          lightingConfig.directional.position.y,
          lightingConfig.directional.position.z
        ]}
        castShadow={settings.graphics.shadows}
        shadow-mapSize-width={settings.graphics.shadowMapSize || 2048}
        shadow-mapSize-height={settings.graphics.shadowMapSize || 2048}
        shadow-camera-near={lightingConfig.directional.shadowCameraNear}
        shadow-camera-far={lightingConfig.directional.shadowCameraFar}
        shadow-camera-left={lightingConfig.directional.shadowCameraLeft}
        shadow-camera-right={lightingConfig.directional.shadowCameraRight}
        shadow-camera-top={lightingConfig.directional.shadowCameraTop}
        shadow-camera-bottom={lightingConfig.directional.shadowCameraBottom}
      />

      {/* Point Lights for atmosphere */}
      <pointLight
        color={lightingConfig.point.color}
        intensity={lightingConfig.point.intensity}
        distance={lightingConfig.point.distance}
        decay={lightingConfig.point.decay}
        position={[10, 5, 10]}
      />
    </>
  );
}

// ========================================
// 🌍 ENTORNO DEL MUNDO
// ========================================

function WorldEnvironment({ theme, settings }) {
  const themeConfig = gameConfig.levels.themes[theme] || gameConfig.levels.themes.forest;

  return (
    <>
      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0}
        azimuth={0.25}
      />

      {/* Environment Map */}
      <Environment preset="forest" />

      {/* Fog */}
      <fog
        attach="fog"
        args={[themeConfig.fogColor, 10, themeConfig.fogDensity * 1000]}
      />

      {/* Ground Plane */}
      <mesh receiveShadow position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={0x567d46} />
      </mesh>

      {/* Contact Shadows */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.4}
        scale={100}
        blur={1}
        far={20}
      />
    </>
  );
}

// ========================================
// 🏗️ GEOMETRÍA ESTÁTICA DEL MUNDO
// ========================================

function WorldGeometry({ worldData }) {
  return (
    <group>
      {/* Boundary Walls */}
      <BoundaryWalls size={worldData.bounds || 50} />

      {/* Decorative Elements */}
      <DecorativeElements theme={worldData.theme} />

      {/* Background Geometry */}
      <BackgroundGeometry worldData={worldData} />
    </group>
  );
}

function BoundaryWalls({ size }) {
  const wallHeight = 10;
  const wallThickness = 1;

  return (
    <group>
      {/* North Wall */}
      <mesh position={[0, wallHeight / 2, -size]} receiveShadow>
        <boxGeometry args={[size * 2, wallHeight, wallThickness]} />
        <meshStandardMaterial color={0x8B4513} transparent opacity={0.8} />
      </mesh>

      {/* South Wall */}
      <mesh position={[0, wallHeight / 2, size]} receiveShadow>
        <boxGeometry args={[size * 2, wallHeight, wallThickness]} />
        <meshStandardMaterial color={0x8B4513} transparent opacity={0.8} />
      </mesh>

      {/* East Wall */}
      <mesh position={[size, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, size * 2]} />
        <meshStandardMaterial color={0x8B4513} transparent opacity={0.8} />
      </mesh>

      {/* West Wall */}
      <mesh position={[-size, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, size * 2]} />
        <meshStandardMaterial color={0x8B4513} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function DecorativeElements({ theme }) {
  // Generate decorative elements based on theme
  const decorations = useMemo(() => {
    const elements = [];
    const count = 20;

    for (let i = 0; i < count; i++) {
      elements.push({
        id: i,
        position: [
          MathUtils.randomFloat(-40, 40),
          0,
          MathUtils.randomFloat(-40, 40)
        ],
        scale: MathUtils.randomFloat(0.5, 2),
        rotation: [0, Math.random() * Math.PI * 2, 0],
        type: Math.random() > 0.5 ? 'tree' : 'rock'
      });
    }

    return elements;
  }, [theme]);

  return (
    <group>
      {decorations.map(decoration => (
        <mesh
          key={decoration.id}
          position={decoration.position}
          scale={[decoration.scale, decoration.scale, decoration.scale]}
          rotation={decoration.rotation}
          castShadow
          receiveShadow
        >
          {decoration.type === 'tree' ? (
            <>
              {/* Tree trunk */}
              <cylinderGeometry args={[0.2, 0.3, 2]} />
              <meshStandardMaterial color={0x8B4513} />
            </>
          ) : (
            <>
              {/* Rock */}
              <sphereGeometry args={[0.5, 6, 6]} />
              <meshStandardMaterial color={0x666666} />
            </>
          )}
        </mesh>
      ))}
    </group>
  );
}

function BackgroundGeometry({ worldData }) {
  return (
    <group>
      {/* Background mountains/hills */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          position={[
            (i - 4) * 15,
            MathUtils.randomFloat(5, 15),
            -45
          ]}
          scale={[
            MathUtils.randomFloat(8, 12),
            MathUtils.randomFloat(10, 20),
            MathUtils.randomFloat(8, 12)
          ]}
        >
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color={0x4a5d4a} />
        </mesh>
      ))}
    </group>
  );
}

// ========================================
// 📹 CONTROLES DE CÁMARA
// ========================================

function CameraControls({ mode, onModeChange, enabled }) {
  const { camera } = useThree();

  // Camera mode switching with keyboard
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'c' || event.key === 'C') {
        const modes = ['follow', 'free', 'cinematic'];
        const currentIndex = modes.indexOf(mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        onModeChange(modes[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mode, onModeChange]);

  return (
    <>
      {enabled && (
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2}
        />
      )}
    </>
  );
}

// ========================================
// 🐛 INFORMACIÓN DE DEBUG
// ========================================

function DebugInfo({ playerPosition, performance, worldData }) {
  const { camera } = useThree();

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      background: 'rgba(0,0,0,0.8)',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: '12px',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 1000,
      pointerEvents: 'none'
    }}>
      <div>Player: x:{playerPosition.x.toFixed(2)} y:{playerPosition.y.toFixed(2)} z:{playerPosition.z.toFixed(2)}</div>
      <div>Camera: x:{camera.position.x.toFixed(2)} y:{camera.position.y.toFixed(2)} z:{camera.position.z.toFixed(2)}</div>
      <div>FPS: {performance.fps || 0}</div>
      <div>Frame Time: {performance.frameTime || 0}ms</div>
      <div>Draw Calls: {performance.drawCalls || 0}</div>
      <div>Triangles: {performance.triangles || 0}</div>
      <div>Memory: {performance.memoryUsage?.toFixed(1) || 0}MB</div>
      <div>Level: {worldData.level || 1}</div>
      <div>Theme: {worldData.theme || 'forest'}</div>
    </div>
  );
}

// ========================================
// 🔄 FALLBACK DE CARGA
// ========================================

function WorldLoadingFallback() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'white',
      fontSize: '18px',
      textAlign: 'center'
    }}>
      <div>Loading World...</div>
      <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
        Generating terrain and entities
      </div>
    </div>
  );
}

// ========================================
// 🛠️ UTILITY FUNCTIONS
// ========================================

async function loadWorldData(level) {
  // Simulate loading time
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Generate procedural world data
  const themes = ['forest', 'cave', 'ocean'];
  const theme = themes[Math.min(level - 1, themes.length - 1)];

  return {
    level,
    theme,
    spawnPoint: [0, 1, 0],
    bounds: 50,
    platforms: generateLevelPlatforms(level),
    collectibles: generateLevelCollectibles(level),
    enemies: generateLevelEnemies(level),
    objectives: generateLevelObjectives(level),
    metadata: {
      name: `Level ${level}`,
      description: `Adventure through the ${theme}`,
      difficulty: level <= 3 ? 'easy' : level <= 6 ? 'medium' : 'hard',
      estimatedTime: `${Math.min(5 + level * 2, 15)} minutes`
    }
  };
}

function generateLevelPlatforms(level) {
  // Platform generation logic would go here
  return null; // Let Platforms component generate procedurally
}

function generateLevelCollectibles(level) {
  // Collectible generation logic would go here
  return null; // Let Collectibles component generate procedurally
}

function generateLevelEnemies(level) {
  // Enemy generation logic would go here
  return null; // Let Enemies component generate procedurally
}

function generateLevelObjectives(level) {
  return [
    {
      id: 'main',
      type: 'collect',
      target: 'coins',
      amount: 10 + level * 5,
      description: `Collect ${10 + level * 5} coins`
    },
    {
      id: 'secondary',
      type: 'defeat',
      target: 'enemies',
      amount: 3 + level * 2,
      description: `Defeat ${3 + level * 2} enemies`
    }
  ];
}

export default GameWorld;
