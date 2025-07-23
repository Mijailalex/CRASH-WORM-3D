/* ============================================================================ */
/* 🎮 CRASH WORM 3D - HOOK DEL MOTOR DE JUEGO */
/* ============================================================================ */

import { useEffect, useRef, useCallback, useState } from 'react';
import { GameEngine } from '@/core/GameEngine';
import { gameConfig } from '@/data/gameConfig';

// ========================================
// 🎯 HOOK PRINCIPAL DEL GAME ENGINE
// ========================================

export function useGameEngine(config = {}) {
  const engineRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [performance, setPerformance] = useState({});
  const systemsRef = useRef(new Map());

  // Inicializar engine
  useEffect(() => {
    if (!engineRef.current) {
      const engineConfig = {
        ...gameConfig.performance,
        ...config
      };

      engineRef.current = new GameEngine(engineConfig);

      // Registrar sistemas básicos
      registerGameSystems(engineRef.current);

      // Setup event listeners
      setupEngineEvents(engineRef.current, setPerformance);

      setIsInitialized(true);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, [config]);

  // API del engine
  const engine = useCallback(() => engineRef.current, []);

  const createEntity = useCallback((name) => {
    return engineRef.current?.createEntity(name);
  }, []);

  const destroyEntity = useCallback((id) => {
    return engineRef.current?.destroyEntity(id);
  }, []);

  const addComponent = useCallback((entityId, type, data) => {
    return engineRef.current?.addComponent(entityId, type, data);
  }, []);

  const getComponent = useCallback((entityId, type) => {
    return engineRef.current?.getComponent(entityId, type);
  }, []);

  const getEntitiesWithComponent = useCallback((type) => {
    return engineRef.current?.getEntitiesWithComponent(type) || [];
  }, []);

  const startEngine = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const stopEngine = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const pauseEngine = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resumeEngine = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  return {
    engine,
    isInitialized,
    performance,
    createEntity,
    destroyEntity,
    addComponent,
    getComponent,
    getEntitiesWithComponent,
    startEngine,
    stopEngine,
    pauseEngine,
    resumeEngine
  };
}

// ========================================
// ⚙️ REGISTRO DE SISTEMAS
// ========================================

export function registerGameSystems(engine) {
  // Input System
  const InputSystem = {
    name: 'InputSystem',
    enabled: true,
    keys: new Set(),

    initialize(gameEngine) {
      this.setupInputListeners();
    },

    setupInputListeners() {
      document.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
      });

      document.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });
    },

    update(deltaTime, entities) {
      const inputEntities = [];
      for (const [id, entity] of entities) {
        const input = entity.components.get('input');
        if (input && entity.active) {
          // Update input component with current keys
          input.keys = new Set(this.keys);
          inputEntities.push(id);
        }
      }
    }
  };

  // Physics System
  const PhysicsSystem = {
    name: 'PhysicsSystem',
    enabled: true,
    gravity: gameConfig.world.gravity,

    update(deltaTime, entities) {
      for (const [id, entity] of entities) {
        if (!entity.active) continue;

        const transform = entity.components.get('transform');
        const physics = entity.components.get('physics');

        if (transform && physics) {
          // Apply gravity
          if (physics.useGravity && !physics.isKinematic) {
            physics.acceleration.y += this.gravity * deltaTime;
          }

          // Update velocity
          physics.velocity.x += physics.acceleration.x * deltaTime;
          physics.velocity.y += physics.acceleration.y * deltaTime;
          physics.velocity.z += physics.acceleration.z * deltaTime;

          // Apply friction
          const friction = physics.isGrounded ? physics.groundFriction : physics.airFriction;
          physics.velocity.x *= friction;
          physics.velocity.z *= friction;

          // Clamp velocity
          physics.velocity.x = Math.max(-physics.maxVelocity.x,
            Math.min(physics.maxVelocity.x, physics.velocity.x));
          physics.velocity.y = Math.max(-physics.maxVelocity.y,
            Math.min(physics.maxVelocity.y, physics.velocity.y));
          physics.velocity.z = Math.max(-physics.maxVelocity.z,
            Math.min(physics.maxVelocity.z, physics.velocity.z));

          // Update position
          transform.position.x += physics.velocity.x * deltaTime;
          transform.position.y += physics.velocity.y * deltaTime;
          transform.position.z += physics.velocity.z * deltaTime;

          // Reset acceleration
          physics.acceleration.x = 0;
          physics.acceleration.y = 0;
          physics.acceleration.z = 0;
        }
      }
    }
  };

  // Health System
  const HealthSystem = {
    name: 'HealthSystem',
    enabled: true,

    update(deltaTime, entities) {
      for (const [id, entity] of entities) {
        if (!entity.active) continue;

        const health = entity.components.get('health');
        if (health && !health.isDead) {
          // Regenerate health
          if (health.regeneration > 0) {
            health.heal(health.regeneration * deltaTime);
          }
        }
      }
    }
  };

  // Animation System
  const AnimationSystem = {
    name: 'AnimationSystem',
    enabled: true,

    update(deltaTime, entities) {
      for (const [id, entity] of entities) {
        if (!entity.active) continue;

        const animation = entity.components.get('animation');
        if (animation && animation.currentAnimation) {
          animation.animationTime += deltaTime * animation.playbackSpeed;

          const currentAnim = animation.animations.get(animation.currentAnimation);
          if (currentAnim) {
            if (animation.animationTime >= currentAnim.duration) {
              if (animation.loop) {
                animation.animationTime = 0;
              } else {
                animation.stop();
              }
            }
          }
        }
      }
    }
  };

  // Movement System
  const MovementSystem = {
    name: 'MovementSystem',
    enabled: true,

    update(deltaTime, entities) {
      for (const [id, entity] of entities) {
        if (!entity.active) continue;

        const transform = entity.components.get('transform');
        const physics = entity.components.get('physics');
        const input = entity.components.get('input');

        if (transform && physics && input) {
          const speed = gameConfig.player.speed;

          // Movement input
          if (input.isKeyPressed('KeyA') || input.isKeyPressed('ArrowLeft')) {
            physics.addForce(-speed, 0, 0);
          }
          if (input.isKeyPressed('KeyD') || input.isKeyPressed('ArrowRight')) {
            physics.addForce(speed, 0, 0);
          }

          // Jump input
          if ((input.isKeyPressed('Space') || input.isKeyPressed('KeyW')) && physics.isGrounded) {
            physics.velocity.y = gameConfig.player.jumpForce;
            physics.isGrounded = false;
          }
        }
      }
    }
  };

  // Collision System
  const CollisionSystem = {
    name: 'CollisionSystem',
    enabled: true,

    update(deltaTime, entities) {
      const colliderEntities = [];

      // Collect all entities with colliders
      for (const [id, entity] of entities) {
        if (entity.active && entity.components.has('collider') && entity.components.has('transform')) {
          colliderEntities.push(id);
        }
      }

      // Check collisions between all entities
      for (let i = 0; i < colliderEntities.length; i++) {
        for (let j = i + 1; j < colliderEntities.length; j++) {
          const entityA = entities.get(colliderEntities[i]);
          const entityB = entities.get(colliderEntities[j]);

          if (this.checkCollision(entityA, entityB)) {
            this.handleCollision(entityA, entityB);
          }
        }
      }
    },

    checkCollision(entityA, entityB) {
      const transformA = entityA.components.get('transform');
      const transformB = entityB.components.get('transform');
      const colliderA = entityA.components.get('collider');
      const colliderB = entityB.components.get('collider');

      // Simple box collision for now
      const aabb1 = {
        min: {
          x: transformA.position.x - colliderA.size.x / 2,
          y: transformA.position.y - colliderA.size.y / 2,
          z: transformA.position.z - colliderA.size.z / 2
        },
        max: {
          x: transformA.position.x + colliderA.size.x / 2,
          y: transformA.position.y + colliderA.size.y / 2,
          z: transformA.position.z + colliderA.size.z / 2
        }
      };

      const aabb2 = {
        min: {
          x: transformB.position.x - colliderB.size.x / 2,
          y: transformB.position.y - colliderB.size.y / 2,
          z: transformB.position.z - colliderB.size.z / 2
        },
        max: {
          x: transformB.position.x + colliderB.size.x / 2,
          y: transformB.position.y + colliderB.size.y / 2,
          z: transformB.position.z + colliderB.size.z / 2
        }
      };

      return (aabb1.min.x <= aabb2.max.x && aabb1.max.x >= aabb2.min.x &&
              aabb1.min.y <= aabb2.max.y && aabb1.max.y >= aabb2.min.y &&
              aabb1.min.z <= aabb2.max.z && aabb1.max.z >= aabb2.min.z);
    },

    handleCollision(entityA, entityB) {
      const colliderA = entityA.components.get('collider');
      const colliderB = entityB.components.get('collider');

      // Emit collision events
      if (this.eventBus) {
        this.eventBus.emit('collision:detected', {
          entityA: entityA.id,
          entityB: entityB.id,
          isTriggerA: colliderA.isTrigger,
          isTriggerB: colliderB.isTrigger
        });
      }

      // Handle physics response if not triggers
      if (!colliderA.isTrigger && !colliderB.isTrigger) {
        this.resolveCollision(entityA, entityB);
      }
    },

    resolveCollision(entityA, entityB) {
      const transformA = entityA.components.get('transform');
      const transformB = entityB.components.get('transform');
      const physicsA = entityA.components.get('physics');
      const physicsB = entityB.components.get('physics');

      if (physicsA && !physicsA.isKinematic) {
        // Simple separation for now
        const dx = transformA.position.x - transformB.position.x;
        const dy = transformA.position.y - transformB.position.y;
        const dz = transformA.position.z - transformB.position.z;

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > 0) {
          const separationForce = 0.1;
          transformA.position.x += (dx / distance) * separationForce;
          transformA.position.y += (dy / distance) * separationForce;
          transformA.position.z += (dz / distance) * separationForce;
        }

        // Check ground collision
        if (dy > 0 && Math.abs(physicsA.velocity.y) < 0.1) {
          physicsA.isGrounded = true;
          physicsA.velocity.y = 0;
        }
      }
    }
  };

  // Render System
  const RenderSystem = {
    name: 'RenderSystem',
    enabled: true,

    update(deltaTime, entities) {
      // This will be handled by Three.js/React Three Fiber
      // But we can update render-related properties here
      for (const [id, entity] of entities) {
        if (!entity.active) continue;

        const render = entity.components.get('render');
        if (render) {
          // Update render properties based on other components
          const health = entity.components.get('health');
          if (health) {
            // Flash when damaged
            if (health.isInvulnerable()) {
              render.opacity = Math.sin(performance.now() * 0.01) * 0.5 + 0.5;
            } else {
              render.opacity = 1.0;
            }
          }
        }
      }
    }
  };

  // Register all systems
  engine.registerSystem('InputSystem', InputSystem, 100);
  engine.registerSystem('MovementSystem', MovementSystem, 90);
  engine.registerSystem('PhysicsSystem', PhysicsSystem, 80);
  engine.registerSystem('CollisionSystem', CollisionSystem, 70);
  engine.registerSystem('HealthSystem', HealthSystem, 60);
  engine.registerSystem('AnimationSystem', AnimationSystem, 50);
  engine.registerSystem('RenderSystem', RenderSystem, 10);
}

// ========================================
// 📡 SETUP DE EVENTOS
// ========================================

export function setupEngineEvents(engine, setPerformance) {
  // Performance monitoring
  engine.eventBus.subscribe('engine:update', () => {
    setPerformance(engine.getPerformanceStats());
  });

  // Error handling
  engine.eventBus.subscribe('engine:error', ({ error, count }) => {
    console.error(`Engine Error ${count}:`, error);
  });

  // Entity lifecycle
  engine.eventBus.subscribe('entity:created', (entity) => {
    console.log(`Entity created: ${entity.name} (${entity.id})`);
  });

  engine.eventBus.subscribe('entity:destroyed', ({ entityId, entity }) => {
    console.log(`Entity destroyed: ${entity.name} (${entityId})`);
  });

  // Collision events
  engine.eventBus.subscribe('collision:detected', ({ entityA, entityB }) => {
    console.log(`Collision between entities ${entityA} and ${entityB}`);
  });

  // System events
  engine.eventBus.subscribe('system:registered', ({ name }) => {
    console.log(`System registered: ${name}`);
  });

  // Engine lifecycle
  engine.eventBus.subscribe('engine:started', () => {
    console.log('Game Engine started');
  });

  engine.eventBus.subscribe('engine:stopped', () => {
    console.log('Game Engine stopped');
  });

  engine.eventBus.subscribe('engine:paused', () => {
    console.log('Game Engine paused');
  });

  engine.eventBus.subscribe('engine:resumed', () => {
    console.log('Game Engine resumed');
  });
}

export default useGameEngine;
