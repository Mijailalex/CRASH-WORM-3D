/* ============================================================================ */
/* 🎮 CRASH WORM 3D - GAME CONTEXT PROVIDER */
/* ============================================================================ */
/* Ubicación: src/context/GameContext.jsx */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { gameConfig } from '../data/gameConfig';

// ========================================
// 🎯 INITIAL STATE
// ========================================

const initialState = {
  // Game state
  gameState: 'MAIN_MENU', // MAIN_MENU, LOADING, PLAYING, PAUSED, GAME_OVER
  currentLevel: 1,
  difficulty: 'normal',
  mode: 'classic', // classic, competitive, survival, private

  // Player state
  player: {
    id: null,
    name: 'Player',
    position: { x: 0, y: 0, z: 0 },
    health: 100,
    lives: 3,
    score: 0,
    coins: 0,
    powerUps: [],
    level: 1,
    experience: 0
  },

  // Room/Multiplayer state
  room: {
    id: null,
    name: '',
    players: [],
    maxPlayers: 16,
    isPrivate: false,
    host: null
  },

  // Game settings
  settings: {
    audio: {
      masterVolume: 0.8,
      musicVolume: 0.6,
      sfxVolume: 0.8,
      ambientVolume: 0.4,
      muted: false
    },
    graphics: {
      quality: 'high', // low, medium, high, ultra
      shadows: true,
      particles: true,
      postProcessing: true,
      antialiasing: true,
      textureQuality: 'high'
    },
    controls: {
      mouseSensitivity: 0.5,
      invertY: false,
      keyBindings: {
        moveForward: 'KeyW',
        moveBackward: 'KeyS',
        moveLeft: 'KeyA',
        moveRight: 'KeyD',
        jump: 'Space',
        run: 'ShiftLeft',
        inventory: 'KeyI',
        pause: 'Escape'
      }
    },
    gameplay: {
      autoSave: true,
      showHints: true,
      showDamageNumbers: true,
      showMinimap: true,
      cameraShake: true
    }
  },

  // UI state
  ui: {
    showFPS: false,
    showDebugInfo: false,
    showChat: false,
    showInventory: false,
    showPauseMenu: false,
    showSettings: false,
    notifications: []
  },

  // Performance state
  performance: {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    drawCalls: 0,
    triangles: 0
  },

  // Error state
  errors: [],
  warnings: []
};

// ========================================
// 🔄 ACTION TYPES
// ========================================

export const ACTIONS = {
  // Game actions
  SET_GAME_STATE: 'SET_GAME_STATE',
  SET_CURRENT_LEVEL: 'SET_CURRENT_LEVEL',
  SET_DIFFICULTY: 'SET_DIFFICULTY',
  SET_MODE: 'SET_MODE',

  // Player actions
  UPDATE_PLAYER: 'UPDATE_PLAYER',
  SET_PLAYER_POSITION: 'SET_PLAYER_POSITION',
  ADD_SCORE: 'ADD_SCORE',
  ADD_COINS: 'ADD_COINS',
  TAKE_DAMAGE: 'TAKE_DAMAGE',
  HEAL_PLAYER: 'HEAL_PLAYER',
  ADD_POWER_UP: 'ADD_POWER_UP',
  REMOVE_POWER_UP: 'REMOVE_POWER_UP',
  LEVEL_UP: 'LEVEL_UP',
  LOSE_LIFE: 'LOSE_LIFE',

  // Room actions
  JOIN_ROOM: 'JOIN_ROOM',
  LEAVE_ROOM: 'LEAVE_ROOM',
  UPDATE_ROOM: 'UPDATE_ROOM',
  ADD_PLAYER_TO_ROOM: 'ADD_PLAYER_TO_ROOM',
  REMOVE_PLAYER_FROM_ROOM: 'REMOVE_PLAYER_FROM_ROOM',

  // Settings actions
  UPDATE_AUDIO_SETTINGS: 'UPDATE_AUDIO_SETTINGS',
  UPDATE_GRAPHICS_SETTINGS: 'UPDATE_GRAPHICS_SETTINGS',
  UPDATE_CONTROLS_SETTINGS: 'UPDATE_CONTROLS_SETTINGS',
  UPDATE_GAMEPLAY_SETTINGS: 'UPDATE_GAMEPLAY_SETTINGS',

  // UI actions
  TOGGLE_UI: 'TOGGLE_UI',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  HIDE_NOTIFICATION: 'HIDE_NOTIFICATION',

  // Performance actions
  UPDATE_PERFORMANCE: 'UPDATE_PERFORMANCE',

  // Error actions
  ADD_ERROR: 'ADD_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  ADD_WARNING: 'ADD_WARNING',
  CLEAR_WARNINGS: 'CLEAR_WARNINGS'
};

// ========================================
// 🔄 REDUCER
// ========================================

function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_GAME_STATE:
      return { ...state, gameState: action.payload };

    case ACTIONS.SET_CURRENT_LEVEL:
      return { ...state, currentLevel: action.payload };

    case ACTIONS.SET_DIFFICULTY:
      return { ...state, difficulty: action.payload };

    case ACTIONS.SET_MODE:
      return { ...state, mode: action.payload };

    case ACTIONS.UPDATE_PLAYER:
      return {
        ...state,
        player: { ...state.player, ...action.payload }
      };

    case ACTIONS.SET_PLAYER_POSITION:
      return {
        ...state,
        player: {
          ...state.player,
          position: action.payload
        }
      };

    case ACTIONS.ADD_SCORE:
      return {
        ...state,
        player: {
          ...state.player,
          score: state.player.score + action.payload
        }
      };

    case ACTIONS.ADD_COINS:
      return {
        ...state,
        player: {
          ...state.player,
          coins: state.player.coins + action.payload
        }
      };

    case ACTIONS.TAKE_DAMAGE:
      const newHealth = Math.max(0, state.player.health - action.payload);
      return {
        ...state,
        player: {
          ...state.player,
          health: newHealth
        }
      };

    case ACTIONS.HEAL_PLAYER:
      return {
        ...state,
        player: {
          ...state.player,
          health: Math.min(100, state.player.health + action.payload)
        }
      };

    case ACTIONS.ADD_POWER_UP:
      return {
        ...state,
        player: {
          ...state.player,
          powerUps: [...state.player.powerUps, action.payload]
        }
      };

    case ACTIONS.REMOVE_POWER_UP:
      return {
        ...state,
        player: {
          ...state.player,
          powerUps: state.player.powerUps.filter(p => p.id !== action.payload)
        }
      };

    case ACTIONS.LEVEL_UP:
      return {
        ...state,
        player: {
          ...state.player,
          level: state.player.level + 1,
          experience: 0
        }
      };

    case ACTIONS.LOSE_LIFE:
      return {
        ...state,
        player: {
          ...state.player,
          lives: Math.max(0, state.player.lives - 1),
          health: 100 // Reset health on life loss
        }
      };

    case ACTIONS.JOIN_ROOM:
      return {
        ...state,
        room: action.payload
      };

    case ACTIONS.LEAVE_ROOM:
      return {
        ...state,
        room: {
          id: null,
          name: '',
          players: [],
          maxPlayers: 16,
          isPrivate: false,
          host: null
        }
      };

    case ACTIONS.UPDATE_ROOM:
      return {
        ...state,
        room: { ...state.room, ...action.payload }
      };

    case ACTIONS.ADD_PLAYER_TO_ROOM:
      return {
        ...state,
        room: {
          ...state.room,
          players: [...state.room.players, action.payload]
        }
      };

    case ACTIONS.REMOVE_PLAYER_FROM_ROOM:
      return {
        ...state,
        room: {
          ...state.room,
          players: state.room.players.filter(p => p.id !== action.payload)
        }
      };

    case ACTIONS.UPDATE_AUDIO_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          audio: { ...state.settings.audio, ...action.payload }
        }
      };

    case ACTIONS.UPDATE_GRAPHICS_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          graphics: { ...state.settings.graphics, ...action.payload }
        }
      };

    case ACTIONS.UPDATE_CONTROLS_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          controls: { ...state.settings.controls, ...action.payload }
        }
      };

    case ACTIONS.UPDATE_GAMEPLAY_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          gameplay: { ...state.settings.gameplay, ...action.payload }
        }
      };

    case ACTIONS.TOGGLE_UI:
      return {
        ...state,
        ui: {
          ...state.ui,
          [action.payload.key]: action.payload.value !== undefined
            ? action.payload.value
            : !state.ui[action.payload.key]
        }
      };

    case ACTIONS.SHOW_NOTIFICATION:
      const notification = {
        id: Date.now() + Math.random(),
        ...action.payload,
        timestamp: Date.now()
      };
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, notification]
        }
      };

    case ACTIONS.HIDE_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload)
        }
      };

    case ACTIONS.UPDATE_PERFORMANCE:
      return {
        ...state,
        performance: { ...state.performance, ...action.payload }
      };

    case ACTIONS.ADD_ERROR:
      return {
        ...state,
        errors: [...state.errors, {
          id: Date.now() + Math.random(),
          ...action.payload,
          timestamp: Date.now()
        }]
      };

    case ACTIONS.CLEAR_ERRORS:
      return { ...state, errors: [] };

    case ACTIONS.ADD_WARNING:
      return {
        ...state,
        warnings: [...state.warnings, {
          id: Date.now() + Math.random(),
          ...action.payload,
          timestamp: Date.now()
        }]
      };

    case ACTIONS.CLEAR_WARNINGS:
      return { ...state, warnings: [] };

    default:
      return state;
  }
}

// ========================================
// 🎯 CONTEXT CREATION
// ========================================

const GameContext = createContext(null);

// ========================================
// 🎮 PROVIDER COMPONENT
// ========================================

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // ========================================
  // 💾 PERSISTENCE
  // ========================================

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('crashWorm3D_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({
          type: ACTIONS.UPDATE_AUDIO_SETTINGS,
          payload: settings.audio || {}
        });
        dispatch({
          type: ACTIONS.UPDATE_GRAPHICS_SETTINGS,
          payload: settings.graphics || {}
        });
        dispatch({
          type: ACTIONS.UPDATE_CONTROLS_SETTINGS,
          payload: settings.controls || {}
        });
        dispatch({
          type: ACTIONS.UPDATE_GAMEPLAY_SETTINGS,
          payload: settings.gameplay || {}
        });
      } catch (error) {
        console.warn('Failed to load settings:', error);
      }
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('crashWorm3D_settings', JSON.stringify(state.settings));
  }, [state.settings]);

  // ========================================
  // 🎮 ACTION CREATORS
  // ========================================

  const actions = useMemo(() => ({
    // Game actions
    setGameState: (gameState) => dispatch({ type: ACTIONS.SET_GAME_STATE, payload: gameState }),
    setCurrentLevel: (level) => dispatch({ type: ACTIONS.SET_CURRENT_LEVEL, payload: level }),
    setDifficulty: (difficulty) => dispatch({ type: ACTIONS.SET_DIFFICULTY, payload: difficulty }),
    setMode: (mode) => dispatch({ type: ACTIONS.SET_MODE, payload: mode }),

    // Player actions
    updatePlayer: (playerData) => dispatch({ type: ACTIONS.UPDATE_PLAYER, payload: playerData }),
    setPlayerPosition: (position) => dispatch({ type: ACTIONS.SET_PLAYER_POSITION, payload: position }),
    addScore: (points) => dispatch({ type: ACTIONS.ADD_SCORE, payload: points }),
    addCoins: (coins) => dispatch({ type: ACTIONS.ADD_COINS, payload: coins }),
    takeDamage: (damage) => dispatch({ type: ACTIONS.TAKE_DAMAGE, payload: damage }),
    healPlayer: (amount) => dispatch({ type: ACTIONS.HEAL_PLAYER, payload: amount }),
    addPowerUp: (powerUp) => dispatch({ type: ACTIONS.ADD_POWER_UP, payload: powerUp }),
    removePowerUp: (powerUpId) => dispatch({ type: ACTIONS.REMOVE_POWER_UP, payload: powerUpId }),
    levelUp: () => dispatch({ type: ACTIONS.LEVEL_UP }),
    loseLife: () => dispatch({ type: ACTIONS.LOSE_LIFE }),

    // Room actions
    joinRoom: (room) => dispatch({ type: ACTIONS.JOIN_ROOM, payload: room }),
    leaveRoom: () => dispatch({ type: ACTIONS.LEAVE_ROOM }),
    updateRoom: (roomData) => dispatch({ type: ACTIONS.UPDATE_ROOM, payload: roomData }),
    addPlayerToRoom: (player) => dispatch({ type: ACTIONS.ADD_PLAYER_TO_ROOM, payload: player }),
    removePlayerFromRoom: (playerId) => dispatch({ type: ACTIONS.REMOVE_PLAYER_FROM_ROOM, payload: playerId }),

    // Settings actions
    updateAudioSettings: (settings) => dispatch({ type: ACTIONS.UPDATE_AUDIO_SETTINGS, payload: settings }),
    updateGraphicsSettings: (settings) => dispatch({ type: ACTIONS.UPDATE_GRAPHICS_SETTINGS, payload: settings }),
    updateControlsSettings: (settings) => dispatch({ type: ACTIONS.UPDATE_CONTROLS_SETTINGS, payload: settings }),
    updateGameplaySettings: (settings) => dispatch({ type: ACTIONS.UPDATE_GAMEPLAY_SETTINGS, payload: settings }),

    // UI actions
    toggleUI: (key, value) => dispatch({ type: ACTIONS.TOGGLE_UI, payload: { key, value } }),
    showNotification: (notification) => dispatch({ type: ACTIONS.SHOW_NOTIFICATION, payload: notification }),
    hideNotification: (id) => dispatch({ type: ACTIONS.HIDE_NOTIFICATION, payload: id }),

    // Performance actions
    updatePerformance: (performanceData) => dispatch({ type: ACTIONS.UPDATE_PERFORMANCE, payload: performanceData }),

    // Error actions
    addError: (error) => dispatch({ type: ACTIONS.ADD_ERROR, payload: error }),
    clearErrors: () => dispatch({ type: ACTIONS.CLEAR_ERRORS }),
    addWarning: (warning) => dispatch({ type: ACTIONS.ADD_WARNING, payload: warning }),
    clearWarnings: () => dispatch({ type: ACTIONS.CLEAR_WARNINGS })
  }), []);

  // ========================================
  // 🔄 AUTO CLEANUP
  // ========================================

  // Auto-remove old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      state.ui.notifications.forEach(notification => {
        if (notification.autoHide !== false && now - notification.timestamp > (notification.duration || 5000)) {
          actions.hideNotification(notification.id);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.ui.notifications, actions]);

  // ========================================
  // 🎯 CONTEXT VALUE
  // ========================================

  const contextValue = useMemo(() => ({
    ...state,
    ...actions,
    dispatch
  }), [state, actions]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

// ========================================
// 🪝 CUSTOM HOOK
// ========================================

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
