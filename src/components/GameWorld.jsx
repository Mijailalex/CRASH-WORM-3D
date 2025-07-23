/* ============================================================================ */
/* 🎮 CRASH WORM 3D - MUNDO DEL JUEGO */
/* ============================================================================ */

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Sky,
  ContactShadows,
  OrbitControls,
  PerspectiveCamera,
  Lightformer,
  Float
} from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

import { useGame } from '@/context/GameContext';
import { gameConfig } from '@/data/gameConfig';
import useGameEngine from '@/hooks/useGameEngine';
import useAudioManager from '@/hooks/useAudioManager';

// Componentes del juego
import Player from './Player';
import EnemyManager from './Enemies';
import CollectibleManager from './Collectibles';
import PlatformManager from './Platforms';
import ParticleEffectsManager from './ParticleEffects';

// ========================================
// 🌍 COMPONENTE PRINCIPAL DEL MUNDO
// ========================================

export function GameWorld() {
  const { state, actions, utils } = useGame();
  const { camera, scene, gl } = useThree();
  const { playMusic, playSound } = useAudioManager();
  const {
    engine,
    isInitialized: isEngineReady,
    startEngine,
    createEntity,
    addComponent
  } = useGameEngine();

  // Referencias principales
  const worldRef = useRef();
  const playerRef = useRef();
  const cameraRigRef = useRef();
  const lightingRef = useRef();

  // Estado del mundo
  const [isWorldReady, setIsWorldReady] = useState(false);
  const [currentLevelData, setCurrentLevelData] = useState(null);
  const [ambientSettings, setAmbientSettings] = useState({
    timeOfDay: 'day',
    weather: 'clear',
    atmosphere: 'normal'
  });

  // ========================================
  // 🚀 INICIALIZACIÓN DEL MUNDO
  // ========================================

  useEffect(() => {
    const initializeWorld = async () => {
      if (!isEngineReady) return;

      try {
        // Inicializar sistemas del mundo
        await setupWorldSystems();

        // Cargar datos del nivel
        const levelData = await loadLevelData(state.level);
        setCurrentLevelData(levelData);

        // Configurar escena 3D
        setupScene();

        // Iniciar música de gameplay
        playMusic('/audio/gameplay-music.mp3', {
          loop: true,
          volume: 0.4
        });

        // Iniciar el motor del juego
        startEngine();

        setIsWorldReady(true);
        console.log('🌍 Game world initialized successfully');

      } catch (error) {
        console.error('❌ Failed to initialize world:', error);
      }
    };

    initializeWorld();
  }, [isEngineReady, state.level, startEngine, playMusic]);

  // ========================================
  // ⚙️ CONFIGURACIÓN DE SISTEMAS
  // ========================================

  const setupWorldSystems = async () => {
    const gameEngine = engine();
    if (!gameEngine) return;

    // Crear entidad del mundo
    const worldEntityId = createEntity('world');

    // Agregar componentes del mundo
    addComponent(worldEntityId, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    });

    // Sistema de cámara
    addComponent(worldEntityId, 'camera', {
      target: playerRef,
      offset: { x: 0, y: 5, z: 8 },
      smoothing: 0.1,
      bounds: gameConfig.world.worldBounds
    });

    // Sistema de iluminación
    addComponent(worldEntityId, 'lighting', {
      ambientIntensity: 0.4,
      directionalIntensity: 1.0,
      shadowsEnabled: true
    });
  };

  const loadLevelData = async (levelNumber) => {
    // En un juego real, esto cargaría desde archivos JSON o API
    const levelData = {
      id: levelNumber,
      name: `Level ${levelNumber}`,
      theme: getLevelTheme(levelNumber),

      // Spawn del jugador
      playerSpawn: { x: 0, y: 3, z: 0 },

      // Objetivo del nivel
      objective: {
        type: 'collect_all',
        description: 'Collect all gems and reach the exit',
        target: 10
      },

      // Configuración de plataformas
      platforms: generateLevelPlatforms(levelNumber),

      // Configuración de enemigos
      enemies: generateLevelEnemies(levelNumber),

      // Configuración de coleccionables
      collectibles: generateLevelCollectibles(levelNumber),

      // Configuración ambiental
      environment: {
        skybox: 'day',
        lighting: 'bright',
        atmosphere: 'clear',
        backgroundMusic: 'level-theme'
      }
    };

    return levelData;
  };

  const setupScene = () => {
    // Configurar renderer
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;

    // Configurar escena
    scene.fog = new THREE.Fog('#87CEEB', 50, 200);
  };

  // ========================================
  // 🎮 LÓGICA DEL JUEGO
  // ========================================

  useFrame((_, deltaTime) => {
    if (!isWorldReady || !utils.isPlaying) return;

    // Actualizar sistemas del mundo
    updateCameraSystem(deltaTime);
    updateAmbientSystems(deltaTime);
    updateGameLogic(deltaTime);
  });

  const updateCameraSystem = (deltaTime) => {
    if (!playerRef.current || !cameraRigRef.current) return;

    const playerPosition = playerRef.current.translation();
    const targetPosition = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y + 5,
      playerPosition.z + 10
    );

    // Smooth camera follow
    cameraRigRef.current.position.lerp(targetPosition, deltaTime * 2);
    cameraRigRef.current.lookAt(
      playerPosition.x,
      playerPosition.y + 1,
      playerPosition.z
    );
  };

  const updateAmbientSystems = (deltaTime) => {
    // Actualizar efectos ambientales
    if (lightingRef.current) {
      const time = Date.now() * 0.0005;
      lightingRef.current.intensity = 0.8 + Math.sin(time) * 0.1;
    }
  };

  const updateGameLogic = (deltaTime) => {
    // Verificar condiciones de victoria/derrota
    checkWinConditions();
    checkLoseConditions();

    // Actualizar estadísticas del juego
    actions.updateTime(state.timeElapsed + deltaTime);
  };

  const checkWinConditions = () => {
    if (!currentLevelData) return;

    // Verificar si se completaron todos los objetivos
    const allCollectiblesCollected = state.collectibles >= state.totalCollectibles;
    const playerAtExit = false; // Se implementaría la detección de zona de salida

    if (allCollectiblesCollected && playerAtExit) {
      actions.victory();
      playSound('victory');
    }
  };

  const checkLoseConditions = () => {
    if (state.health <= 0 && state.lives <= 0) {
      actions.gameOver();
      playSound('gameOver');
    }
  };

  // ========================================
  // 🎨 RENDER DEL MUNDO
  // ========================================

  if (!isWorldReady || !currentLevelData) {
    return <WorldLoadingScreen />;
  }

  return (
    <group ref={worldRef}>
      {/* Sistema de Física */}
      <Physics gravity={[0, gameConfig.world.gravity, 0]} debug={import.meta.env.DEV}>

        {/* Configuración de Cámara */}
        <CameraRig ref={cameraRigRef} />

        {/* Sistema de Iluminación */}
        <LightingSystem ref={lightingRef} settings={ambientSettings} />

        {/* Entorno y Atmosfera */}
        <EnvironmentSystem levelData={currentLevelData} />

        {/* Jugador */}
        <Suspense fallback={<PlayerPlaceholder />}>
          <Player
            ref={playerRef}
            position={currentLevelData.playerSpawn}
          />
        </Suspense>

        {/* Elementos del Nivel */}
        <LevelElements levelData={currentLevelData} playerRef={playerRef} />

        {/* Efectos y Partículas */}
        <ParticleEffectsManager />

        {/* Geometría del Terreno */}
        <TerrainGeometry levelData={currentLevelData} />

        {/* Colisores Invisibles */}
        <WorldBoundaries />

      </Physics>

      {/* Elementos sin Física */}
      <SkyboxAndBackground levelData={currentLevelData} />

      {/* Debug Helpers */}
      {import.meta.env.DEV && <DebugHelpers />}
    </group>
  );
}

// ========================================
// 📹 SISTEMA DE CÁMARA
// ========================================

const CameraRig = React.forwardRef((props, ref) => {
  return (
    <group ref={ref}>
      <PerspectiveCamera
        makeDefault
        fov={75}
        near={0.1}
        far={1000}
        position={[0, 5, 10]}
      />
    </group>
  );
});

// ========================================
// 💡 SISTEMA DE ILUMINACIÓN
// ========================================

const LightingSystem = React.forwardRef(({ settings }, ref) => {
  return (
    <group>
      {/* Luz ambiental */}
      <ambientLight intensity={0.4} color="#ffffff" />

      {/* Luz direccional principal */}
      <directionalLight
        ref={ref}
        position={[10, 20, 5]}
        intensity={1.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Luces de relleno */}
      <pointLight
        position={[-10, 10, -10]}
        intensity={0.3}
        color="#4488ff"
        distance={30}
      />

      <pointLight
        position={[10, 5, 10]}
        intensity={0.2}
        color="#ff8844"
        distance={25}
      />

      {/* Luz de respaldo */}
      <hemisphereLight
        skyColor="#87CEEB"
        groundColor="#8B4513"
        intensity={0.2}
      />
    </group>
  );
});

// ========================================
// 🌍 SISTEMA DE ENTORNO
// ========================================

function EnvironmentSystem({ levelData }) {
  return (
    <>
      {/* Entorno HDR */}
      <Environment preset="dawn" background={false} />

      {/* Contacto de sombras */}
      <ContactShadows
        position={[0, -0.1, 0]}
        opacity={0.4}
        scale={50}
        blur={2}
        far={20}
      />

      {/* Efectos atmosféricos */}
      <Float speed={1} rotationIntensity={0} floatIntensity={0.2}>
        <Lightformer
          position={[0, 5, -10]}
          scale={[10, 5, 1]}
          color="#87CEEB"
          intensity={0.5}
          form="rect"
        />
      </Float>
    </>
  );
}

// ========================================
// 🎮 ELEMENTOS DEL NIVEL
// ========================================

function LevelElements({ levelData, playerRef }) {
  return (
    <group>
      {/* Plataformas */}
      <Suspense fallback={<div>Loading platforms...</div>}>
        <PlatformManager levelData={levelData} />
      </Suspense>

      {/* Enemigos */}
      <Suspense fallback={<div>Loading enemies...</div>}>
        <EnemyManager
          levelData={levelData}
          playerRef={playerRef}
        />
      </Suspense>

      {/* Coleccionables */}
      <Suspense fallback={<div>Loading collectibles...</div>}>
        <CollectibleManager
          levelData={levelData}
          playerRef={playerRef}
        />
      </Suspense>
    </group>
  );
}

// ========================================
// 🗻 GEOMETRÍA DEL TERRENO
// ========================================

function TerrainGeometry({ levelData }) {
  return (
    <group>
      {/* Plano base */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh receiveShadow position={[0, -1, 0]}>
          <boxGeometry args={[200, 2, 200]} />
          <meshStandardMaterial
            color="#228B22"
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      </RigidBody>

      {/* Elementos decorativos del terreno */}
      <TerrainDecorations theme={levelData.theme} />
    </group>
  );
}

function TerrainDecorations({ theme }) {
  const decorations = [];

  // Generar decoraciones aleatorias
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    const scale = 0.5 + Math.random() * 1.5;

    decorations.push(
      <Float key={i} speed={1 + Math.random()} rotationIntensity={0.1}>
        <mesh position={[x, 0, z]} scale={scale}>
          <coneGeometry args={[0.5, 2, 8]} />
          <meshStandardMaterial color="#2F4F2F" />
        </mesh>
      </Float>
    );
  }

  return <group>{decorations}</group>;
}

// ========================================
// 🚧 LÍMITES DEL MUNDO
// ========================================

function WorldBoundaries() {
  const bounds = gameConfig.world.worldBounds;

  return (
    <group>
      {/* Paredes invisibles */}
      <RigidBody type="fixed" position={[bounds.x.min, 0, 0]}>
        <mesh visible={false}>
          <boxGeometry args={[1, 100, 200]} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" position={[bounds.x.max, 0, 0]}>
        <mesh visible={false}>
          <boxGeometry args={[1, 100, 200]} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" position={[0, 0, bounds.z.min]}>
        <mesh visible={false}>
          <boxGeometry args={[200, 100, 1]} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" position={[0, 0, bounds.z.max]}>
        <mesh visible={false}>
          <boxGeometry args={[200, 100, 1]} />
        </mesh>
      </RigidBody>

      {/* Suelo de muerte */}
      <RigidBody type="fixed" position={[0, bounds.y.min, 0]}>
        <mesh visible={false}>
          <boxGeometry args={[200, 1, 200]} />
        </mesh>
      </RigidBody>
    </group>
  );
}

// ========================================
// 🌌 SKYBOX Y FONDO
// ========================================

function SkyboxAndBackground({ levelData }) {
  return (
    <group>
      <Sky
        distance={450000}
        sunPosition={[10, 20, 30]}
        inclination={0}
        azimuth={0.25}
        rayleigh={0.5}
        turbidity={10}
        mieCoefficient={0.005}
        mieDirectionalG={0.7}
      />
    </group>
  );
}

// ========================================
// 🔄 PANTALLA DE CARGA DEL MUNDO
// ========================================

function WorldLoadingScreen() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="#4488ff" wireframe />
      </mesh>
      <pointLight position={[10, 10, 10]} />
    </group>
  );
}

// ========================================
// 👤 PLACEHOLDER DEL JUGADOR
// ========================================

function PlayerPlaceholder() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[1, 2, 1]} />
      <meshBasicMaterial color="#00ff00" wireframe />
    </mesh>
  );
}

// ========================================
// 🐛 HELPERS DE DEBUG
// ========================================

function DebugHelpers() {
  return (
    <group>
      {/* Grid helper */}
      <gridHelper args={[100, 50, '#444444', '#222222']} />

      {/* Axes helper */}
      <axesHelper args={[5]} />

      {/* Controles de órbita para debug */}
      <OrbitControls
        enabled={false}
        target={[0, 0, 0]}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    </group>
  );
}

// ========================================
// 🛠️ FUNCIONES AUXILIARES
// ========================================

function getLevelTheme(levelNumber) {
  const themes = ['forest', 'desert', 'ice', 'volcano', 'space'];
  return themes[(levelNumber - 1) % themes.length];
}

function generateLevelPlatforms(levelNumber) {
  const basePlatforms = [
    { type: 'static', position: [0, 0, 0], size: [20, 1, 4], material: 'grass' },
    { type: 'static', position: [25, 2, 0], size: [8, 1, 4], material: 'stone' }
  ];

  // Agregar más plataformas basadas en el nivel
  for (let i = 0; i < levelNumber; i++) {
    basePlatforms.push({
      type: 'moving',
      position: [15 + i * 10, 3 + i * 2, 0],
      size: [4, 0.5, 4],
      movement: { type: 'horizontal', distance: 5, speed: 1 + i * 0.2 },
      material: 'metal'
    });
  }

  return basePlatforms;
}

function generateLevelEnemies(levelNumber) {
  const baseEnemies = [
    { type: 'basic', position: [10, 2, 0], count: 1 },
    { type: 'flying', position: [30, 6, 0], count: 1 }
  ];

  // Agregar más enemigos basados en el nivel
  for (let i = 1; i < levelNumber; i++) {
    baseEnemies.push({
      type: Math.random() > 0.5 ? 'basic' : 'flying',
      position: [5 + i * 15, 2 + Math.random() * 4, (Math.random() - 0.5) * 10],
      count: 1
    });
  }

  return baseEnemies;
}

function generateLevelCollectibles(levelNumber) {
  const baseCollectibles = [
    { type: 'coin', positions: [[5, 2, 0], [15, 2, 0], [35, 2, 0]] },
    { type: 'gem', positions: [[25, 4, 0]] }
  ];

  // Agregar más coleccionables basados en el nivel
  for (let i = 1; i < levelNumber; i++) {
    baseCollectibles.push({
      type: 'coin',
      positions: [
        [i * 8, 2 + Math.random() * 3, (Math.random() - 0.5) * 8],
        [i * 8 + 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 8]
      ]
    });
  }

  return baseCollectibles;
}

export default GameWorld;
