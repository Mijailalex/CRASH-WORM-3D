export const gameConfig = {
  // Configuración del jugador
  player: {
    speed: 5,
    jumpForce: 8,
    maxHealth: 100,
    size: [0.5, 1, 0.5],
    startPosition: [0, 2, 0]
  },

  // Configuración de física
  physics: {
    gravity: [0, -9.81, 0],
    timeStep: 1/60,
    maxSubSteps: 10
  },

  // Configuración de mundo
  world: {
    size: 50,
    chunkSize: 10,
    renderDistance: 25,
    fogNear: 20,
    fogFar: 40
  },

  // Configuración de enemigos
  enemies: {
    maxCount: 20,
    spawnRate: 0.02,
    types: {
      basic: {
        health: 30,
        speed: 2,
        damage: 10,
        color: '#ff4444'
      },
      fast: {
        health: 20,
        speed: 4,
        damage: 15,
        color: '#ffaa44'
      },
      tank: {
        health: 80,
        speed: 1,
        damage: 25,
        color: '#aa4444'
      }
    }
  },

  // Configuración de coleccionables
  collectibles: {
    coins: {
      value: 10,
      spawnRate: 0.05,
      color: '#ffdd00'
    },
    gems: {
      value: 50,
      spawnRate: 0.01,
      color: '#44ff44'
    },
    powerUps: {
      duration: 10000,
      spawnRate: 0.005,
      types: {
        speed: { multiplier: 1.5, color: '#4444ff' },
        jump: { multiplier: 1.3, color: '#ff44ff' },
        shield: { duration: 15000, color: '#44ffff' }
      }
    }
  },

  // Configuración de plataformas
  platforms: {
    static: {
      count: 15,
      minSize: [2, 0.2, 2],
      maxSize: [6, 0.5, 6]
    },
    moving: {
      count: 5,
      speed: 2,
      amplitude: 3
    }
  },

  // Configuración de audio
  audio: {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    enabled: true
  },

  // Configuración de gráficos
  graphics: {
    quality: 'medium', // low, medium, high
    shadows: true,
    particles: true,
    postProcessing: false,
    maxParticles: 1000
  },

  // Configuración de puntuación
  scoring: {
    coinMultiplier: 1,
    timeBonus: 0.1,
    comboMultiplier: 1.2,
    perfectLevelBonus: 1000
  },

  // Configuración de niveles
  levels: {
    difficultyIncrease: 0.1,
    enemySpawnIncrease: 0.02,
    platformComplexity: 0.15
  },

  // Configuración de controles
  controls: {
    keyboard: {
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      moveForward: 'KeyW',
      moveBackward: 'KeyS',
      jump: 'Space',
      pause: 'Escape'
    },
    gamepad: {
      enabled: true,
      deadzone: 0.1
    },
    mouse: {
      sensitivity: 0.002,
      invertY: false
    }
  },

  // Configuración de rendimiento
  performance: {
    targetFPS: 60,
    maxDeltaTime: 0.016,
    cullDistance: 30,
    lodLevels: 3
  },

  // Configuración de debug
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    showFPS: true,
    showPhysics: false,
    showBounds: false,
    logLevel: 'info'
  }
};