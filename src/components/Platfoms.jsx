/* ============================================================================ */
/* 🎮 CRASH WORM 3D - COMPONENTES DE PLATAFORMAS */
/* ============================================================================ */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/rapier';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '@/context/GameContext';
import { gameConfig } from '@/data/gameConfig';
import { MathUtils } from '@/utils/gameUtils';

// ========================================
// 🏗️ MANAGER DE PLATAFORMAS
// ========================================

export function PlatformManager({ levelData = {} }) {
  const { utils } = useGame();
  const [platforms, setPlatforms] = useState([]);

  // Cargar plataformas del nivel
  useEffect(() => {
    if (!utils.isPlaying) return;

    const loadPlatforms = () => {
      const platformConfigs = levelData.platforms || [
        // Plataformas estáticas básicas
        { type: 'static', position: [0, 0, 0], size: [20, 1, 4], material: 'grass' },
        { type: 'static', position: [25, 2, 0], size: [8, 1, 4], material: 'stone' },
        { type: 'static', position: [40, 4, 0], size: [6, 1, 4], material: 'metal' },

        // Plataformas móviles
        { type: 'moving', position: [15, 6, 0], size: [4, 0.5, 4],
          movement: { type: 'horizontal', distance: 8, speed: 2 }, material: 'wood' },
        { type: 'moving', position: [35, 8, 0], size: [3, 0.5, 3],
          movement: { type: 'vertical', distance: 6, speed: 1.5 }, material: 'crystal' },

        // Plataforma rotatoria
        { type: 'rotating', position: [55, 6, 0], size: [8, 1, 2],
          rotation: { axis: 'y', speed: 1 }, material: 'metal' },

        // Plataformas que caen
        { type: 'falling', position: [70, 10, 0], size: [4, 0.5, 4],
          trigger: { delay: 1, fallSpeed: 15 }, material: 'wood' },

        // Plataformas temporales
        { type: 'disappearing', position: [85, 8, 0], size: [5, 0.5, 4],
          timer: { visible: 3, hidden: 2 }, material: 'energy' }
      ];

      const newPlatforms = platformConfigs.map((config, index) => ({
        id: index,
        ...config,
        active: true,
        originalPosition: [...config.position],
        state: getInitialPlatformState(config.type)
      }));

      setPlatforms(newPlatforms);
    };

    loadPlatforms();
  }, [utils.isPlaying, levelData]);

  const getInitialPlatformState = (type) => {
    switch (type) {
      case 'moving':
        return { direction: 1, currentDistance: 0 };
      case 'rotating':
        return { currentRotation: 0 };
      case 'falling':
        return { triggered: false, falling: false };
      case 'disappearing':
        return { visible: true, timer: 0 };
      default:
        return {};
    }
  };

  return (
    <group>
      {platforms.map(platform => (
        platform.active && (
          <Platform
            key={platform.id}
            {...platform}
          />
        )
      ))}
    </group>
  );
}

// ========================================
// 🧱 COMPONENTE BASE DE PLATAFORMA
// ========================================

function Platform({
  id,
  type,
  position,
  originalPosition,
  size,
  material,
  movement,
  rotation,
  trigger,
  timer,
  state: initialState
}) {
  const { utils } = useGame();

  const platformRef = useRef();
  const meshRef = useRef();

  const [platformState, setPlatformState] = useState(initialState);
  const [isPlayerOnPlatform, setIsPlayerOnPlatform] = useState(false);

  // Configurar física
  const [ref, api] = useBox(() => ({
    mass: type === 'falling' ? 1 : 0, // Solo las plataformas que caen tienen masa
    position,
    args: size,
    material: { friction: 0.8, restitution: 0.1 },
    type: type === 'static' ? 'fixed' : 'kinematicPosition'
  }));

  // ========================================
  // 🔄 SISTEMA DE MOVIMIENTO
  // ========================================

  const updateMovement = useCallback((deltaTime) => {
    if (!ref.current || !utils.isPlaying) return;

    switch (type) {
      case 'moving':
        updateMovingPlatform(deltaTime);
        break;
      case 'rotating':
        updateRotatingPlatform(deltaTime);
        break;
      case 'falling':
        updateFallingPlatform(deltaTime);
        break;
      case 'disappearing':
        updateDisappearingPlatform(deltaTime);
        break;
    }
  }, [type, utils.isPlaying]);

  const updateMovingPlatform = useCallback((deltaTime) => {
    if (!movement) return;

    const { type: moveType, distance, speed } = movement;
    const moveDistance = speed * deltaTime * platformState.direction;

    setPlatformState(prev => {
      let newDistance = prev.currentDistance + moveDistance;
      let newDirection = prev.direction;

      // Invertir dirección en los límites
      if (newDistance >= distance) {
        newDistance = distance;
        newDirection = -1;
      } else if (newDistance <= -distance) {
        newDistance = -distance;
        newDirection = 1;
      }

      // Calcular nueva posición
      let newPosition = [...originalPosition];

      if (moveType === 'horizontal') {
        newPosition[0] = originalPosition[0] + newDistance;
      } else if (moveType === 'vertical') {
        newPosition[1] = originalPosition[1] + newDistance;
      } else if (moveType === 'circular') {
        const angle = (newDistance / distance) * Math.PI * 2;
        newPosition[0] = originalPosition[0] + Math.cos(angle) * distance;
        newPosition[1] = originalPosition[1] + Math.sin(angle) * distance;
      }

      // Actualizar posición física
      api.setTranslation({ x: newPosition[0], y: newPosition[1], z: newPosition[2] }, false);

      return {
        ...prev,
        currentDistance: newDistance,
        direction: newDirection
      };
    });
  }, [movement, originalPosition, platformState.direction, api]);

  const updateRotatingPlatform = useCallback((deltaTime) => {
    if (!rotation) return;

    const { axis, speed } = rotation;
    const rotationAmount = speed * deltaTime;

    setPlatformState(prev => {
      const newRotation = prev.currentRotation + rotationAmount;

      // Aplicar rotación
      if (meshRef.current) {
        if (axis === 'x') {
          meshRef.current.rotation.x = newRotation;
        } else if (axis === 'y') {
          meshRef.current.rotation.y = newRotation;
        } else if (axis === 'z') {
          meshRef.current.rotation.z = newRotation;
        }
      }

      return { ...prev, currentRotation: newRotation };
    });
  }, [rotation]);

  const updateFallingPlatform = useCallback((deltaTime) => {
    if (!trigger || !isPlayerOnPlatform) return;

    setPlatformState(prev => {
      if (!prev.triggered && isPlayerOnPlatform) {
        // Iniciar timer de caída
        setTimeout(() => {
          setPlatformState(current => ({ ...current, falling: true }));
          api.setBodyType(1); // Cambiar a cuerpo dinámico
        }, trigger.delay * 1000);

        return { ...prev, triggered: true };
      }

      if (prev.falling) {
        // Aplicar fuerza de caída
        api.applyImpulse({ x: 0, y: -trigger.fallSpeed, z: 0 }, true);
      }

      return prev;
    });
  }, [trigger, isPlayerOnPlatform, api]);

  const updateDisappearingPlatform = useCallback((deltaTime) => {
    if (!timer) return;

    setPlatformState(prev => {
      const newTimer = prev.timer + deltaTime;
      const cycle = timer.visible + timer.hidden;
      const cyclePosition = newTimer % cycle;
      const shouldBeVisible = cyclePosition < timer.visible;

      if (shouldBeVisible !== prev.visible) {
        // Cambiar visibilidad
        if (meshRef.current) {
          meshRef.current.visible = shouldBeVisible;
        }

        // Activar/desactivar física
        api.setEnabled(shouldBeVisible);
      }

      return {
        ...prev,
        timer: newTimer,
        visible: shouldBeVisible
      };
    });
  }, [timer, api]);

  // ========================================
  // 🎯 DETECCIÓN DE JUGADOR
  // ========================================

  const checkPlayerOnPlatform = useCallback(() => {
    // Esta función sería llamada por el sistema de colisiones
    // Por simplicidad, aquí solo manejamos el estado
  }, []);

  // Callback para cuando el jugador entra/sale de la plataforma
  const handlePlayerContact = useCallback((isOnPlatform) => {
    setIsPlayerOnPlatform(isOnPlatform);
  }, []);

  // ========================================
  // 🎨 MATERIALES Y TEXTURAS
  // ========================================

  const getPlatformMaterial = () => {
    const materialConfigs = {
      grass: { color: '#4a7c59', roughness: 0.8, metalness: 0.1 },
      stone: { color: '#8c8c8c', roughness: 0.9, metalness: 0.1 },
      metal: { color: '#b8b8b8', roughness: 0.2, metalness: 0.8 },
      wood: { color: '#daa520', roughness: 0.8, metalness: 0.1 },
      crystal: { color: '#e0e0ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.8 },
      energy: {
        color: '#00ffff',
        roughness: 0.0,
        metalness: 0.0,
        emissive: '#004444',
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
      }
    };

    const config = materialConfigs[material] || materialConfigs.stone;

    return (
      <meshStandardMaterial
        color={config.color}
        roughness={config.roughness}
        metalness={config.metalness}
        emissive={config.emissive}
        emissiveIntensity={config.emissiveIntensity}
        transparent={config.transparent}
        opacity={config.opacity}
      />
    );
  };

  // ========================================
  // 🔄 GAME LOOP
  // ========================================

  useFrame((_, deltaTime) => {
    if (!utils.isPlaying) return;

    updateMovement(deltaTime);
    checkPlayerOnPlatform();

    // Actualizar efectos visuales
    if (meshRef.current) {
      // Efecto de pulsación para plataformas de energía
      if (material === 'energy') {
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
        meshRef.current.scale.y = pulse;
      }

      // Efecto de temblor para plataformas que van a caer
      if (type === 'falling' && platformState.triggered && !platformState.falling) {
        const shake = Math.sin(Date.now() * 0.02) * 0.02;
        meshRef.current.position.x = originalPosition[0] + shake;
      }
    }
  });

  // ========================================
  // 🎨 RENDER
  // ========================================

  return (
    <group ref={platformRef}>
      {/* Cuerpo principal de la plataforma */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        visible={type !== 'disappearing' || platformState.visible}
      >
        <boxGeometry args={size} />
        {getPlatformMaterial()}
      </mesh>

      {/* Efectos especiales según el tipo */}
      {type === 'moving' && material === 'crystal' && (
        <CrystalEffects size={size} />
      )}

      {type === 'rotating' && (
        <RotatingEffects size={size} />
      )}

      {type === 'falling' && platformState.triggered && !platformState.falling && (
        <FallingWarningEffects size={size} />
      )}

      {type === 'disappearing' && (
        <DisappearingEffects
          size={size}
          visible={platformState.visible}
          timer={platformState.timer}
          config={timer}
        />
      )}

      {/* Indicadores de debug */}
      {import.meta.env.DEV && (
        <DebugIndicators
          type={type}
          size={size}
          isPlayerOn={isPlayerOnPlatform}
          state={platformState}
        />
      )}

      {/* Física invisible */}
      <mesh ref={ref} visible={false}>
        <boxGeometry args={size} />
      </mesh>
    </group>
  );
}

// ========================================
// ✨ EFECTOS ESPECIALES
// ========================================

function CrystalEffects({ size }) {
  const particlesRef = useRef();

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={particlesRef}>
      {[...Array(8)].map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * size[0],
            size[1] / 2 + 0.2,
            (Math.random() - 0.5) * size[2]
          ]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color="#e0e0ff"
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

function RotatingEffects({ size }) {
  return (
    <group>
      {/* Indicadores de rotación */}
      {[...Array(4)].map((_, i) => (
        <mesh
          key={i}
          position={[
            (i % 2 === 0 ? 1 : -1) * size[0] / 2,
            size[1] / 2 + 0.1,
            (i < 2 ? 1 : -1) * size[2] / 2
          ]}
        >
          <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      ))}
    </group>
  );
}

function FallingWarningEffects({ size }) {
  const warningRef = useRef();

  useFrame(() => {
    if (warningRef.current) {
      const intensity = Math.sin(Date.now() * 0.01);
      warningRef.current.material.emissiveIntensity = Math.abs(intensity) * 0.5;
    }
  });

  return (
    <mesh ref={warningRef} position={[0, size[1] / 2 + 0.01, 0]}>
      <boxGeometry args={[size[0], 0.02, size[2]]} />
      <meshStandardMaterial
        color="#ff4444"
        emissive="#ff0000"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

function DisappearingEffects({ size, visible, timer, config }) {
  const effectRef = useRef();

  useFrame(() => {
    if (effectRef.current && config) {
      const cycle = config.visible + config.hidden;
      const cyclePosition = timer % cycle;

      if (visible && cyclePosition > config.visible - 1) {
        // Advertencia antes de desaparecer
        const warning = Math.sin((cyclePosition - (config.visible - 1)) * 10);
        effectRef.current.material.opacity = 0.3 + Math.abs(warning) * 0.4;
      } else {
        effectRef.current.material.opacity = visible ? 0.7 : 0.1;
      }
    }
  });

  return (
    <mesh ref={effectRef} position={[0, size[1] / 2 + 0.05, 0]}>
      <boxGeometry args={[size[0] * 1.1, 0.1, size[2] * 1.1]} />
      <meshBasicMaterial
        color="#00ffff"
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// ========================================
// 🔍 INDICADORES DE DEBUG
// ========================================

function DebugIndicators({ type, size, isPlayerOn, state }) {
  return (
    <group>
      {/* Wireframe del collider */}
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial
          color={isPlayerOn ? "#00ff00" : "#ffffff"}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Información del estado */}
      <mesh position={[0, size[1] / 2 + 1, 0]}>
        <planeGeometry args={[2, 0.5]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.7} />
      </mesh>

      {/* Aquí podrías agregar texto con información del estado */}
    </group>
  );
}

export default PlatformManager;
