import * as THREE from 'three';
import * as math from 'mathjs';
import _ from 'lodash';

// ========================================
// UTILIDADES MATEMÁTICAS 3D
// ========================================

/**
 * Interpola linealmente entre dos valores
 */
export const lerp = (start, end, factor) => {
  return start + (end - start) * factor;
};

/**
 * Interpola suavemente entre dos valores con easing
 */
export const smoothLerp = (start, end, factor, easing = 'easeInOut') => {
  const easingFunctions = {
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1
  };
  
  const easedFactor = easingFunctions[easing] ? easingFunctions[easing](factor) : factor;
  return lerp(start, end, easedFactor);
};

/**
 * Clamp un valor entre min y max
 */
export const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Mapea un valor de un rango a otro
 */
export const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

/**
 * Calcula la distancia entre dos puntos 3D
 */
export const distance3D = (point1, point2) => {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  const dz = point2[2] - point1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Normaliza un vector 3D
 */
export const normalize3D = (vector) => {
  const magnitude = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
  if (magnitude === 0) return [0, 0, 0];
  return [vector[0] / magnitude, vector[1] / magnitude, vector[2] / magnitude];
};

/**
 * Producto punto entre dos vectores 3D
 */
export const dotProduct3D = (a, b) => {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
 * Producto cruz entre dos vectores 3D
 */
export const crossProduct3D = (a, b) => {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
};

// ========================================
// UTILIDADES DE FÍSICA
// ========================================

/**
 * Calcula la velocidad necesaria para un salto parabólico
 */
export const calculateJumpVelocity = (height, gravity = 9.81) => {
  return Math.sqrt(2 * gravity * height);
};

/**
 * Calcula la trayectoria de un proyectil
 */
export const calculateProjectileTrajectory = (initialVelocity, angle, gravity = 9.81, time) => {
  const vx = initialVelocity * Math.cos(angle);
  const vy = initialVelocity * Math.sin(angle);
  
  const x = vx * time;
  const y = vy * time - 0.5 * gravity * time * time;
  
  return { x, y };
};

/**
 * Detecta colisión entre dos esferas
 */
export const sphereCollision = (sphere1, sphere2) => {
  const distance = distance3D(sphere1.position, sphere2.position);
  return distance <= (sphere1.radius + sphere2.radius);
};

/**
 * Detecta colisión entre esfera y caja (AABB)
 */
export const sphereBoxCollision = (sphere, box) => {
  const { position, radius } = sphere;
  const { min, max } = box;
  
  const x = Math.max(min[0], Math.min(position[0], max[0]));
  const y = Math.max(min[1], Math.min(position[1], max[1]));
  const z = Math.max(min[2], Math.min(position[2], max[2]));
  
  const distance = distance3D(position, [x, y, z]);
  return distance <= radius;
};

/**
 * Aplica fricción a una velocidad
 */
export const applyFriction = (velocity, friction) => {
  return velocity.map(v => v * (1 - friction));
};

/**
 * Rebote elástico entre dos objetos
 */
export const elasticCollision = (obj1, obj2, restitution = 0.8) => {
  const direction = normalize3D([
    obj2.position[0] - obj1.position[0],
    obj2.position[1] - obj1.position[1],
    obj2.position[2] - obj1.position[2]
  ]);
  
  const relativeVelocity = [
    obj1.velocity[0] - obj2.velocity[0],
    obj1.velocity[1] - obj2.velocity[1],
    obj1.velocity[2] - obj2.velocity[2]
  ];
  
  const speed = dotProduct3D(relativeVelocity, direction);
  
  if (speed < 0) return; // Los objetos se están separando
  
  const impulse = 2 * speed / (obj1.mass + obj2.mass) * restitution;
  
  obj1.velocity[0] -= impulse * obj2.mass * direction[0];
  obj1.velocity[1] -= impulse * obj2.mass * direction[1];
  obj1.velocity[2] -= impulse * obj2.mass * direction[2];
  
  obj2.velocity[0] += impulse * obj1.mass * direction[0];
  obj2.velocity[1] += impulse * obj1.mass * direction[1];
  obj2.velocity[2] += impulse * obj1.mass * direction[2];
};

// ========================================
// UTILIDADES DE GENERACIÓN PROCEDURAL
// ========================================

/**
 * Ruido Perlin simplificado para generación de terreno
 */
export const simpleNoise = (x, y, scale = 1, octaves = 1) => {
  let value = 0;
  let amplitude = 1;
  let frequency = scale;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += Math.sin(x * frequency) * Math.cos(y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value / maxValue;
};

/**
 * Genera una altura de terreno basada en coordenadas
 */
export const generateTerrainHeight = (x, z, config = {}) => {
  const {
    scale = 0.01,
    amplitude = 10,
    octaves = 3,
    persistence = 0.5,
    lacunarity = 2
  } = config;
  
  let height = 0;
  let currentAmplitude = amplitude;
  let currentFrequency = scale;
  
  for (let i = 0; i < octaves; i++) {
    height += simpleNoise(x * currentFrequency, z * currentFrequency) * currentAmplitude;
    currentAmplitude *= persistence;
    currentFrequency *= lacunarity;
  }
  
  return height;
};

/**
 * Genera posiciones aleatorias en una esfera
 */
export const randomPositionInSphere = (radius) => {
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = Math.cbrt(Math.random()) * radius;
  
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  
  return [
    r * sinPhi * cosTheta,
    r * sinPhi * sinTheta,
    r * cosPhi
  ];
};

/**
 * Genera una espiral 3D
 */
export const generateSpiral = (turns, pointsPerTurn, radius, height) => {
  const points = [];
  const totalPoints = turns * pointsPerTurn;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const angle = t * turns * 2 * Math.PI;
    const currentRadius = radius * (1 - t * 0.3); // Espiral que se contrae
    
    points.push([
      Math.cos(angle) * currentRadius,
      t * height,
      Math.sin(angle) * currentRadius
    ]);
  }
  
  return points;
};

// ========================================
// UTILIDADES DE COLORES Y VISUAL
// ========================================

/**
 * Convierte HSL a RGB
 */
export const hslToRgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r, g, b;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
};

/**
 * Genera un color basado en un valor
 */
export const valueToColor = (value, min = 0, max = 1) => {
  const normalizedValue = (value - min) / (max - min);
  const hue = (1 - normalizedValue) * 240; // De azul (240°) a rojo (0°)
  return `hsl(${hue}, 100%, 50%)`;
};

/**
 * Interpola entre dos colores
 */
export const lerpColor = (color1, color2, factor) => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, factor);
};

/**
 * Genera una paleta de colores armónica
 */
export const generateColorPalette = (baseHue, count = 5) => {
  const colors = [];
  const goldenAngle = 137.508; // Ángulo dorado para distribución natural
  
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + i * goldenAngle) % 360;
    const saturation = 70 + Math.random() * 30; // 70-100%
    const lightness = 45 + Math.random() * 20;  // 45-65%
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  
  return colors;
};

// ========================================
// UTILIDADES DE GAMEPLAY
// ========================================

/**
 * Calcula la puntuación basada en varios factores
 */
export const calculateScore = (basePoints, multipliers = {}) => {
  const {
    timeBonus = 1,
    comboMultiplier = 1,
    difficultyMultiplier = 1,
    perfectBonus = 1
  } = multipliers;
  
  return Math.floor(
    basePoints * 
    timeBonus * 
    comboMultiplier * 
    difficultyMultiplier * 
    perfectBonus
  );
};

/**
 * Calcula la experiencia ganada
 */
export const calculateExperience = (action, playerLevel, difficulty = 1) => {
  const baseExp = {
    enemy_defeat: 50,
    gem_collect: 10,
    level_complete: 200,
    secret_found: 75,
    perfect_jump: 5
  };
  
  const base = baseExp[action] || 0;
  const levelMultiplier = 1 + (playerLevel - 1) * 0.1;
  const difficultyMultiplier = difficulty;
  
  return Math.floor(base * levelMultiplier * difficultyMultiplier);
};

/**
 * Sistema de rareza para drops
 */
export const calculateDropRarity = (baseChance, playerLuck = 0, difficultyBonus = 0) => {
  const finalChance = baseChance + playerLuck + difficultyBonus;
  const roll = Math.random();
  
  if (roll < finalChance * 0.01) return 'legendary';
  if (roll < finalChance * 0.05) return 'epic';
  if (roll < finalChance * 0.15) return 'rare';
  if (roll < finalChance * 0.4) return 'uncommon';
  return 'common';
};

/**
 * Genera un patrón de enemigo
 */
export const generateEnemyPattern = (type, difficulty) => {
  const patterns = {
    basic: {
      speed: 1 + difficulty * 0.2,
      health: 50 + difficulty * 10,
      damage: 10 + difficulty * 2,
      behavior: 'chase'
    },
    flying: {
      speed: 1.5 + difficulty * 0.3,
      health: 30 + difficulty * 8,
      damage: 8 + difficulty * 1.5,
      behavior: 'aerial_patrol'
    },
    boss: {
      speed: 0.8 + difficulty * 0.1,
      health: 200 + difficulty * 50,
      damage: 25 + difficulty * 5,
      behavior: 'complex_attack_pattern'
    }
  };
  
  return patterns[type] || patterns.basic;
};

// ========================================
// UTILIDADES DE PERFORMANCE
// ========================================

/**
 * Debounce para funciones costosas
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle para funciones que se ejecutan frecuentemente
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Pool de objetos para reutilización
 */
export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    
    // Llenar pool inicial
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }
  
  get() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return this.createFn();
  }
  
  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }
  
  size() {
    return this.pool.length;
  }
}

// ========================================
// UTILIDADES DE FORMATO
// ========================================

/**
 * Formatea tiempo en MM:SS
 */
export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Formatea números grandes con sufijos
 */
export const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

/**
 * Formatea porcentajes
 */
export const formatPercentage = (value, decimals = 1) => {
  return (value * 100).toFixed(decimals) + '%';
};

// ========================================
// UTILIDADES DE VALIDACIÓN
// ========================================

/**
 * Valida que un objeto es una posición 3D válida
 */
export const isValidPosition3D = (position) => {
  return Array.isArray(position) && 
         position.length === 3 && 
         position.every(coord => typeof coord === 'number' && !isNaN(coord));
};

/**
 * Valida configuración de juego
 */
export const validateGameConfig = (config) => {
  const required = ['playerSpeed', 'jumpForce', 'gravity'];
  const missing = required.filter(key => !(key in config));
  
  if (missing.length > 0) {
    throw new Error(`Missing required config keys: ${missing.join(', ')}`);
  }
  
  return true;
};

// ========================================
// EXPORTAR UTILIDADES ORGANIZADAS
// ========================================

export const MathUtils = {
  lerp,
  smoothLerp,
  clamp,
  mapRange,
  distance3D,
  normalize3D,
  dotProduct3D,
  crossProduct3D
};

export const PhysicsUtils = {
  calculateJumpVelocity,
  calculateProjectileTrajectory,
  sphereCollision,
  sphereBoxCollision,
  applyFriction,
  elasticCollision
};

export const ProceduralUtils = {
  simpleNoise,
  generateTerrainHeight,
  randomPositionInSphere,
  generateSpiral
};

export const ColorUtils = {
  hslToRgb,
  valueToColor,
  lerpColor,
  generateColorPalette
};

export const GameplayUtils = {
  calculateScore,
  calculateExperience,
  calculateDropRarity,
  generateEnemyPattern
};

export const PerformanceUtils = {
  debounce,
  throttle,
  ObjectPool
};

export const FormatUtils = {
  formatTime,
  formatNumber,
  formatPercentage
};

export const ValidationUtils = {
  isValidPosition3D,
  validateGameConfig
};

// Exportación por defecto con todas las utilidades
export default {
  MathUtils,
  PhysicsUtils,
  ProceduralUtils,
  ColorUtils,
  GameplayUtils,
  PerformanceUtils,
  FormatUtils,
  ValidationUtils
};