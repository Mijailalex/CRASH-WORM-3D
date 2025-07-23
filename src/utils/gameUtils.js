/* ============================================================================ */
/* 🎮 CRASH WORM 3D - UTILIDADES DEL JUEGO */
/* ============================================================================ */
/* Ubicación: src/utils/gameUtils.js */

import * as THREE from 'three';
import { gameConfig } from '../data/gameConfig';

// ========================================
// 🧮 UTILIDADES MATEMÁTICAS
// ========================================

export const MathUtils = {
  // Clamp value between min and max
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

  // Linear interpolation
  lerp: (a, b, t) => a + (b - a) * t,

  // Smooth interpolation
  smoothstep: (min, max, value) => {
    const t = MathUtils.clamp((value - min) / (max - min), 0, 1);
    return t * t * (3 - 2 * t);
  },

  // Distance between two points
  distance: (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  // Distance squared (faster for comparison)
  distanceSquared: (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z || 0) - (b.z || 0);
    return dx * dx + dy * dy + dz * dz;
  },

  // Random float between min and max
  randomFloat: (min, max) => Math.random() * (max - min) + min,

  // Random integer between min and max (inclusive)
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

  // Random element from array
  randomElement: (array) => array[Math.floor(Math.random() * array.length)],

  // Map value from one range to another
  map: (value, inMin, inMax, outMin, outMax) => {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  },

  // Angle between two points
  angleTo: (from, to) => Math.atan2(to.y - from.y, to.x - from.x),

  // Normalize angle to -PI to PI
  normalizeAngle: (angle) => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  },

  // Degrees to radians
  toRadians: (degrees) => degrees * (Math.PI / 180),

  // Radians to degrees
  toDegrees: (radians) => radians * (180 / Math.PI)
};

// ========================================
// 🎯 UTILIDADES DE VECTORES
// ========================================

export const VectorUtils = {
  // Create a new vector
  create: (x = 0, y = 0, z = 0) => ({ x, y, z }),

  // Clone a vector
  clone: (v) => ({ x: v.x, y: v.y, z: v.z || 0 }),

  // Add two vectors
  add: (a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: (a.z || 0) + (b.z || 0)
  }),

  // Subtract two vectors
  subtract: (a, b) => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: (a.z || 0) - (b.z || 0)
  }),

  // Multiply vector by scalar
  multiply: (v, scalar) => ({
    x: v.x * scalar,
    y: v.y * scalar,
    z: (v.z || 0) * scalar
  }),

  // Divide vector by scalar
  divide: (v, scalar) => ({
    x: v.x / scalar,
    y: v.y / scalar,
    z: (v.z || 0) / scalar
  }),

  // Dot product
  dot: (a, b) => a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0),

  // Cross product (3D only)
  cross: (a, b) => ({
    x: (a.y * (b.z || 0)) - ((a.z || 0) * b.y),
    y: ((a.z || 0) * b.x) - (a.x * (b.z || 0)),
    z: (a.x * b.y) - (a.y * b.x)
  }),

  // Vector magnitude
  magnitude: (v) => Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0)),

  // Vector magnitude squared
  magnitudeSquared: (v) => v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0),

  // Normalize vector
  normalize: (v) => {
    const mag = VectorUtils.magnitude(v);
    return mag === 0 ? VectorUtils.create() : VectorUtils.divide(v, mag);
  },

  // Set vector magnitude
  setMagnitude: (v, length) => VectorUtils.multiply(VectorUtils.normalize(v), length),

  // Limit vector magnitude
  limit: (v, maxLength) => {
    const mag = VectorUtils.magnitude(v);
    return mag > maxLength ? VectorUtils.setMagnitude(v, maxLength) : v;
  },

  // Linear interpolation between vectors
  lerp: (a, b, t) => ({
    x: MathUtils.lerp(a.x, b.x, t),
    y: MathUtils.lerp(a.y, b.y, t),
    z: MathUtils.lerp(a.z || 0, b.z || 0, t)
  }),

  // Angle of vector (2D)
  angle: (v) => Math.atan2(v.y, v.x),

  // Rotate vector (2D)
  rotate: (v, angle) => ({
    x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
    y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
    z: v.z || 0
  })
};

// ========================================
// 🎯 UTILIDADES DE COLISIONES
// ========================================

export const CollisionUtils = {
  // Point in rectangle
  pointInRect: (point, rect) => {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  },

  // Point in circle
  pointInCircle: (point, circle) => {
    const distance = MathUtils.distance(point, circle);
    return distance <= circle.radius;
  },

  // Rectangle intersection
  rectIntersect: (rect1, rect2) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  },

  // Circle intersection
  circleIntersect: (circle1, circle2) => {
    const distance = MathUtils.distance(circle1, circle2);
    return distance <= circle1.radius + circle2.radius;
  },

  // Rectangle-circle intersection
  rectCircleIntersect: (rect, circle) => {
    const closestX = MathUtils.clamp(circle.x, rect.x, rect.x + rect.width);
    const closestY = MathUtils.clamp(circle.y, rect.y, rect.y + rect.height);

    const distance = MathUtils.distance(circle, { x: closestX, y: closestY });
    return distance <= circle.radius;
  },

  // Line intersection
  lineIntersect: (line1, line2) => {
    const { x1, y1, x2, y2 } = line1;
    const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return null; // Parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null;
  },

  // Ray-sphere intersection
  raySphereIntersect: (rayOrigin, rayDirection, sphereCenter, sphereRadius) => {
    const oc = VectorUtils.subtract(rayOrigin, sphereCenter);
    const a = VectorUtils.dot(rayDirection, rayDirection);
    const b = 2.0 * VectorUtils.dot(oc, rayDirection);
    const c = VectorUtils.dot(oc, oc) - sphereRadius * sphereRadius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return null;

    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

    return { t1, t2 };
  }
};

// ========================================
// ⏱️ UTILIDADES DE TIEMPO
// ========================================

export const TimeUtils = {
  // Convert milliseconds to seconds
  msToSeconds: (ms) => ms / 1000,

  // Convert seconds to milliseconds
  secondsToMs: (seconds) => seconds * 1000,

  // Format time as MM:SS
  formatTime: (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // Format time as HH:MM:SS
  formatTimeHours: (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle: (func, limit) => {
    let lastFunc;
    let lastRan;
    return function(...args) {
      if (!lastRan) {
        func.apply(this, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }
};

// ========================================
// 🎨 UTILIDADES DE COLOR
// ========================================

export const ColorUtils = {
  // Hex to RGB
  hexToRgb: (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  // RGB to hex
  rgbToHex: (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  // HSL to RGB
  hslToRgb: (h, s, l) => {
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

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  },

  // Interpolate between colors
  lerpColor: (color1, color2, t) => {
    const rgb1 = ColorUtils.hexToRgb(color1);
    const rgb2 = ColorUtils.hexToRgb(color2);

    if (!rgb1 || !rgb2) return color1;

    const r = Math.round(MathUtils.lerp(rgb1.r, rgb2.r, t));
    const g = Math.round(MathUtils.lerp(rgb1.g, rgb2.g, t));
    const b = Math.round(MathUtils.lerp(rgb1.b, rgb2.b, t));

    return ColorUtils.rgbToHex(r, g, b);
  },

  // Random color
  randomColor: () => {
    return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
};

// ========================================
// 📱 UTILIDADES DE DISPOSITIVO
// ========================================

export const DeviceUtils = {
  // Check if mobile device
  isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),

  // Check if tablet
  isTablet: () => /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768,

  // Check if desktop
  isDesktop: () => !DeviceUtils.isMobile() && !DeviceUtils.isTablet(),

  // Check if touch device
  isTouchDevice: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,

  // Get device pixel ratio
  getPixelRatio: () => window.devicePixelRatio || 1,

  // Get viewport size
  getViewportSize: () => ({
    width: window.innerWidth,
    height: window.innerHeight
  }),

  // Check if in fullscreen
  isFullscreen: () => !!(document.fullscreenElement || document.webkitFullscreenElement),

  // Request fullscreen
  requestFullscreen: (element = document.documentElement) => {
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      return element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      return element.msRequestFullscreen();
    }
    return Promise.reject('Fullscreen not supported');
  },

  // Exit fullscreen
  exitFullscreen: () => {
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      return document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      return document.msExitFullscreen();
    }
    return Promise.reject('Exit fullscreen not supported');
  }
};

// ========================================
// 💾 UTILIDADES DE ALMACENAMIENTO
// ========================================

export const StorageUtils = {
  // Local storage with JSON support
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  },

  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  },

  // Check if storage is available
  isAvailable: () => {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
};

// ========================================
// 🎮 UTILIDADES ESPECÍFICAS DEL JUEGO
// ========================================

export const GameUtils = {
  // Generate unique ID
  generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),

  // Calculate score multiplier
  calculateScoreMultiplier: (level, combo = 1) => {
    const baseMultiplier = 1 + (level - 1) * 0.1;
    const comboMultiplier = Math.min(combo * 0.1, 2); // Max 2x from combo
    return Math.round((baseMultiplier + comboMultiplier) * 100) / 100;
  },

  // Calculate experience needed for next level
  getExpForLevel: (level) => {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  },

  // Get level from experience
  getLevelFromExp: (exp) => {
    let level = 1;
    let totalExp = 0;
    while (totalExp <= exp) {
      totalExp += GameUtils.getExpForLevel(level);
      if (totalExp <= exp) level++;
    }
    return level;
  },

  // Format score with commas
  formatScore: (score) => {
    return score.toLocaleString();
  },

  // Calculate damage with randomness
  calculateDamage: (baseDamage, variance = 0.2) => {
    const min = baseDamage * (1 - variance);
    const max = baseDamage * (1 + variance);
    return Math.round(MathUtils.randomFloat(min, max));
  },

  // Check if position is valid (not in walls, etc.)
  isValidPosition: (position, level) => {
    // Implementation depends on level structure
    // For now, just check basic bounds
    return position.x >= -50 && position.x <= 50 &&
           position.z >= -50 && position.z <= 50 &&
           position.y >= 0;
  },

  // Get spawn position
  getSpawnPosition: (level) => {
    // Return a safe spawn position
    return { x: 0, y: 1, z: 0 };
  },

  // Create Three.js color from hex
  createColor: (hex) => new THREE.Color(hex),

  // Create Three.js vector
  createVector3: (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z),

  // Dispose Three.js objects
  disposeObject: (object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
    if (object.texture) object.texture.dispose();
  },

  // Clean up Three.js scene
  cleanupScene: (scene) => {
    while (scene.children.length > 0) {
      const child = scene.children[0];
      scene.remove(child);
      GameUtils.disposeObject(child);
    }
  }
};

// ========================================
// 🔒 UTILIDADES DE VALIDACIÓN
// ========================================

export const ValidationUtils = {
  // Validate email
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate username
  isValidUsername: (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  },

  // Sanitize input
  sanitizeInput: (input) => {
    return input.replace(/[<>\"'&]/g, (char) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char];
    });
  },

  // Validate number range
  isInRange: (value, min, max) => {
    return typeof value === 'number' && value >= min && value <= max;
  },

  // Validate position data
  isValidPosition: (position) => {
    return position &&
           typeof position.x === 'number' &&
           typeof position.y === 'number' &&
           typeof position.z === 'number' &&
           !isNaN(position.x) &&
           !isNaN(position.y) &&
           !isNaN(position.z);
  }
};

// ========================================
// 📊 UTILIDADES DE PERFORMANCE
// ========================================

export const PerformanceUtils = {
  // Measure execution time
  measureTime: (fn, name = 'Operation') => {
    return (...args) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      console.log(`${name} took ${end - start} milliseconds`);
      return result;
    };
  },

  // Object pooling helper
  createPool: (createFn, resetFn, initialSize = 10) => {
    const pool = [];

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      pool.push(createFn());
    }

    return {
      get: () => {
        if (pool.length > 0) {
          const obj = pool.pop();
          return resetFn ? resetFn(obj) : obj;
        }
        return createFn();
      },

      release: (obj) => {
        if (resetFn) resetFn(obj);
        pool.push(obj);
      },

      size: () => pool.length
    };
  },

  // Frame rate limiter
  createFrameLimiter: (targetFPS) => {
    let lastFrame = 0;
    const frameTime = 1000 / targetFPS;

    return (callback) => {
      const now = performance.now();
      if (now - lastFrame >= frameTime) {
        lastFrame = now;
        callback();
      }
    };
  }
};

// ========================================
// 🔧 UTILIDADES DE DEBUG
// ========================================

export const DebugUtils = {
  // Log with timestamp
  log: (...args) => {
    if (gameConfig.debug.enabled) {
      console.log(`[${new Date().toISOString()}]`, ...args);
    }
  },

  // Warn with timestamp
  warn: (...args) => {
    if (gameConfig.debug.enabled) {
      console.warn(`[${new Date().toISOString()}]`, ...args);
    }
  },

  // Error with timestamp
  error: (...args) => {
    console.error(`[${new Date().toISOString()}]`, ...args);
  },

  // Performance mark
  mark: (name) => {
    if (gameConfig.debug.enabled && performance.mark) {
      performance.mark(name);
    }
  },

  // Performance measure
  measure: (name, startMark, endMark) => {
    if (gameConfig.debug.enabled && performance.measure) {
      performance.measure(name, startMark, endMark);
      const measurements = performance.getEntriesByName(name);
      if (measurements.length > 0) {
        console.log(`${name}: ${measurements[0].duration}ms`);
      }
    }
  },

  // Draw bounding box
  drawBoundingBox: (scene, object, color = 0xff0000) => {
    if (!gameConfig.debug.showBoundingBoxes) return;

    const box = new THREE.Box3().setFromObject(object);
    const helper = new THREE.Box3Helper(box, color);
    scene.add(helper);
    return helper;
  }
};

export default {
  MathUtils,
  VectorUtils,
  CollisionUtils,
  TimeUtils,
  ColorUtils,
  DeviceUtils,
  StorageUtils,
  GameUtils,
  ValidationUtils,
  PerformanceUtils,
  DebugUtils
};
