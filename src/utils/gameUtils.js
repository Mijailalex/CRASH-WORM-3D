/* ============================================================================ */
/* 🎮 CRASH WORM 3D - UTILIDADES DEL JUEGO */
/* ============================================================================ */

import * as THREE from 'three';
import { gameConfig } from '@/data/gameConfig';

// ========================================
// 🧮 UTILIDADES MATEMÁTICAS
// ========================================

export const MathUtils = {
  // Interpolación lineal
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Interpolación suavizada
  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  },

  // Clamp value between min and max
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  // Remap value from one range to another
  remap(value, oldMin, oldMax, newMin, newMax) {
    return newMin + (value - oldMin) * (newMax - newMin) / (oldMax - oldMin);
  },

  // Random between min and max
  random(min = 0, max = 1) {
    return min + Math.random() * (max - min);
  },

  // Random integer between min and max (inclusive)
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Random boolean with probability
  randomBool(probability = 0.5) {
    return Math.random() < probability;
  },

  // Distance between two points
  distance(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = (b.z || 0) - (a.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  // Distance squared (faster when you don't need exact distance)
  distanceSquared(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = (b.z || 0) - (a.z || 0);
    return dx * dx + dy * dy + dz * dz;
  },

  // Normalize angle to 0-2π
  normalizeAngle(angle) {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
  },

  // Shortest angle difference
  angleDifference(a, b) {
    const diff = this.normalizeAngle(b - a);
    return diff > Math.PI ? diff - Math.PI * 2 : diff;
  },

  // Check if point is inside AABB
  pointInAABB(point, aabb) {
    return point.x >= aabb.min.x && point.x <= aabb.max.x &&
           point.y >= aabb.min.y && point.y <= aabb.max.y &&
           (point.z === undefined || (point.z >= aabb.min.z && point.z <= aabb.max.z));
  },

  // Easing functions
  easeInQuad(t) { return t * t; },
  easeOutQuad(t) { return t * (2 - t); },
  easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
  easeInCubic(t) { return t * t * t; },
  easeOutCubic(t) { return (--t) * t * t + 1; },
  easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; }
};

// ========================================
// 🎮 UTILIDADES DE GAME OBJECTS
// ========================================

export const GameObjectUtils = {
  // Create basic game object structure
  createGameObject(name, position = { x: 0, y: 0, z: 0 }) {
    return {
      id: generateUUID(),
      name,
      active: true,
      transform: {
        position: { ...position },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      components: new Map(),
      children: [],
      parent: null
    };
  },

  // Add child to parent
  addChild(parent, child) {
    if (child.parent) {
      this.removeChild(child.parent, child);
    }

    parent.children.push(child);
    child.parent = parent;
  },

  // Remove child from parent
  removeChild(parent, child) {
    const index = parent.children.indexOf(child);
    if (index > -1) {
      parent.children.splice(index, 1);
      child.parent = null;
    }
  },

  // Get world position
  getWorldPosition(gameObject) {
    if (!gameObject.parent) {
      return { ...gameObject.transform.position };
    }

    const parentWorld = this.getWorldPosition(gameObject.parent);
    return {
      x: parentWorld.x + gameObject.transform.position.x,
      y: parentWorld.y + gameObject.transform.position.y,
      z: parentWorld.z + gameObject.transform.position.z
    };
  },

  // Find child by name
  findChild(parent, name) {
    for (const child of parent.children) {
      if (child.name === name) return child;

      const found = this.findChild(child, name);
      if (found) return found;
    }
    return null;
  },

  // Get all children recursively
  getAllChildren(parent) {
    const children = [...parent.children];
    for (const child of parent.children) {
      children.push(...this.getAllChildren(child));
    }
    return children;
  }
};

// ========================================
// 🎨 UTILIDADES DE COLOR
// ========================================

export const ColorUtils = {
  // Convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  // Convert RGB to hex
  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  // Convert HSL to RGB
  hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r, g, b;

    if (0 <= h && h < 60) {
      [r, g, b] = [c, x, 0];
    } else if (60 <= h && h < 120) {
      [r, g, b] = [x, c, 0];
    } else if (120 <= h && h < 180) {
      [r, g, b] = [0, c, x];
    } else if (180 <= h && h < 240) {
      [r, g, b] = [0, x, c];
    } else if (240 <= h && h < 300) {
      [r, g, b] = [x, 0, c];
    } else if (300 <= h && h < 360) {
      [r, g, b] = [c, 0, x];
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  },

  // Interpolate between two colors
  lerpColor(color1, color2, t) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return color1;

    const r = Math.round(MathUtils.lerp(rgb1.r, rgb2.r, t));
    const g = Math.round(MathUtils.lerp(rgb1.g, rgb2.g, t));
    const b = Math.round(MathUtils.lerp(rgb1.b, rgb2.b, t));

    return this.rgbToHex(r, g, b);
  },

  // Get random color
  randomColor() {
    return this.rgbToHex(
      MathUtils.randomInt(0, 255),
      MathUtils.randomInt(0, 255),
      MathUtils.randomInt(0, 255)
    );
  },

  // Get color brightness (0-1)
  getBrightness(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
  }
};

// ========================================
// ⏱️ UTILIDADES DE TIEMPO
// ========================================

export const TimeUtils = {
  // Format time as MM:SS
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  // Format time as HH:MM:SS
  formatTimeDetailed(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // Get current timestamp
  now() {
    return Date.now();
  },

  // Get elapsed time in seconds
  getElapsed(startTime) {
    return (Date.now() - startTime) / 1000;
  },

  // Create a timer
  createTimer(duration, onComplete, onTick) {
    const startTime = Date.now();
    const timer = {
      startTime,
      duration: duration * 1000,
      onComplete,
      onTick,
      isRunning: true,
      isPaused: false,
      pauseTime: 0,
      totalPauseTime: 0
    };

    const update = () => {
      if (!timer.isRunning) return;

      if (timer.isPaused) {
        requestAnimationFrame(update);
        return;
      }

      const elapsed = Date.now() - timer.startTime - timer.totalPauseTime;
      const remaining = Math.max(0, timer.duration - elapsed);
      const progress = 1 - (remaining / timer.duration);

      if (timer.onTick) {
        timer.onTick(remaining / 1000, progress);
      }

      if (remaining <= 0) {
        timer.isRunning = false;
        if (timer.onComplete) {
          timer.onComplete();
        }
      } else {
        requestAnimationFrame(update);
      }
    };

    timer.pause = () => {
      if (!timer.isPaused) {
        timer.isPaused = true;
        timer.pauseTime = Date.now();
      }
    };

    timer.resume = () => {
      if (timer.isPaused) {
        timer.totalPauseTime += Date.now() - timer.pauseTime;
        timer.isPaused = false;
      }
    };

    timer.stop = () => {
      timer.isRunning = false;
    };

    requestAnimationFrame(update);
    return timer;
  }
};

// ========================================
// 🎲 UTILIDADES DE COLISIONES
// ========================================

export const CollisionUtils = {
  // AABB vs AABB collision
  aabbVsAabb(a, b) {
    return a.min.x <= b.max.x &&
           a.max.x >= b.min.x &&
           a.min.y <= b.max.y &&
           a.max.y >= b.min.y &&
           a.min.z <= b.max.z &&
           a.max.z >= b.min.z;
  },

  // Point vs AABB collision
  pointVsAabb(point, aabb) {
    return point.x >= aabb.min.x && point.x <= aabb.max.x &&
           point.y >= aabb.min.y && point.y <= aabb.max.y &&
           point.z >= aabb.min.z && point.z <= aabb.max.z;
  },

  // Sphere vs Sphere collision
  sphereVsSphere(a, b) {
    const distance = MathUtils.distance(a.center, b.center);
    return distance <= (a.radius + b.radius);
  },

  // Point vs Sphere collision
  pointVsSphere(point, sphere) {
    const distance = MathUtils.distance(point, sphere.center);
    return distance <= sphere.radius;
  },

  // Ray vs AABB intersection
  rayVsAabb(origin, direction, aabb) {
    const invDir = {
      x: 1 / direction.x,
      y: 1 / direction.y,
      z: 1 / direction.z
    };

    const t1 = (aabb.min.x - origin.x) * invDir.x;
    const t2 = (aabb.max.x - origin.x) * invDir.x;
    const t3 = (aabb.min.y - origin.y) * invDir.y;
    const t4 = (aabb.max.y - origin.y) * invDir.y;
    const t5 = (aabb.min.z - origin.z) * invDir.z;
    const t6 = (aabb.max.z - origin.z) * invDir.z;

    const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
    const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

    if (tmax < 0 || tmin > tmax) {
      return null;
    }

    const t = tmin > 0 ? tmin : tmax;
    return {
      point: {
        x: origin.x + direction.x * t,
        y: origin.y + direction.y * t,
        z: origin.z + direction.z * t
      },
      distance: t,
      normal: this.getAABBNormal(origin, direction, aabb, t)
    };
  },

  // Get normal from AABB intersection
  getAABBNormal(origin, direction, aabb, t) {
    const point = {
      x: origin.x + direction.x * t,
      y: origin.y + direction.y * t,
      z: origin.z + direction.z * t
    };

    const center = {
      x: (aabb.min.x + aabb.max.x) / 2,
      y: (aabb.min.y + aabb.max.y) / 2,
      z: (aabb.min.z + aabb.max.z) / 2
    };

    const size = {
      x: aabb.max.x - aabb.min.x,
      y: aabb.max.y - aabb.min.y,
      z: aabb.max.z - aabb.min.z
    };

    const d = {
      x: (point.x - center.x) / (size.x / 2),
      y: (point.y - center.y) / (size.y / 2),
      z: (point.z - center.z) / (size.z / 2)
    };

    const absd = {
      x: Math.abs(d.x),
      y: Math.abs(d.y),
      z: Math.abs(d.z)
    };

    if (absd.x > absd.y && absd.x > absd.z) {
      return { x: Math.sign(d.x), y: 0, z: 0 };
    } else if (absd.y > absd.z) {
      return { x: 0, y: Math.sign(d.y), z: 0 };
    } else {
      return { x: 0, y: 0, z: Math.sign(d.z) };
    }
  }
};

// ========================================
// 🎯 UTILIDADES DEL JUEGO
// ========================================

export const GameUtils = {
  // Calculate score based on performance
  calculateScore(baseScore, timeBonus, healthBonus, multiplier = 1) {
    return Math.floor((baseScore + timeBonus + healthBonus) * multiplier);
  },

  // Get difficulty multiplier
  getDifficultyMultiplier(difficulty) {
    const multipliers = gameConfig.levels.difficulties;
    return multipliers[difficulty] || multipliers.normal;
  },

  // Calculate level stars based on performance
  calculateStars(score, time, collectibles, requirements) {
    let stars = 0;

    // Time requirements
    if (time <= requirements.timeRequirements[2]) stars = 3;
    else if (time <= requirements.timeRequirements[1]) stars = 2;
    else if (time <= requirements.timeRequirements[0]) stars = 1;

    // Collectible requirements
    const collectibleRatio = collectibles / requirements.totalCollectibles;
    if (collectibleRatio < requirements.collectibleRequirements[0]) {
      stars = Math.min(stars, 0);
    } else if (collectibleRatio < requirements.collectibleRequirements[1]) {
      stars = Math.min(stars, 1);
    } else if (collectibleRatio < requirements.collectibleRequirements[2]) {
      stars = Math.min(stars, 2);
    }

    return stars;
  },

  // Format large numbers
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  },

  // Validate save data
  validateSaveData(data) {
    if (!data || typeof data !== 'object') return false;

    const required = ['score', 'level', 'health', 'saveData'];
    return required.every(key => key in data);
  },

  // Compress save data
  compressSaveData(data) {
    try {
      return LZString.compress(JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to compress save data:', error);
      return JSON.stringify(data);
    }
  },

  // Decompress save data
  decompressSaveData(compressedData) {
    try {
      const decompressed = LZString.decompress(compressedData);
      return decompressed ? JSON.parse(decompressed) : JSON.parse(compressedData);
    } catch (error) {
      console.warn('Failed to decompress save data:', error);
      return null;
    }
  }
};

// ========================================
// 🔧 UTILIDADES GENERALES
// ========================================

// Generate UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Debounce function
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// Throttle function
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Deep clone object
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

// Check if value is empty
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// Get nested object property safely
export function getNestedProperty(obj, path, defaultValue = undefined) {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current;
}

// Set nested object property
export function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
  return obj;
}

export default {
  MathUtils,
  GameObjectUtils,
  ColorUtils,
  TimeUtils,
  CollisionUtils,
  GameUtils,
  generateUUID,
  debounce,
  throttle,
  deepClone,
  isEmpty,
  getNestedProperty,
  setNestedProperty
};
