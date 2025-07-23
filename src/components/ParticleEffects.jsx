/* ============================================================================ */
/* 🎮 CRASH WORM 3D - SISTEMA DE EFECTOS DE PARTÍCULAS */
/* ============================================================================ */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/context/GameContext';
import { gameConfig } from '@/data/gameConfig';
import { MathUtils } from '@/utils/gameUtils';

// ========================================
// ✨ MANAGER DE EFECTOS DE PARTÍCULAS
// ========================================

export function ParticleEffectsManager() {
  const { state, utils } = useGame();
  const [activeEffects, setActiveEffects] = useState([]);
  const effectIdCounter = useRef(0);

  const createEffect = useCallback((type, options = {}) => {
    const newEffect = {
      id: effectIdCounter.current++,
      type,
      ...options,
      createdAt: Date.now(),
      active: true
    };

    setActiveEffects(prev => [...prev, newEffect]);

    return newEffect.id;
  }, []);

  const removeEffect = useCallback((effectId) => {
    setActiveEffects(prev => prev.filter(effect => effect.id !== effectId));
  }, []);

  // API para crear efectos comunes
  const effects = useMemo(() => ({
    explosion: (position, options = {}) => createEffect('explosion', { position, ...options }),
    trail: (position, options = {}) => createEffect('trail', { position, ...options }),
    collect: (position, options = {}) => createEffect('collect', { position, ...options }),
    jump: (position, options = {}) => createEffect('jump', { position, ...options }),
    damage: (position, options = {}) => createEffect('damage', { position, ...options }),
    heal: (position, options = {}) => createEffect('heal', { position, ...options }),
    powerup: (position, options = {}) => createEffect('powerup', { position, ...options }),
    environment: (position, options = {}) => createEffect('environment', { position, ...options })
  }), [createEffect]);

  // Exponer API globalmente
  useEffect(() => {
    window.gameEffects = effects;
    return () => {
      delete window.gameEffects;
    };
  }, [effects]);

  return (
    <group>
      {activeEffects.map(effect => (
        <ParticleEffect
          key={effect.id}
          {...effect}
          onComplete={() => removeEffect(effect.id)}
        />
      ))}
    </group>
  );
}

// ========================================
// 🌟 COMPONENTE BASE DE EFECTO DE PARTÍCULAS
// ========================================

function ParticleEffect({ id, type, position = [0, 0, 0], onComplete, ...options }) {
  const groupRef = useRef();
  const particlesRef = useRef();
  const [isComplete, setIsComplete] = useState(false);

  const effectConfig = getEffectConfig(type, options);
  const particles = useRef(createParticles(effectConfig));

  // ========================================
  // 🎯 CONFIGURACIONES DE EFECTOS
  // ========================================

  function getEffectConfig(effectType, opts) {
    const baseConfigs = {
      explosion: {
        particleCount: 30,
        duration: 2.0,
        spread: 5,
        speed: { min: 2, max: 8 },
        size: { min: 0.05, max: 0.2 },
        colors: ['#ff4444', '#ff8844', '#ffcc44'],
        gravity: -9.81,
        friction: 0.98,
        fadeOut: true,
        ...opts
      },
      trail: {
        particleCount: 15,
        duration: 1.0,
        spread: 1,
        speed: { min: 0.5, max: 2 },
        size: { min: 0.02, max: 0.08 },
        colors: ['#4488ff', '#88ccff'],
        gravity: 0,
        friction: 0.95,
        fadeOut: true,
        ...opts
      },
      collect: {
        particleCount: 20,
        duration: 1.5,
        spread: 2,
        speed: { min: 1, max: 4 },
        size: { min: 0.03, max: 0.1 },
        colors: ['#ffff44', '#ffcc44', '#ff8844'],
        gravity: -2,
        friction: 0.96,
        fadeOut: true,
        ...opts
      },
      jump: {
        particleCount: 12,
        duration: 0.8,
        spread: 1.5,
        speed: { min: 1, max: 3 },
        size: { min: 0.02, max: 0.06 },
        colors: ['#ffffff', '#cccccc'],
        gravity: -5,
        friction: 0.94,
        fadeOut: true,
        ...opts
      },
      damage: {
        particleCount: 25,
        duration: 1.2,
        spread: 3,
        speed: { min: 2, max: 6 },
        size: { min: 0.04, max: 0.12 },
        colors: ['#ff0000', '#ff4444', '#ff8888'],
        gravity: -3,
        friction: 0.97,
        fadeOut: true,
        ...opts
      },
      heal: {
        particleCount: 18,
        duration: 2.0,
        spread: 2,
        speed: { min: 0.5, max: 2 },
        size: { min: 0.03, max: 0.09 },
        colors: ['#44ff44', '#88ff88', '#ccffcc'],
        gravity: 2, // Hacia arriba
        friction: 0.96,
        fadeOut: true,
        ...opts
      },
      powerup: {
        particleCount: 35,
        duration: 3.0,
        spread: 4,
        speed: { min: 1, max: 5 },
        size: { min: 0.05, max: 0.15 },
        colors: ['#ff00ff', '#ff44ff', '#ff88ff'],
        gravity: 0,
        friction: 0.98,
        fadeOut: true,
        spiral: true,
        ...opts
      },
      environment: {
        particleCount: 10,
        duration: 5.0,
        spread: 2,
        speed: { min: 0.2, max: 1 },
        size: { min: 0.01, max: 0.05 },
        colors: ['#888888', '#aaaaaa', '#cccccc'],
        gravity: -1,
        friction: 0.99,
        fadeOut: true,
        continuous: true,
        ...opts
      }
    };

    return baseConfigs[effectType] || baseConfigs.explosion;
  }

  function createParticles(config) {
    const particleArray = [];

    for (let i = 0; i < config.particleCount; i++) {
      const particle = {
        id: i,
        position: {
          x: position[0] + (Math.random() - 0.5) * config.spread * 0.1,
          y: position[1] + (Math.random() - 0.5) * config.spread * 0.1,
          z: position[2] + (Math.random() - 0.5) * config.spread * 0.1
        },
        velocity: {
          x: (Math.random() - 0.5) * config.spread,
          y: Math.random() * config.speed.max,
          z: (Math.random() - 0.5) * config.spread
        },
        size: MathUtils.random(config.size.min, config.size.max),
        life: 1.0,
        maxLife: MathUtils.random(config.duration * 0.5, config.duration),
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        opacity: 1.0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 4,
        // Propiedades especiales
        spiralAngle: config.spiral ? i * (Math.PI * 2 / config.particleCount) : 0,
        spiralRadius: config.spiral ? MathUtils.random(1, 3) : 0
      };

      // Ajustar velocidad inicial
      const speed = MathUtils.random(config.speed.min, config.speed.max);
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;

      particle.velocity.x = Math.cos(angle) * Math.cos(elevation) * speed;
      particle.velocity.y = Math.sin(elevation) * speed;
      particle.velocity.z = Math.sin(angle) * Math.cos(elevation) * speed;

      particleArray.push(particle);
    }

    return particleArray;
  }

  // ========================================
  // 🔄 ACTUALIZACIÓN DE PARTÍCULAS
  // ========================================

  const updateParticles = useCallback((deltaTime) => {
    const config = effectConfig;
    let allParticlesDead = true;

    particles.current.forEach(particle => {
      if (particle.life <= 0) {
        if (config.continuous) {
          // Reiniciar partícula para efectos continuos
          resetParticle(particle, config);
        } else {
          return;
        }
      }

      allParticlesDead = false;

      // Actualizar física
      particle.velocity.y += config.gravity * deltaTime;

      // Aplicar fricción
      particle.velocity.x *= config.friction;
      particle.velocity.y *= config.friction;
      particle.velocity.z *= config.friction;

      // Efectos especiales
      if (config.spiral) {
        particle.spiralAngle += deltaTime * 2;
        particle.position.x += Math.cos(particle.spiralAngle) * particle.spiralRadius * deltaTime;
        particle.position.z += Math.sin(particle.spiralAngle) * particle.spiralRadius * deltaTime;
      }

      // Actualizar posición
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;

      // Actualizar rotación
      particle.rotation += particle.rotationSpeed * deltaTime;

      // Actualizar vida
      particle.life -= deltaTime / particle.maxLife;

      // Actualizar opacidad
      if (config.fadeOut) {
        particle.opacity = MathUtils.clamp(particle.life, 0, 1);
      }

      // Actualizar tamaño (puede decrecer con el tiempo)
      if (config.shrink) {
        particle.currentSize = particle.size * particle.life;
      } else {
        particle.currentSize = particle.size;
      }
    });

    // Verificar si el efecto debe terminar
    if (allParticlesDead && !config.continuous) {
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  }, [effectConfig, onComplete]);

  const resetParticle = useCallback((particle, config) => {
    // Reiniciar partícula para efectos continuos
    particle.position = {
      x: position[0] + (Math.random() - 0.5) * config.spread * 0.1,
      y: position[1] + (Math.random() - 0.5) * config.spread * 0.1,
      z: position[2] + (Math.random() - 0.5) * config.spread * 0.1
    };

    const speed = MathUtils.random(config.speed.min, config.speed.max);
    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI;

    particle.velocity = {
      x: Math.cos(angle) * Math.cos(elevation) * speed,
      y: Math.sin(elevation) * speed,
      z: Math.sin(angle) * Math.cos(elevation) * speed
    };

    particle.life = 1.0;
    particle.opacity = 1.0;
    particle.rotation = Math.random() * Math.PI * 2;
  }, [position]);

  // ========================================
  // 🎨 RENDERIZADO OPTIMIZADO
  // ========================================

  const particleGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const particleMaterial = useMemo(() => new THREE.PointsMaterial({
    size: 0.1,
    transparent: true,
    alphaTest: 0.1,
    vertexColors: true
  }), []);

  const updateGeometry = useCallback(() => {
    const positions = [];
    const colors = [];
    const sizes = [];

    particles.current.forEach(particle => {
      if (particle.life > 0) {
        positions.push(particle.position.x, particle.position.y, particle.position.z);

        // Convertir color hex a RGB
        const color = new THREE.Color(particle.color);
        colors.push(color.r, color.g, color.b);

        sizes.push(particle.currentSize || particle.size);
      }
    });

    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  }, [particleGeometry]);

  // ========================================
  // 🔄 GAME LOOP
  // ========================================

  useFrame((_, deltaTime) => {
    if (isComplete) return;

    updateParticles(deltaTime);
    updateGeometry();
  });

  // ========================================
  // 🎨 RENDER
  // ========================================

  if (isComplete) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Renderizado con instancias para mejor rendimiento */}
      <points geometry={particleGeometry} material={particleMaterial} />

      {/* Renderizado alternativo con meshes individuales para efectos especiales */}
      {effectConfig.useIndividualMeshes && particles.current.map(particle => (
        particle.life > 0 && (
          <mesh
            key={particle.id}
            position={[particle.position.x, particle.position.y, particle.position.z]}
            rotation={[0, 0, particle.rotation]}
            scale={[particle.currentSize, particle.currentSize, particle.currentSize]}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              color={particle.color}
              transparent
              opacity={particle.opacity}
            />
          </mesh>
        )
      ))}

      {/* Efectos adicionales específicos del tipo */}
      {type === 'powerup' && <PowerupEffect />}
      {type === 'explosion' && <ExplosionEffect />}
      {type === 'heal' && <HealEffect />}
    </group>
  );
}

// ========================================
// 🌟 EFECTOS ESPECIALES ADICIONALES
// ========================================

function PowerupEffect() {
  const ringRef = useRef();

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 2;
      ringRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.2);
    }
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[2, 0.1, 16, 32]} />
      <meshBasicMaterial
        color="#ff00ff"
        transparent
        opacity={0.5}
      />
    </mesh>
  );
}

function ExplosionEffect() {
  const waveRef = useRef();

  useFrame((state) => {
    if (waveRef.current) {
      const scale = state.clock.elapsedTime * 3;
      const opacity = Math.max(0, 1 - state.clock.elapsedTime * 0.5);

      waveRef.current.scale.setScalar(scale);
      waveRef.current.material.opacity = opacity;
    }
  });

  return (
    <mesh ref={waveRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color="#ff4444"
        transparent
        opacity={0.3}
        wireframe
      />
    </mesh>
  );
}

function HealEffect() {
  const spiralRef = useRef();

  useFrame((state) => {
    if (spiralRef.current) {
      spiralRef.current.rotation.y = state.clock.elapsedTime * 2;
      spiralRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }
  });

  return (
    <group ref={spiralRef}>
      {[...Array(6)].map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(i * Math.PI / 3) * 1.5,
            i * 0.2,
            Math.sin(i * Math.PI / 3) * 1.5
          ]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial
            color="#44ff44"
            emissive="#004400"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

// ========================================
// 🎯 EFECTOS PREDEFINIDOS
// ========================================

export function createExplosion(position, options = {}) {
  if (window.gameEffects) {
    return window.gameEffects.explosion(position, options);
  }
}

export function createTrail(position, options = {}) {
  if (window.gameEffects) {
    return window.gameEffects.trail(position, options);
  }
}

export function createCollectEffect(position, options = {}) {
  if (window.gameEffects) {
    return window.gameEffects.collect(position, options);
  }
}

export function createJumpEffect(position, options = {}) {
  if (window.gameEffects) {
    return window.gameEffects.jump(position, options);
  }
}

export function createDamageEffect(position, options = {}) {
  if (window.gameEffects) {
    return window.gameEffects.damage(position, options);
  }
}

export function createHealEffect(position, options = {}) {
  if (window.gameEffects) {
    return window.gameEffects.heal(position, options);
  }
}

export function createPowerupEffect(position, options = {}) {
  if (window.gameEffects) {
    return window.gameEffects.powerup(position, options);
  }
}

export default ParticleEffectsManager;
