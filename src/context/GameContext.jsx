import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Crear contexto del juego
const GameContext = createContext();

// Estados iniciales
const initialState = {
  player: {
    position: [0, 5, 0],
    velocity: [0, 0, 0],
    health: 100,
    maxHealth: 100,
    lives: 3,
    gems: 0,
    experience: 0,
    level: 1,
    isAlive: true,
    isGrounded: false,
    canJump: true,
    powerUps: [],
    abilities: {
      doubleJump: false,
      dash: false,
      shield: false
    }
  },
  world: {
    platforms: [],
    enemies: [],
    collectibles: [],
    hazards: [],
    effects: [],
    currentLevel: 1,
    levelProgress: 0,
    biome: 'cosmic'
  },
  camera: {
    position: [0, 10, 15],
    target: [0, 0, 0],
    followSpeed: 0.1,
    shakeIntensity: 0
  },
  physics: {
    gravity: -9.81,
    jumpForce: 15,
    moveSpeed: 8,
    maxVelocity: 20,
    friction: 0.9,
    airResistance: 0.98
  },
  audio: {
    music: {
      menu: null,
      gameplay: null,
      victory: null,
      gameOver: null,
      currentTrack: null,
      volume: 0.7,
      isPlaying: false
    },
    sfx: {
      jump: null,
      collect: null,
      enemy_hit: null,
      player_damage: null,
      power_up: null,
      platform_land: null,
      volume: 0.8
    }
  },
  ui: {
    showHUD: true,
    showMinimap: true,
    showFPS: false,
    showDebug: false,
    notifications: [],
    activeMenu: null
  },
  input: {
    keys: {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      dash: false,
      pause: false
    },
    mouse: {
      x: 0,
      y: 0,
      leftClick: false,
      rightClick: false
    },
    gamepad: {
      connected: false,
      buttons: {},
      axes: {}
    }
  },
  settings: {
    graphics: {
      quality: 'high',
      shadows: true,
      particles: true,
      postProcessing: true,
      antialiasing: true
    },
    audio: {
      masterVolume: 1.0,
      musicVolume: 0.7,
      sfxVolume: 0.8,
      muted: false
    },
    controls: {
      sensitivity: 1.0,
      invertY: false,
      keyBindings: {
        forward: 'KeyW',
        backward: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        jump: 'Space',
        dash: 'ShiftLeft',
        pause: 'Escape'
      }
    }
  },
  game: {
    state: 'menu', // menu, loading, playing, paused, gameOver, victory
    difficulty: 'normal',
    score: 0,
    highScore: 0,
    playTime: 0,
    level: 1,
    objectives: {
      enemiesKilled: 0,
      enemiesTarget: 12,
      gemsCollected: 0,
      gemsTarget: 30,
      secretsFound: 0,
      secretsTotal: 5
    },
    achievements: [],
    statistics: {
      totalJumps: 0,
      totalDistance: 0,
      totalDamage: 0,
      totalHealing: 0,
      bestCombo: 0,
      currentCombo: 0
    }
  }
};

// Tipos de acciones
const ACTION_TYPES = {
  // Player actions
  UPDATE_PLAYER_POSITION: 'UPDATE_PLAYER_POSITION',
  UPDATE_PLAYER_VELOCITY: 'UPDATE_PLAYER_VELOCITY',
  UPDATE_PLAYER_HEALTH: 'UPDATE_PLAYER_HEALTH',
  ADD_PLAYER_EXPERIENCE: 'ADD_PLAYER_EXPERIENCE',
  USE_ABILITY: 'USE_ABILITY',
  ADD_POWER_UP: 'ADD_POWER_UP',
  REMOVE_POWER_UP: 'REMOVE_POWER_UP',
  
  // World actions
  ADD_PLATFORM: 'ADD_PLATFORM',
  REMOVE_PLATFORM: 'REMOVE_PLATFORM',
  ADD_ENEMY: 'ADD_ENEMY',
  REMOVE_ENEMY: 'REMOVE_ENEMY',
  ADD_COLLECTIBLE: 'ADD_COLLECTIBLE',
  REMOVE_COLLECTIBLE: 'REMOVE_COLLECTIBLE',
  ADD_EFFECT: 'ADD_EFFECT',
  REMOVE_EFFECT: 'REMOVE_EFFECT',
  UPDATE_LEVEL_PROGRESS: 'UPDATE_LEVEL_PROGRESS',
  
  // Camera actions
  UPDATE_CAMERA_POSITION: 'UPDATE_CAMERA_POSITION',
  UPDATE_CAMERA_TARGET: 'UPDATE_CAMERA_TARGET',
  SHAKE_CAMERA: 'SHAKE_CAMERA',
  
  // Input actions
  UPDATE_KEYS: 'UPDATE_KEYS',
  UPDATE_MOUSE: 'UPDATE_MOUSE',
  UPDATE_GAMEPAD: 'UPDATE_GAMEPAD',
  
  // UI actions
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  TOGGLE_HUD: 'TOGGLE_HUD',
  TOGGLE_DEBUG: 'TOGGLE_DEBUG',
  
  // Game actions
  SET_GAME_STATE: 'SET_GAME_STATE',
  SET_DIFFICULTY: 'SET_DIFFICULTY',
  UPDATE_SCORE: 'UPDATE_SCORE',
  UPDATE_OBJECTIVES: 'UPDATE_OBJECTIVES',
  UNLOCK_ACHIEVEMENT: 'UNLOCK_ACHIEVEMENT',
  UPDATE_STATISTICS: 'UPDATE_STATISTICS',
  RESET_GAME: 'RESET_GAME',
  
  // Audio actions
  PLAY_MUSIC: 'PLAY_MUSIC',
  STOP_MUSIC: 'STOP_MUSIC',
  PLAY_SFX: 'PLAY_SFX',
  SET_VOLUME: 'SET_VOLUME',
  
  // Settings actions
  UPDATE_GRAPHICS_SETTINGS: 'UPDATE_GRAPHICS_SETTINGS',
  UPDATE_AUDIO_SETTINGS: 'UPDATE_AUDIO_SETTINGS',
  UPDATE_CONTROL_SETTINGS: 'UPDATE_CONTROL_SETTINGS'
};

// Reducer para manejar estado del juego
function gameReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.UPDATE_PLAYER_POSITION:
      return {
        ...state,
        player: {
          ...state.player,
          position: action.payload
        }
      };
      
    case ACTION_TYPES.UPDATE_PLAYER_VELOCITY:
      return {
        ...state,
        player: {
          ...state.player,
          velocity: action.payload
        }
      };
      
    case ACTION_TYPES.UPDATE_PLAYER_HEALTH:
      return {
        ...state,
        player: {
          ...state.player,
          health: Math.max(0, Math.min(state.player.maxHealth, action.payload)),
          isAlive: action.payload > 0
        }
      };
      
    case ACTION_TYPES.ADD_PLAYER_EXPERIENCE:
      const newExp = state.player.experience + action.payload;
      const expToNext = state.player.level * 100;
      const levelUp = newExp >= expToNext;
      
      return {
        ...state,
        player: {
          ...state.player,
          experience: levelUp ? newExp - expToNext : newExp,
          level: levelUp ? state.player.level + 1 : state.player.level
        }
      };
      
    case ACTION_TYPES.ADD_COLLECTIBLE:
      return {
        ...state,
        world: {
          ...state.world,
          collectibles: [...state.world.collectibles, action.payload]
        }
      };
      
    case ACTION_TYPES.REMOVE_COLLECTIBLE:
      return {
        ...state,
        world: {
          ...state.world,
          collectibles: state.world.collectibles.filter(
            (collectible, index) => index !== action.payload
          )
        }
      };
      
    case ACTION_TYPES.ADD_ENEMY:
      return {
        ...state,
        world: {
          ...state.world,
          enemies: [...state.world.enemies, action.payload]
        }
      };
      
    case ACTION_TYPES.REMOVE_ENEMY:
      return {
        ...state,
        world: {
          ...state.world,
          enemies: state.world.enemies.filter(
            (enemy, index) => index !== action.payload
          )
        }
      };
      
    case ACTION_TYPES.UPDATE_CAMERA_POSITION:
      return {
        ...state,
        camera: {
          ...state.camera,
          position: action.payload
        }
      };
      
    case ACTION_TYPES.SHAKE_CAMERA:
      return {
        ...state,
        camera: {
          ...state.camera,
          shakeIntensity: action.payload
        }
      };
      
    case ACTION_TYPES.UPDATE_KEYS:
      return {
        ...state,
        input: {
          ...state.input,
          keys: {
            ...state.input.keys,
            ...action.payload
          }
        }
      };
      
    case ACTION_TYPES.ADD_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, {
            id: Date.now(),
            ...action.payload
          }]
        }
      };
      
    case ACTION_TYPES.REMOVE_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(
            notification => notification.id !== action.payload
          )
        }
      };
      
    case ACTION_TYPES.SET_GAME_STATE:
      return {
        ...state,
        game: {
          ...state.game,
          state: action.payload
        }
      };
      
    case ACTION_TYPES.SET_DIFFICULTY:
      return {
        ...state,
        game: {
          ...state.game,
          difficulty: action.payload
        }
      };
      
    case ACTION_TYPES.UPDATE_SCORE:
      const newScore = state.game.score + action.payload;
      return {
        ...state,
        game: {
          ...state.game,
          score: newScore,
          highScore: Math.max(state.game.highScore, newScore)
        }
      };
      
    case ACTION_TYPES.UPDATE_OBJECTIVES:
      return {
        ...state,
        game: {
          ...state.game,
          objectives: {
            ...state.game.objectives,
            ...action.payload
          }
        }
      };
      
    case ACTION_TYPES.UPDATE_STATISTICS:
      return {
        ...state,
        game: {
          ...state.game,
          statistics: {
            ...state.game.statistics,
            ...action.payload
          }
        }
      };
      
    case ACTION_TYPES.UNLOCK_ACHIEVEMENT:
      if (!state.game.achievements.includes(action.payload)) {
        return {
          ...state,
          game: {
            ...state.game,
            achievements: [...state.game.achievements, action.payload]
          }
        };
      }
      return state;
      
    case ACTION_TYPES.RESET_GAME:
      return {
        ...initialState,
        settings: state.settings // Mantener configuraciones
      };
      
    case ACTION_TYPES.UPDATE_GRAPHICS_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          graphics: {
            ...state.settings.graphics,
            ...action.payload
          }
        }
      };
      
    case ACTION_TYPES.UPDATE_AUDIO_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          audio: {
            ...state.settings.audio,
            ...action.payload
          }
        }
      };
      
    default:
      return state;
  }
}

// Provider del contexto del juego
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Acciones helper
  const actions = {
    // Player actions
    updatePlayerPosition: (position) => 
      dispatch({ type: ACTION_TYPES.UPDATE_PLAYER_POSITION, payload: position }),
    
    updatePlayerVelocity: (velocity) => 
      dispatch({ type: ACTION_TYPES.UPDATE_PLAYER_VELOCITY, payload: velocity }),
    
    updatePlayerHealth: (health) => 
      dispatch({ type: ACTION_TYPES.UPDATE_PLAYER_HEALTH, payload: health }),
    
    addExperience: (exp) => 
      dispatch({ type: ACTION_TYPES.ADD_PLAYER_EXPERIENCE, payload: exp }),
    
    // World actions
    addCollectible: (collectible) => 
      dispatch({ type: ACTION_TYPES.ADD_COLLECTIBLE, payload: collectible }),
    
    removeCollectible: (index) => 
      dispatch({ type: ACTION_TYPES.REMOVE_COLLECTIBLE, payload: index }),
    
    addEnemy: (enemy) => 
      dispatch({ type: ACTION_TYPES.ADD_ENEMY, payload: enemy }),
    
    removeEnemy: (index) => 
      dispatch({ type: ACTION_TYPES.REMOVE_ENEMY, payload: index }),
    
    // Camera actions
    updateCameraPosition: (position) => 
      dispatch({ type: ACTION_TYPES.UPDATE_CAMERA_POSITION, payload: position }),
    
    shakeCamera: (intensity) => 
      dispatch({ type: ACTION_TYPES.SHAKE_CAMERA, payload: intensity }),
    
    // Input actions
    updateKeys: (keys) => 
      dispatch({ type: ACTION_TYPES.UPDATE_KEYS, payload: keys }),
    
    // UI actions
    addNotification: (notification) => 
      dispatch({ type: ACTION_TYPES.ADD_NOTIFICATION, payload: notification }),
    
    removeNotification: (id) => 
      dispatch({ type: ACTION_TYPES.REMOVE_NOTIFICATION, payload: id }),
    
    // Game actions
    setGameState: (state) => 
      dispatch({ type: ACTION_TYPES.SET_GAME_STATE, payload: state }),
    
    setDifficulty: (difficulty) => 
      dispatch({ type: ACTION_TYPES.SET_DIFFICULTY, payload: difficulty }),
    
    updateScore: (points) => 
      dispatch({ type: ACTION_TYPES.UPDATE_SCORE, payload: points }),
    
    updateObjectives: (objectives) => 
      dispatch({ type: ACTION_TYPES.UPDATE_OBJECTIVES, payload: objectives }),
    
    updateStatistics: (stats) => 
      dispatch({ type: ACTION_TYPES.UPDATE_STATISTICS, payload: stats }),
    
    unlockAchievement: (achievement) => 
      dispatch({ type: ACTION_TYPES.UNLOCK_ACHIEVEMENT, payload: achievement }),
    
    resetGame: () => 
      dispatch({ type: ACTION_TYPES.RESET_GAME }),
    
    // Settings actions
    updateGraphicsSettings: (settings) => 
      dispatch({ type: ACTION_TYPES.UPDATE_GRAPHICS_SETTINGS, payload: settings }),
    
    updateAudioSettings: (settings) => 
      dispatch({ type: ACTION_TYPES.UPDATE_AUDIO_SETTINGS, payload: settings })
  };

  // Cargar configuraciones guardadas
  useEffect(() => {
    const savedSettings = localStorage.getItem('crashWormSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.graphics) actions.updateGraphicsSettings(settings.graphics);
        if (settings.audio) actions.updateAudioSettings(settings.audio);
      } catch (error) {
        console.warn('Error loading saved settings:', error);
      }
    }

    const savedHighScore = localStorage.getItem('crashWormHighScore');
    if (savedHighScore) {
      dispatch({ 
        type: ACTION_TYPES.UPDATE_SCORE, 
        payload: parseInt(savedHighScore) - state.game.score 
      });
    }
  }, []);

  // Guardar configuraciones
  useEffect(() => {
    const settings = {
      graphics: state.settings.graphics,
      audio: state.settings.audio,
      controls: state.settings.controls
    };
    localStorage.setItem('crashWormSettings', JSON.stringify(settings));
  }, [state.settings]);

  // Guardar high score
  useEffect(() => {
    localStorage.setItem('crashWormHighScore', state.game.highScore.toString());
  }, [state.game.highScore]);

  const value = {
    state,
    actions,
    dispatch
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// Hook para usar el contexto
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame debe ser usado dentro de GameProvider');
  }
  return context;
}

// Hook para acciones específicas
export function useGameActions() {
  const { actions } = useGame();
  return actions;
}

// Hook para estado específico
export function useGameState() {
  const { state } = useGame();
  return state;
}

export { ACTION_TYPES };