// ========================================
// UTILIDADES DEL JUEGO COMPLETAS
// Matemáticas, Física, Procedural, Gameplay
// Ubicación: src/utils/gameUtils.js
// ========================================

import * as THREE from 'three';
import * as math from 'mathjs';

// ========================================
// UTILIDADES MATEMÁTICAS
// ========================================

export const lerp = (start, end, factor) => {
  return start + (end - start) * factor;
};

export const smoothLerp = (start, end, factor) => {
  const smoothFactor = factor * factor * (3 - 2 * factor);
  return lerp(start, end, smoothFactor);
};

export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

export const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
};

export const distance3D = (pos1, pos2) => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const normalize3D = (vector) => {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
};

export const dotProduct3D = (v1, v2) => {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

export const crossProduct3D = (v1, v2) => {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };
};

// ========================================
// UTILIDADES DE FÍSICA
// ========================================

export const calculateJumpVelocity = (height, gravity = -9.81) => {
  return Math.sqrt(-2 * gravity * height);
};

export const calculateProjectileTrajectory = (initialVelocity, angle, gravity = 9.81) => {
  const radians = (angle * Math.PI) / 180;
  const vx = initialVelocity * Math.cos(radians);
  const vy = initialVelocity * Math.sin(radians);
  
  return {
    range: (vx * vy * 2) / gravity,
    maxHeight: (vy * vy) / (2 * gravity),
    timeOfFlight: (2 * vy) / gravity,
    velocityComponents: { vx, vy }
  };
};

export const sphereCollision = (sphere1, sphere2) => {
  const distance = distance3D(sphere1.position, sphere2.position);
  const minDistance = sphere1.radius + sphere2.radius;
  return distance < minDistance;
};

export const sphereBoxCollision = (sphere, box) => {
  const closestPoint = {
    x: clamp(sphere.position.x, box.min.x, box.max.x),
    y: clamp(sphere.position.y, box.min.y, box.max.y),
    z: clamp(sphere.position.z, box.min.z, box.max.z)
  };
  
  const distance = distance3D(sphere.position, closestPoint);
  return distance < sphere.radius;
};

export const applyFriction = (velocity, frictionCoefficient, deltaTime) => {
  const friction = frictionCoefficient * deltaTime;
  return {
    x: velocity.x * (1 - friction),
    y: velocity.y,
    z: velocity.z * (1 - friction)
  };
};

export const elasticCollision = (obj1, obj2) => {
  const totalMass = obj1.mass + obj2.mass;
  const newVel1 = {
    x: ((obj1.mass - obj2.mass) * obj1.velocity.x + 2 * obj2.mass * obj2.velocity.x) / totalMass,
    y: obj1.velocity.y,
    z: ((obj1.mass - obj2.mass) * obj1.velocity.z + 2 * obj2.mass * obj2.velocity.z) / totalMass
  };
  
  const newVel2 = {
    x: ((obj2.mass - obj1.mass) * obj2.velocity.x + 2 * obj1.mass * obj1.velocity.x) / totalMass,
    y: obj2.velocity.y,
    z: ((obj2.mass - obj1.mass) * obj2.velocity.z + 2 * obj1.mass * obj1.velocity.z) / totalMass
  };
  
  return { velocity1: newVel1, velocity2: newVel2 };
};

// ========================================
// UTILIDADES PROCEDURALES
// ========================================

export const simpleNoise = (x, y, z = 0) => {
  const a = 12.9898;
  const b = 78.233;
  const c = 43758.5453;
  const dt = (x * a) + (y * b) + (z * a);
  return ((Math.sin(dt) * c) % 1 + 1) % 1;
};

export const generateTerrainHeight = (x, z, frequency = 0.1, amplitude = 10) => {
  const noise1 = simpleNoise(x * frequency, z * frequency) * amplitude;
  const noise2 = simpleNoise(x * frequency * 2, z * frequency * 2) * amplitude * 0.5;
  return noise1 + noise2;
};

export const randomPositionInSphere = (radius = 1) => {
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);
  const r = Math.cbrt(Math.random()) * radius;
  
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi)
  };
};

export const generateSpiral = (turns, pointsPerTurn, radius) => {
  const points = [];
  const totalPoints = turns * pointsPerTurn;
  
  for (let i = 0; i < totalPoints; i++) {
    const angle = (i / pointsPerTurn) * 2 * Math.PI;
    const height = (i / totalPoints) * turns * 4;
    const currentRadius = radius * (1 - i / totalPoints);
    
    points.push({
      x: Math.cos(angle) * currentRadius,
      y: height,
      z: Math.sin(angle) * currentRadius
    });
  }
  
  return points;
};

// ========================================
// UTILIDADES DE COLOR
// ========================================

export const hslToRgb = (h, s, l) => {
  h /= 360;
  s /= 100;
  l /= 100;
  
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

export const valueToColor = (value, min = 0, max = 1) => {
  const normalized = clamp((value - min) / (max - min), 0, 1);
  const hue = (1 - normalized) * 120; // De rojo (0) a verde (120)
  return hslToRgb(hue, 100, 50);
};

export const lerpColor = (color1, color2, factor) => {
  return {
    r: lerp(color1.r, color2.r, factor),
    g: lerp(color1.g, color2.g, factor),
    b: lerp(color1.b, color2.b, factor)
  };
};

export const generateColorPalette = (baseHue, count = 5) => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (i * 360 / count)) % 360;
    colors.push(hslToRgb(hue, 70, 50));
  }
  return colors;
};

// ========================================
// UTILIDADES DE GAMEPLAY
// ========================================

export const calculateScore = (baseScore, multiplier, timeBonus = 0) => {
  return Math.floor(baseScore * multiplier + timeBonus);
};

export const calculateExperience = (level, baseXP = 100) => {
  return Math.floor(baseXP * Math.pow(1.5, level - 1));
};

export const calculateDropRarity = (luck = 0) => {
  const random = Math.random() + (luck * 0.1);
  if (random > 0.95) return 'legendary';
  if (random > 0.8) return 'epic';
  if (random > 0.6) return 'rare';
  if (random > 0.3) return 'uncommon';
  return 'common';
};

export const generateEnemyPattern = (type, level) => {
  const patterns = {
    basic: {
      speed: 1 + level * 0.1,
      health: 10 + level * 2,
      damage: 5 + level,
      ai: 'simple'
    },
    flying: {
      speed: 1.5 + level * 0.15,
      health: 8 + level * 1.5,
      damage: 4 + level,
      ai: 'flying'
    },
    heavy: {
      speed: 0.7 + level * 0.05,
      health: 20 + level * 4,
      damage: 10 + level * 2,
      ai: 'aggressive'
    }
  };
  
  return patterns[type] || patterns.basic;
};

// ========================================
// UTILIDADES DE RENDIMIENTO
// ========================================

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

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.used = new Set();
    
    // Crear objetos iniciales
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }
  
  get() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.createFn();
    }
    this.used.add(obj);
    return obj;
  }
  
  release(obj) {
    if (this.used.has(obj)) {
      this.used.delete(obj);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
  
  clear() {
    this.pool.length = 0;
    this.used.clear();
  }
}

// ========================================
// UTILIDADES DE FORMATO
// ========================================

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatPercentage = (value, total) => {
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
};

// ========================================
// UTILIDADES DE VALIDACIÓN
// ========================================

export const isValidPosition3D = (position) => {
  return position && 
    typeof position.x === 'number' && !isNaN(position.x) &&
    typeof position.y === 'number' && !isNaN(position.y) &&
    typeof position.z === 'number' && !isNaN(position.z);
};

export const validateGameConfig = (config) => {
  const required = ['player', 'world', 'physics', 'graphics'];
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