
// ========================================
// HOOKS PERSONALIZADOS COMPLETOS
// useGameEngine, useAudioManager, useNetworkSync
// ========================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameEngine } from '../core/GameEngine';
import { useGame } from '../context/GameContext';
import * as Tone from 'tone';

// ========================================
// HOOK useGameEngine
// Ubicación: src/hooks/useGameEngine.js
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

// ========================================
// FUNCIÓN registerGameSystems
// ========================================

export async function registerGameSystems(gameEngine) {
  // Importaciones dinámicas para evitar dependencias circulares
  const { AdvancedPhysicsSystem, AISystem, ProceduralSystem } = await import('../core/AdvancedSystems');
  const { PerformanceManager, VFXSystem, ResourceManager } = await import('../core/PerformanceAndEffects');
  const { SecurityManager, NetworkManager } = await import('../core/SecurityNetworking');
  
  // Registrar sistemas avanzados
  gameEngine.addSystem('advancedPhysics', new AdvancedPhysicsSystem());
  gameEngine.addSystem('ai', new AISystem());
  gameEngine.addSystem('procedural', new ProceduralSystem());
  gameEngine.addSystem('performance', new PerformanceManager());
  gameEngine.addSystem('vfx', new VFXSystem());
  gameEngine.addSystem('resources', new ResourceManager());
  gameEngine.addSystem('security', new SecurityManager());
  gameEngine.addSystem('network', new NetworkManager());

  console.log('✅ Sistemas del juego registrados');
}

// ========================================
// FUNCIÓN setupEngineEvents
// ========================================

export function setupEngineEvents(gameEngine, actions) {
  // Eventos del jugador
  gameEngine.on('playerMove', (data) => {
    actions.updatePlayerPosition(data.position);
  });

  gameEngine.on('playerJump', () => {
    actions.setPlayerState('jumping');
  });

  gameEngine.on('playerLand', () => {
    actions.setPlayerState('grounded');
  });

  // Eventos de colisión
  gameEngine.on('collectItem', (item) => {
    actions.collectItem(item);
  });

  gameEngine.on('hitEnemy', (enemy) => {
    actions.takeDamage(enemy.damage);
  });

  // Eventos del juego
  gameEngine.on('levelComplete', () => {
    actions.completeLevel();
  });

  gameEngine.on('gameOver', () => {
    actions.gameOver();
  });

  console.log('✅ Event listeners configurados');
}