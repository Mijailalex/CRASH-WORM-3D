import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { gameConfig } from '../data/gameConfig';

const GameContext = createContext();

const initialState = {
  score: 0,
  lives: 3,
  level: 1,
  coins: 0,
  experience: 0,
  playerPosition: [0, 0, 0],
  enemies: [],
  collectibles: [],
  platforms: [],
  gameTime: 0,
  isPlaying: false,
  isPaused: false,
  config: gameConfig
};

const gameReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_SCORE':
      return { ...state, score: action.payload };
    
    case 'ADD_SCORE':
      return { ...state, score: state.score + action.payload };
    
    case 'UPDATE_LIVES':
      return { ...state, lives: action.payload };
    
    case 'LOSE_LIFE':
      return { ...state, lives: Math.max(0, state.lives - 1) };
    
    case 'ADD_COINS':
      return { ...state, coins: state.coins + action.payload };
    
    case 'UPDATE_PLAYER_POSITION':
      return { ...state, playerPosition: action.payload };
    
    case 'UPDATE_ENEMIES':
      return { ...state, enemies: action.payload };
    
    case 'UPDATE_COLLECTIBLES':
      return { ...state, collectibles: action.payload };
    
    case 'UPDATE_PLATFORMS':
      return { ...state, platforms: action.payload };
    
    case 'INCREMENT_LEVEL':
      return { ...state, level: state.level + 1 };
    
    case 'UPDATE_GAME_TIME':
      return { ...state, gameTime: action.payload };
    
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    
    case 'SET_PAUSED':
      return { ...state, isPaused: action.payload };
    
    case 'RESET_GAME':
      return { ...initialState, config: state.config };
    
    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    
    default:
      return state;
  }
};

export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    let gameTimer;
    
    if (state.isPlaying && !state.isPaused) {
      gameTimer = setInterval(() => {
        dispatch({ type: 'UPDATE_GAME_TIME', payload: state.gameTime + 1 });
      }, 1000);
    }
    
    return () => {
      if (gameTimer) clearInterval(gameTimer);
    };
  }, [state.isPlaying, state.isPaused, state.gameTime]);

  const actions = {
    updateScore: (score) => dispatch({ type: 'UPDATE_SCORE', payload: score }),
    addScore: (points) => dispatch({ type: 'ADD_SCORE', payload: points }),
    updateLives: (lives) => dispatch({ type: 'UPDATE_LIVES', payload: lives }),
    loseLife: () => dispatch({ type: 'LOSE_LIFE' }),
    addCoins: (coins) => dispatch({ type: 'ADD_COINS', payload: coins }),
    updatePlayerPosition: (position) => dispatch({ type: 'UPDATE_PLAYER_POSITION', payload: position }),
    updateEnemies: (enemies) => dispatch({ type: 'UPDATE_ENEMIES', payload: enemies }),
    updateCollectibles: (collectibles) => dispatch({ type: 'UPDATE_COLLECTIBLES', payload: collectibles }),
    updatePlatforms: (platforms) => dispatch({ type: 'UPDATE_PLATFORMS', payload: platforms }),
    incrementLevel: () => dispatch({ type: 'INCREMENT_LEVEL' }),
    setPlaying: (playing) => dispatch({ type: 'SET_PLAYING', payload: playing }),
    setPaused: (paused) => dispatch({ type: 'SET_PAUSED', payload: paused }),
    resetGame: () => dispatch({ type: 'RESET_GAME' }),
    updateConfig: (config) => dispatch({ type: 'UPDATE_CONFIG', payload: config })
  };

  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};