/* ============================================================================ */
/* 🎮 CRASH WORM 3D - CONFIGURACIÓN CENTRAL DEL JUEGO */
/* ============================================================================ */
/* Ubicación: src/data/gameConfig.js */

import * as THREE from 'three';

// ========================================
// 🎯 CONFIGURACIÓN GLOBAL DEL JUEGO
// ========================================

export const gameConfig = {
  // ========================================
  // 🎮 CONFIGURACIÓN GENERAL
  // ========================================
  general: {
    name: 'Crash Worm 3D Adventure',
    version: '1.0.0',
    buildNumber: 1001,
    maxPlayers: 16,
    tickRate: 60, // Updates per second
    debugMode: import.meta.env.DEV,
    analytics: true,
    crashReporting: true
  },

  // ========================================
  // ⚡ CONFIGURACIÓN DE PERFORMANCE
  // ========================================
  performance: {
    targetFPS: 60,
    maxFPS: 144,
    adaptiveQuality: true,
    memoryLimit: 512, // MB

    // Render settings
    maxDrawCalls: 1000,
    maxTriangles: 100000,
    lodDistance: [10, 50, 100], // LOD distances
    cullingDistance: 200,

    // Optimization
    enableFrustumCulling: true,
    enableOcclusionCulling: false,
    enableInstancing: true,
    enableBatching: true,

    // Quality presets
    qualityPresets: {
      low: {
        shadowMapSize: 512,
        antialiasing: false,
        postProcessing: false,
        particleCount: 100,
        textureQuality: 0.5,
        renderScale: 0.8
      },
      medium: {
        shadowMapSize: 1024,
        antialiasing: true,
        postProcessing: true,
        particleCount: 500,
        textureQuality: 0.75,
        renderScale: 0.9
      },
      high: {
        shadowMapSize: 2048,
        antialiasing: true,
        postProcessing: true,
        particleCount: 1000,
        textureQuality: 1.0,
        renderScale: 1.0
      },
      ultra: {
        shadowMapSize: 4096,
        antialiasing: true,
        postProcessing: true,
        particleCount: 2000,
        textureQuality: 1.0,
        renderScale: 1.2
      }
    }
  },

  // ========================================
  // 📱 CONFIGURACIÓN DE DISPOSITIVOS
  // ========================================
  devices: {
    mobile: {
      maxParticles: 200,
      shadowMapSize: 512,
      renderScale: 0.7,
      enablePostProcessing: false,
      enableAntialiasing: false,
      targetFPS: 30
    },
    tablet: {
      maxParticles: 500,
      shadowMapSize: 1024,
      renderScale: 0.85,
      enablePostProcessing: true,
      enableAntialiasing: true,
      targetFPS: 45
    },
    desktop: {
      maxParticles: 1000,
      shadowMapSize: 2048,
      renderScale: 1.0,
      enablePostProcessing: true,
      enableAntialiasing: true,
      targetFPS: 60
    },
    highEnd: {
      maxParticles: 2000,
      shadowMapSize: 4096,
      renderScale: 1.2,
      enablePostProcessing: true,
      enableAntialiasing: true,
      targetFPS: 144
    }
  },

  // ========================================
  // 🎨 CONFIGURACIÓN GRÁFICA
  // ========================================
  graphics: {
    // Renderer settings
    renderer: {
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    },

    // Camera settings
    camera: {
      fov: 75,
      near: 0.1,
      far: 1000,
      position: { x: 0, y: 5, z: 10 },
      target: { x: 0, y: 0, z: 0 }
    },

    // Lighting
    lighting: {
      ambient: {
        color: 0x404040,
        intensity: 0.4
      },
      directional: {
        color: 0xffffff,
        intensity: 1.0,
        position: { x: 50, y: 50, z: 50 },
        castShadow: true,
        shadowMapSize: 2048,
        shadowCameraNear: 0.1,
        shadowCameraFar: 500,
        shadowCameraLeft: -50,
        shadowCameraRight: 50,
        shadowCameraTop: 50,
        shadowCameraBottom: -50
      },
      point: {
        color: 0xff6600,
        intensity: 0.5,
        distance: 100,
        decay: 2
      }
    },

    // Post-processing
    postProcessing: {
      enabled: true,
      bloom: {
        threshold: 0.9,
        strength: 1.5,
        radius: 0.8
      },
      fxaa: {
        enabled: true
      },
      screenSpaceReflections: {
        enabled: false
      }
    },

    // Materials
    materials: {
      defaultMaterial: {
        color: 0x00ff00,
        metalness: 0.0,
        roughness: 0.8
      },
      playerMaterial: {
        color: 0x00aaff,
        metalness: 0.2,
        roughness: 0.6,
        emissive: 0x002244
      },
      enemyMaterial: {
        color: 0xff4400,
        metalness: 0.1,
        roughness: 0.7,
        emissive: 0x441100
      }
    }
  },

  // ========================================
  // 🎵 CONFIGURACIÓN DE AUDIO
  // ========================================
  audio: {
    // Master settings
    master: {
      volume: 0.8,
      muted: false,
      spatialAudio: true,
      reverbEnabled: true
    },

    // Audio categories
    categories: {
      music: {
        volume: 0.6,
        loop: true,
        fadeInDuration: 2000,
        fadeOutDuration: 1000
      },
      sfx: {
        volume: 0.8,
        maxSimultaneous: 32,
        prioritySystem: true
      },
      ambient: {
        volume: 0.4,
        loop: true,
        spatial: true
      },
      voice: {
        volume: 0.9,
        compression: true,
        noiseReduction: true
      }
    },

    // Audio files
    files: {
      music: {
        mainMenu: '/audio/music/main_menu.mp3',
        gameplay: '/audio/music/gameplay.mp3',
        boss: '/audio/music/boss.mp3'
      },
      sfx: {
        jump: '/audio/sfx/jump.wav',
        collect: '/audio/sfx/collect.wav',
        hurt: '/audio/sfx/hurt.wav',
        powerup: '/audio/sfx/powerup.wav',
        explosion: '/audio/sfx/explosion.wav'
      },
      ambient: {
        forest: '/audio/ambient/forest.mp3',
        cave: '/audio/ambient/cave.mp3',
        ocean: '/audio/ambient/ocean.mp3'
      }
    }
  },

  // ========================================
  // 🎮 CONFIGURACIÓN DE CONTROLES
  // ========================================
  controls: {
    // Keyboard defaults
    keyboard: {
      moveForward: ['KeyW', 'ArrowUp'],
      moveBackward: ['KeyS', 'ArrowDown'],
      moveLeft: ['KeyA', 'ArrowLeft'],
      moveRight: ['KeyD', 'ArrowRight'],
      jump: ['Space'],
      run: ['ShiftLeft'],
      crouch: ['ControlLeft'],
      inventory: ['KeyI'],
      pause: ['Escape'],
      interact: ['KeyE'],
      attack: ['KeyF'],
      camera: ['KeyC']
    },

    // Mouse settings
    mouse: {
      sensitivity: 0.002,
      invertY: false,
      smoothing: 0.1,
      acceleration: 1.0,
      deadZone: 0.1
    },

    // Gamepad settings
    gamepad: {
      deadZone: 0.15,
      sensitivity: 1.0,
      invertY: false,
      vibration: true,
      mapping: {
        moveStick: 0, // Left stick
        cameraStick: 1, // Right stick
        jump: 0, // A/X button
        run: 6, // RT/R2
        attack: 2, // X/Square
        pause: 9 // Start/Options
      }
    },

    // Touch controls (mobile)
    touch: {
      virtualJoystick: {
        enabled: true,
        size: 100,
        deadZone: 0.2,
        position: { x: 0.15, y: 0.8 }
      },
      touchButtons: {
        jump: { x: 0.85, y: 0.8, size: 60 },
        attack: { x: 0.75, y: 0.7, size: 50 },
        pause: { x: 0.95, y: 0.05, size: 40 }
      }
    }
  },

  // ========================================
  // 🏃‍♂️ CONFIGURACIÓN DEL JUGADOR
  // ========================================
  player: {
    // Movement
    movement: {
      walkSpeed: 5,
      runSpeed: 8,
      jumpHeight: 3,
      gravity: -20,
      acceleration: 20,
      deceleration: 15,
      airControl: 0.3,
      coyoteTime: 0.15, // Grace period for jumping after leaving ground
      jumpBuffering: 0.1 // Input buffering for jumps
    },

    // Health system
    health: {
      maxHealth: 100,
      regeneration: 1, // HP per second
      regenerationDelay: 5000, // ms after taking damage
      invincibilityTime: 1000 // ms after taking damage
    },

    // Lives system
    lives: {
      startingLives: 3,
      maxLives: 9,
      extraLifeScore: 10000
    },

    // Camera
    camera: {
      followOffset: { x: 0, y: 5, z: 10 },
      followSpeed: 5,
      lookAhead: 2,
      shakeMagnitude: 0.5,
      shakeDuration: 0.3
    },

    // Physics
    physics: {
      mass: 1,
      friction: 0.8,
      restitution: 0.2,
      linearDamping: 0.9,
      angularDamping: 0.9
    }
  },

  // ========================================
  // 👾 CONFIGURACIÓN DE ENEMIGOS
  // ========================================
  enemies: {
    // Tipos de enemigos
    types: {
      basic: {
        health: 30,
        speed: 2,
        damage: 10,
        attackRange: 1.5,
        detectionRange: 8,
        scoreValue: 100,
        size: { x: 1, y: 1, z: 1 },
        color: 0xff4444
      },
      fast: {
        health: 20,
        speed: 4,
        damage: 15,
        attackRange: 1,
        detectionRange: 10,
        scoreValue: 150,
        size: { x: 0.8, y: 0.8, z: 0.8 },
        color: 0xffff44
      },
      heavy: {
        health: 80,
        speed: 1,
        damage: 25,
        attackRange: 2,
        detectionRange: 6,
        scoreValue: 300,
        size: { x: 1.5, y: 1.5, z: 1.5 },
        color: 0x884444
      },
      flying: {
        health: 25,
        speed: 3,
        damage: 12,
        attackRange: 2,
        detectionRange: 12,
        scoreValue: 200,
        size: { x: 1, y: 0.5, z: 1 },
        color: 0x4444ff,
        canFly: true
      }
    },

    // AI behavior
    ai: {
      updateFrequency: 10, // Updates per second
      pathfindingInterval: 500, // ms
      reactionTime: 200, // ms
      memoryDuration: 5000, // ms
      groupBehavior: true,
      flockingRadius: 5
    }
  },

  // ========================================
  // 💎 CONFIGURACIÓN DE COLECCIONABLES
  // ========================================
  collectibles: {
    types: {
      coin: {
        value: 10,
        size: 0.5,
        rotationSpeed: 2,
        color: 0xffff00,
        sound: 'collect',
        effect: 'sparkle'
      },
      gem: {
        value: 50,
        size: 0.7,
        rotationSpeed: 1,
        color: 0x00ffff,
        sound: 'collect',
        effect: 'shine'
      },
      heart: {
        value: 25, // Health points
        size: 0.6,
        rotationSpeed: 1.5,
        color: 0xff0088,
        sound: 'heal',
        effect: 'heal'
      },
      star: {
        value: 100,
        size: 0.8,
        rotationSpeed: 3,
        color: 0xffffff,
        sound: 'powerup',
        effect: 'explosion'
      }
    },

    // Spawn settings
    spawn: {
      density: 0.1, // Items per square unit
      heightRange: { min: 0.5, max: 5 },
      clusters: true,
      clusterSize: { min: 2, max: 5 },
      respawnTime: 30000 // ms
    }
  },

  // ========================================
  // 🚀 CONFIGURACIÓN DE POWER-UPS
  // ========================================
  powerUps: {
    types: {
      speedBoost: {
        name: 'Speed Boost',
        duration: 10000, // ms
        effect: { walkSpeed: 1.5, runSpeed: 1.5 },
        color: 0x00ff00,
        icon: '⚡'
      },
      jumpBoost: {
        name: 'Jump Boost',
        duration: 15000,
        effect: { jumpHeight: 1.8 },
        color: 0x0088ff,
        icon: '🔵'
      },
      invincibility: {
        name: 'Star Power',
        duration: 8000,
        effect: { invincible: true },
        color: 0xffff00,
        icon: '⭐'
      },
      scoreMultiplier: {
        name: 'Score Multiplier',
        duration: 20000,
        effect: { scoreMultiplier: 2 },
        color: 0xff8800,
        icon: '💰'
      },
      shield: {
        name: 'Shield',
        duration: 0, // Lasts until hit
        effect: { absorbDamage: 1 },
        color: 0x8888ff,
        icon: '🛡️'
      }
    }
  },

  // ========================================
  // 🌍 CONFIGURACIÓN DE NIVELES
  // ========================================
  levels: {
    // Level progression
    progression: {
      scoreThresholds: [0, 1000, 2500, 5000, 10000],
      difficultyIncrease: 0.2,
      enemySpawnIncrease: 0.15,
      speedIncrease: 0.1
    },

    // World generation
    generation: {
      chunkSize: 50,
      renderDistance: 3, // chunks
      heightVariation: 10,
      platformDensity: 0.3,
      enemySpawnRate: 0.1,
      collectibleSpawnRate: 0.05,
      powerUpSpawnRate: 0.01
    },

    // Level themes
    themes: {
      forest: {
        skyColor: 0x87ceeb,
        fogColor: 0xcccccc,
        fogDensity: 0.01,
        ambient: 'forest',
        music: 'gameplay'
      },
      cave: {
        skyColor: 0x222222,
        fogColor: 0x444444,
        fogDensity: 0.05,
        ambient: 'cave',
        music: 'boss'
      },
      ocean: {
        skyColor: 0x4488ff,
        fogColor: 0x88ccff,
        fogDensity: 0.02,
        ambient: 'ocean',
        music: 'gameplay'
      }
    }
  },

  // ========================================
  // 🌐 CONFIGURACIÓN DE RED
  // ========================================
  network: {
    // Connection settings
    connection: {
      maxReconnectAttempts: 5,
      reconnectInterval: 2000, // ms
      heartbeatInterval: 30000, // ms
      timeout: 10000 // ms
    },

    // Server endpoints
    endpoints: {
      game: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
      api: import.meta.env.VITE_API_URL || 'http://localhost:8080',
      analytics: import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:8080/analytics'
    },

    // Multiplayer settings
    multiplayer: {
      maxPlayers: 16,
      tickRate: 20, // Network updates per second
      interpolation: true,
      prediction: true,
      reconciliation: true,
      lagCompensation: true
    }
  },

  // ========================================
  // 🔒 CONFIGURACIÓN DE SEGURIDAD
  // ========================================
  security: {
    // Anti-cheat
    antiCheat: {
      enabled: true,
      validateMovement: true,
      validateScore: true,
      validateItems: true,
      maxSpeedThreshold: 20,
      maxScorePerSecond: 1000,
      reportSuspicious: true
    },

    // Input validation
    validation: {
      maxNameLength: 20,
      maxChatLength: 200,
      sanitizeInput: true,
      rateLimit: true
    }
  },

  // ========================================
  // 📊 CONFIGURACIÓN DE ANALYTICS
  // ========================================
  analytics: {
    enabled: !import.meta.env.DEV,
    sessionTracking: true,
    performanceTracking: true,
    errorTracking: true,
    userBehaviorTracking: true,

    // Events to track
    events: {
      gameStart: true,
      gameEnd: true,
      levelComplete: true,
      powerUpCollected: true,
      enemyDefeated: true,
      playerDeath: true,
      settingsChanged: true
    }
  },

  // ========================================
  // 🐛 CONFIGURACIÓN DE DEBUG
  // ========================================
  debug: {
    enabled: import.meta.env.DEV,
    showFPS: false,
    showStats: false,
    showBoundingBoxes: false,
    showNavMesh: false,
    showLightHelpers: false,
    enableWireframe: false,
    enableAxesHelper: false,
    enableGridHelper: false,
    logLevel: 'info' // error, warn, info, debug
  }
};

// ========================================
// 🔧 UTILIDADES DE CONFIGURACIÓN
// ========================================

export function getDeviceConfig() {
  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;

  // Detect performance capabilities
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  const isHighEnd = gl && gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 4096;

  if (isMobile && !isTablet) {
    return gameConfig.devices.mobile;
  } else if (isTablet) {
    return gameConfig.devices.tablet;
  } else if (isHighEnd) {
    return gameConfig.devices.highEnd;
  } else {
    return gameConfig.devices.desktop;
  }
}

export function applyQualityPreset(preset) {
  const settings = gameConfig.performance.qualityPresets[preset];
  if (settings) {
    // Apply settings to renderer, materials, etc.
    return {
      ...gameConfig.graphics,
      ...settings
    };
  }
  return gameConfig.graphics;
}

export function validateConfig(config) {
  // Validate configuration object
  const errors = [];

  // Check required fields
  if (!config.general?.name) errors.push('Missing game name');
  if (!config.general?.version) errors.push('Missing game version');

  // Check numeric ranges
  if (config.performance?.targetFPS < 1 || config.performance?.targetFPS > 240) {
    errors.push('Invalid target FPS');
  }

  return errors.length === 0 ? null : errors;
}

export default gameConfig;
