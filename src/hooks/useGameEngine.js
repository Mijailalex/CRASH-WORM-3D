// Sistema de hooks para el motor del juego
// ========================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameEngine } from '../core/GameEngine';
import { useGame } from '../context/GameContext';

// ========================================
// HOOK useGameEngine
// ========================================

export function useGameEngine(config = {}) {
  const [gameEngine] = useState(() => new GameEngine(config));
  const [isEngineReady, setIsEngineReady] = useState(false);
  const { state, actions } = useGame();

  // Inicializar motor del juego
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        // Registrar sistemas del juego
        await registerGameSystems(gameEngine);
        
        // Configurar event listeners
        setupEngineEvents(gameEngine, actions);
        
        setIsEngineReady(true);
        console.log('🎮 GameEngine inicializado correctamente');
      } catch (error) {
        console.error('❌ Error inicializando GameEngine:', error);
      }
    };

    initializeEngine();

    return () => {
      gameEngine.dispose();
    };
  }, []);

  // Funciones del motor
  const createEntity = useCallback((name) => {
    return gameEngine.createEntity(name);
  }, [gameEngine]);

  const updateEntity = useCallback((entityId, updates) => {
    const entity = gameEngine.entities.get(entityId);
    if (entity) {
      Object.assign(entity, updates);
      return true;
    }
    return false;
  }, [gameEngine]);

  const destroyEntity = useCallback((entityId) => {
    return gameEngine.destroyEntity(entityId);
  }, [gameEngine]);

  const addComponent = useCallback((entityId, componentType, data) => {
    return gameEngine.addComponent(entityId, componentType, data);
  }, [gameEngine]);

  const getComponent = useCallback((entityId, componentType) => {
    return gameEngine.getComponent(entityId, componentType);
  }, [gameEngine]);

  const getEntitiesWithComponent = useCallback((componentType) => {
    return gameEngine.getEntitiesWithComponent(componentType);
  }, [gameEngine]);

  return {
    gameEngine,
    isEngineReady,
    createEntity,
    updateEntity,
    destroyEntity,
    addComponent,
    getComponent,
    getEntitiesWithComponent
  };
}