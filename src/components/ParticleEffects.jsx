/* ============================================================================ */
/* 🎮 CRASH WORM 3D - SISTEMA DE EFECTOS DE PARTÍCULAS */
/* ============================================================================ */
/* Ubicación: src/components/ParticleEffects.jsx */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameContext } from '../context/GameContext';
import { gameConfig } from '../data/gameConfig';
import { MathUtils, VectorUtils, PerformanceUtils } from '../utils/gameUtils';

// ========================================
// ✨ COMPONENTE PRINCIPAL DE EFECTOS DE PARTÍCULAS
// ========================================

export function ParticleEffects({ effects = [], globalEffects = true, ...props }) {
  const { settings, performance } = useGameContext();
  const [activeEffects, setActiveEffects] = useState([]);
  const [globalParticles, setGlobalParticles] = useState([]);

  // Effect management
  useEffect(() => {
    setActiveEffects(effects);
  }, [effects]);

  // Global environmental effects
  useEffect(() => {
    if (globalEffects) {
      const environmentalEffects = generateEnvironmentalEffects();
      setGlobalParticles(environmentalEffects);
    }
  }, [globalEffects]);

  const removeEffect = useCallback((effectId) => {
    setActiveEffects(prev => prev.filter(effect => effect.id !== effectId));
  }, []);

  const addEffect = useCallback((effectData) => {
    const newEffect = {
      id: Date.now() + Math.random(),
      ...effectData,
      startTime: Date.now()
    };
    setActiveEffects(prev => [...prev, newEffect]);
  }, []);

  return (
    <group {...props}>
      {/* Active Effects */}
      {activeEffects.map((effect) => (
        <ParticleEffect
          key={effect.id}
          data={effect}
          onComplete={() => removeEffect(effect.id)}
        />
      ))}

      {/* Global Environmental Effects */}
      {globalEffects && (
        <EnvironmentalEffects particles={globalParticles} />
      )}
    </group>
  );
}

// ========================================
// 🎆 COMPONENTE DE EFECTO DE PARTÍCULAS INDIVIDUAL
// ========================================

function ParticleEffect({ data, onComplete }) {
  const particlesRef = useRef();
  const materialRef = useRef();
  const [isActive, setIsActive] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Effect configuration
  const config = useMemo(() => ({
    type: data.type || 'explosion',
    position: data.position || { x: 0, y: 0, z: 0 },
    count: data.count || 50,
    duration: data.duration || 2000, // milliseconds
    spread: data.spread || 2,
    speed: data.speed || 5,
    gravity: data.gravity || -9.8,
    color: data.color || 0xffffff,
    size: data.size || 0.1,
    opacity: data.opacity || 1,
    fadeOut: data.fadeOut !== false,
    texture: data.texture || null,
    blending: data.blending || THREE.NormalBlending,
    ...data
  }), [data]);

  // Particle data arrays
  const particleData = useMemo(() => {
    return initializeParticles(config);
  }, [config]);

  // ========================================
  // 🔄 PARTICLE UPDATE LOOP
  // ========================================

  useFrame((state, delta) => {
    if (!isActive || !particlesRef.current) return;

    setElapsedTime(prev => prev + delta * 1000);

    // Check if effect should end
    if (elapsedTime >= config.duration) {
      setIsActive(false);
      onComplete?.();
      return;
    }

    // Update particles based on type
    updateParticles(delta, elapsedTime);
  });

  const updateParticles = useCallback((delta, time) => {
    const { positions, velocities, lifetimes, sizes, opacities } = particleData;
    const timeSeconds = time / 1000;
    const durationSeconds = config.duration / 1000;

    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;

      // Update lifetime
      lifetimes[i] -= delta;

      if (lifetimes[i] <= 0) {
        // Reset particle or mark as dead
        if (config.loop) {
          resetParticle(i, particleData, config);
        } else {
          // Hide particle
          positions[i3 + 1] = -1000;
          continue;
        }
      }

      // Apply velocity
      positions[i3] += velocities[i3] * delta;
      positions[i3 + 1] += velocities[i3 + 1] * delta;
      positions[i3 + 2] += velocities[i3 + 2] * delta;

      // Apply gravity
      velocities[i3 + 1] += config.gravity * delta;

      // Update size and opacity based on type
      updateParticleVisuals(i, timeSeconds, durationSeconds, particleData, config);
    }

    // Mark geometry for update
    if (particlesRef.current) {
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      if (particlesRef.current.geometry.attributes.size) {
        particlesRef.current.geometry.attributes.size.needsUpdate = true;
      }
      if (particlesRef.current.geometry.attributes.opacity) {
        particlesRef.current.geometry.attributes.opacity.needsUpdate = true;
      }
    }
  }, [particleData, config]);

  const updateParticleVisuals = useCallback((index, time, duration, data, cfg) => {
    const { sizes, opacities, lifetimes } = data;
    const lifeProgress = 1 - (lifetimes[index] / (cfg.duration / 1000));

    switch (cfg.type) {
      case 'explosion':
        // Explosion: start small, grow, then shrink
        sizes[index] = cfg.size * (Math.sin(lifeProgress * Math.PI) * 2);
        opacities[index] = cfg.opacity * (1 - lifeProgress);
        break;

      case 'fire':
        // Fire: grow and fade
        sizes[index] = cfg.size * (1 + lifeProgress * 0.5);
        opacities[index] = cfg.opacity * (1 - lifeProgress * 0.8);
        break;

      case 'smoke':
        // Smoke: grow and fade slowly
        sizes[index] = cfg.size * (1 + lifeProgress * 2);
        opacities[index] = cfg.opacity * (1 - lifeProgress * 0.6);
        break;

      case 'sparkle':
        // Sparkle: twinkle effect
        sizes[index] = cfg.size * (1 + Math.sin(time * 10 + index) * 0.3);
        opacities[index] = cfg.opacity * (0.5 + Math.sin(time * 8 + index) * 0.5);
        break;

      case 'energy':
        // Energy: pulse effect
        sizes[index] = cfg.size * (1 + Math.sin(time * 6 + index) * 0.4);
        opacities[index] = cfg.opacity * (0.7 + Math.sin(time * 4 + index) * 0.3);
        break;

      default:
        // Default: simple fade
        sizes[index] = cfg.size;
        opacities[index] = cfg.opacity * (1 - lifeProgress);
    }
  }, []);

  // ========================================
  // 🎨 RENDERING
  // ========================================

  if (!isActive) return null;

  return (
    <points
      ref={particlesRef}
      position={[config.position.x, config.position.y, config.position.z]}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particleData.positions}
          count={config.count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          array={particleData.sizes}
          count={config.count}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-opacity"
          array={particleData.opacities}
          count={config.count}
          itemSize={1}
        />
      </bufferGeometry>

      <ParticleMaterial
        ref={materialRef}
        config={config}
        particleData={particleData}
      />
    </points>
  );
}

// ========================================
// 🎨 MATERIAL DE PARTÍCULAS
// ========================================

const ParticleMaterial = React.forwardRef(({ config, particleData }, ref) => {
  const materialRef = useRef();

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  }, [config]);

  const vertexShader = `
    attribute float size;
    attribute float opacity;
    varying float vOpacity;

    void main() {
      vOpacity = opacity;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 color;
    uniform sampler2D pointTexture;
    varying float vOpacity;

    void main() {
      gl_FragColor = vec4(color, vOpacity);

      if (textureSize(pointTexture, 0).x > 0) {
        gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
      } else {
        // Default circular particle
        float dist = distance(gl_PointCoord, vec2(0.5, 0.5));
        if (dist > 0.5) discard;
        gl_FragColor.a *= (1.0 - dist * 2.0);
      }
    }
  `;

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={{
        color: { value: new THREE.Color(config.color) },
        pointTexture: { value: config.texture }
      }}
      transparent
      blending={config.blending}
      depthWrite={false}
    />
  );
});

// ========================================
// 🌍 EFECTOS AMBIENTALES
// ========================================

function EnvironmentalEffects({ particles }) {
  return (
    <group>
      {particles.map((particle, index) => (
        <EnvironmentalParticle
          key={`env-${index}`}
          data={particle}
        />
      ))}
    </group>
  );
}

function EnvironmentalParticle({ data }) {
  const particleRef = useRef();
  const [position, setPosition] = useState(data.position);

  useFrame((state, delta) => {
    if (!particleRef.current) return;

    // Update particle based on type
    switch (data.type) {
      case 'dust':
        updateDustParticle(delta);
        break;
      case 'ambient':
        updateAmbientParticle(delta);
        break;
      default:
        break;
    }
  });

  const updateDustParticle = useCallback((delta) => {
    setPosition(prev => ({
      x: prev.x + Math.sin(Date.now() * 0.001 + data.offset) * 0.5 * delta,
      y: prev.y + data.velocity.y * delta,
      z: prev.z + Math.cos(Date.now() * 0.001 + data.offset) * 0.3 * delta
    }));

    // Reset if too far
    if (position.y > 20) {
      setPosition({ ...data.position, y: -5 });
    }
  }, [data, position.y]);

  const updateAmbientParticle = useCallback((delta) => {
    setPosition(prev => ({
      x: prev.x + data.velocity.x * delta,
      y: prev.y + data.velocity.y * delta,
      z: prev.z + data.velocity.z * delta
    }));

    // Boundary checking and reset
    const bounds = 50;
    if (Math.abs(position.x) > bounds || Math.abs(position.z) > bounds || position.y < -5) {
      setPosition({
        x: MathUtils.randomFloat(-bounds, bounds),
        y: 20,
        z: MathUtils.randomFloat(-bounds, bounds)
      });
    }
  }, [data.velocity, position]);

  return (
    <mesh
      ref={particleRef}
      position={[position.x, position.y, position.z]}
    >
      <sphereGeometry args={[data.size, 4, 4]} />
      <meshBasicMaterial
        color={data.color}
        transparent
        opacity={data.opacity}
      />
    </mesh>
  );
}

// ========================================
// 🛠️ UTILITY FUNCTIONS
// ========================================

function initializeParticles(config) {
  const count = config.count;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const lifetimes = new Float32Array(count);
  const sizes = new Float32Array(count);
  const opacities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    resetParticle(i, { positions, velocities, lifetimes, sizes, opacities }, config);
  }

  return { positions, velocities, lifetimes, sizes, opacities };
}

function resetParticle(index, data, config) {
  const i3 = index * 3;
  const { positions, velocities, lifetimes, sizes, opacities } = data;

  // Initial position (with some spread)
  positions[i3] = MathUtils.randomFloat(-config.spread, config.spread);
  positions[i3 + 1] = MathUtils.randomFloat(-config.spread * 0.5, config.spread * 0.5);
  positions[i3 + 2] = MathUtils.randomFloat(-config.spread, config.spread);

  // Initial velocity based on effect type
  switch (config.type) {
    case 'explosion':
      const explosionAngle = Math.random() * Math.PI * 2;
      const explosionSpeed = MathUtils.randomFloat(config.speed * 0.5, config.speed * 1.5);
      velocities[i3] = Math.cos(explosionAngle) * explosionSpeed;
      velocities[i3 + 1] = MathUtils.randomFloat(config.speed * 0.5, config.speed);
      velocities[i3 + 2] = Math.sin(explosionAngle) * explosionSpeed;
      break;

    case 'fire':
      velocities[i3] = MathUtils.randomFloat(-1, 1);
      velocities[i3 + 1] = MathUtils.randomFloat(config.speed * 0.8, config.speed * 1.2);
      velocities[i3 + 2] = MathUtils.randomFloat(-1, 1);
      break;

    case 'smoke':
      velocities[i3] = MathUtils.randomFloat(-0.5, 0.5);
      velocities[i3 + 1] = MathUtils.randomFloat(config.speed * 0.3, config.speed * 0.7);
      velocities[i3 + 2] = MathUtils.randomFloat(-0.5, 0.5);
      break;

    case 'sparkle':
      const sparkleAngle = Math.random() * Math.PI * 2;
      const sparkleSpeed = MathUtils.randomFloat(config.speed * 0.3, config.speed * 0.8);
      velocities[i3] = Math.cos(sparkleAngle) * sparkleSpeed;
      velocities[i3 + 1] = MathUtils.randomFloat(-config.speed * 0.2, config.speed * 0.5);
      velocities[i3 + 2] = Math.sin(sparkleAngle) * sparkleSpeed;
      break;

    default:
      velocities[i3] = MathUtils.randomFloat(-config.speed, config.speed);
      velocities[i3 + 1] = MathUtils.randomFloat(-config.speed, config.speed);
      velocities[i3 + 2] = MathUtils.randomFloat(-config.speed, config.speed);
  }

  // Lifetime
  lifetimes[index] = (config.duration / 1000) * MathUtils.randomFloat(0.5, 1.5);

  // Initial size and opacity
  sizes[index] = config.size * MathUtils.randomFloat(0.5, 1.5);
  opacities[index] = config.opacity * MathUtils.randomFloat(0.7, 1.0);
}

function generateEnvironmentalEffects() {
  const effects = [];
  const particleCount = 100;

  for (let i = 0; i < particleCount; i++) {
    effects.push({
      type: 'dust',
      position: {
        x: MathUtils.randomFloat(-50, 50),
        y: MathUtils.randomFloat(0, 20),
        z: MathUtils.randomFloat(-50, 50)
      },
      velocity: {
        x: MathUtils.randomFloat(-0.1, 0.1),
        y: MathUtils.randomFloat(0.1, 0.3),
        z: MathUtils.randomFloat(-0.1, 0.1)
      },
      size: MathUtils.randomFloat(0.02, 0.08),
      color: 0xcccccc,
      opacity: MathUtils.randomFloat(0.1, 0.3),
      offset: Math.random() * Math.PI * 2
    });
  }

  return effects;
}

// ========================================
// 🎆 EFFECT PRESETS
// ========================================

export const EffectPresets = {
  explosion: (position, intensity = 1) => ({
    type: 'explosion',
    position,
    count: Math.floor(50 * intensity),
    duration: 2000,
    spread: 3 * intensity,
    speed: 8 * intensity,
    gravity: -9.8,
    color: 0xff6600,
    size: 0.15 * intensity,
    blending: THREE.AdditiveBlending
  }),

  fire: (position, intensity = 1) => ({
    type: 'fire',
    position,
    count: Math.floor(30 * intensity),
    duration: 3000,
    spread: 1 * intensity,
    speed: 4 * intensity,
    gravity: -2,
    color: 0xff4400,
    size: 0.1 * intensity,
    blending: THREE.AdditiveBlending
  }),

  smoke: (position, intensity = 1) => ({
    type: 'smoke',
    position,
    count: Math.floor(20 * intensity),
    duration: 5000,
    spread: 2 * intensity,
    speed: 2 * intensity,
    gravity: -1,
    color: 0x666666,
    size: 0.2 * intensity,
    opacity: 0.6,
    blending: THREE.NormalBlending
  }),

  sparkle: (position, intensity = 1) => ({
    type: 'sparkle',
    position,
    count: Math.floor(40 * intensity),
    duration: 1500,
    spread: 2 * intensity,
    speed: 3 * intensity,
    gravity: -3,
    color: 0xffff00,
    size: 0.08 * intensity,
    blending: THREE.AdditiveBlending
  }),

  energy: (position, intensity = 1) => ({
    type: 'energy',
    position,
    count: Math.floor(60 * intensity),
    duration: 2500,
    spread: 1.5 * intensity,
    speed: 5 * intensity,
    gravity: 0,
    color: 0x00ffff,
    size: 0.12 * intensity,
    blending: THREE.AdditiveBlending
  }),

  heal: (position, intensity = 1) => ({
    type: 'sparkle',
    position,
    count: Math.floor(25 * intensity),
    duration: 2000,
    spread: 1.5 * intensity,
    speed: 2 * intensity,
    gravity: -1,
    color: 0x00ff88,
    size: 0.1 * intensity,
    blending: THREE.AdditiveBlending
  }),

  powerUp: (position, intensity = 1) => ({
    type: 'energy',
    position,
    count: Math.floor(35 * intensity),
    duration: 3000,
    spread: 2 * intensity,
    speed: 4 * intensity,
    gravity: -0.5,
    color: 0xff00ff,
    size: 0.15 * intensity,
    blending: THREE.AdditiveBlending
  }),

  death: (position, intensity = 1) => ({
    type: 'explosion',
    position,
    count: Math.floor(40 * intensity),
    duration: 1800,
    spread: 2.5 * intensity,
    speed: 6 * intensity,
    gravity: -8,
    color: 0x880000,
    size: 0.12 * intensity,
    blending: THREE.AdditiveBlending
  })
};

// ========================================
// 🎮 HOOK PARA EFECTOS DE PARTÍCULAS
// ========================================

export function useParticleEffects() {
  const [effects, setEffects] = useState([]);

  const addEffect = useCallback((effectData) => {
    const newEffect = {
      id: Date.now() + Math.random(),
      ...effectData,
      startTime: Date.now()
    };
    setEffects(prev => [...prev, newEffect]);

    // Auto-remove after duration
    setTimeout(() => {
      setEffects(prev => prev.filter(effect => effect.id !== newEffect.id));
    }, effectData.duration || 2000);
  }, []);

  const removeEffect = useCallback((effectId) => {
    setEffects(prev => prev.filter(effect => effect.id !== effectId));
  }, []);

  const clearAllEffects = useCallback(() => {
    setEffects([]);
  }, []);

  // Preset helpers
  const createExplosion = useCallback((position, intensity) => {
    addEffect(EffectPresets.explosion(position, intensity));
  }, [addEffect]);

  const createFire = useCallback((position, intensity) => {
    addEffect(EffectPresets.fire(position, intensity));
  }, [addEffect]);

  const createSmoke = useCallback((position, intensity) => {
    addEffect(EffectPresets.smoke(position, intensity));
  }, [addEffect]);

  const createSparkle = useCallback((position, intensity) => {
    addEffect(EffectPresets.sparkle(position, intensity));
  }, [addEffect]);

  const createHeal = useCallback((position, intensity) => {
    addEffect(EffectPresets.heal(position, intensity));
  }, [addEffect]);

  return {
    effects,
    addEffect,
    removeEffect,
    clearAllEffects,
    // Preset creators
    createExplosion,
    createFire,
    createSmoke,
    createSparkle,
    createHeal
  };
}

export default ParticleEffects;
