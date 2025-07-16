// ========================================
// CORE GAME ENGINE - Sistema Central
// Arquitectura modular y escalable
// ========================================

class EventBus {
  constructor() {
    this.events = new Map();
  }

  subscribe(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
    
    return () => this.events.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.events.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event ${event}:`, error);
      }
    });
  }
}

class ComponentRegistry {
  constructor() {
    this.components = new Map();
    this.componentTypes = new Set();
  }

  registerComponent(name, definition) {
    this.componentTypes.add(name);
    this.components.set(name, definition);
  }

  createComponent(name, data = {}) {
    const ComponentClass = this.components.get(name);
    if (!ComponentClass) {
      throw new Error(`Component ${name} not registered`);
    }
    return new ComponentClass(data);
  }
}

class SystemManager {
  constructor(eventBus) {
    this.systems = new Map();
    this.systemOrder = [];
    this.eventBus = eventBus;
  }

  registerSystem(name, system, priority = 0) {
    system.name = name;
    system.priority = priority;
    system.eventBus = this.eventBus;
    
    this.systems.set(name, system);
    this.systemOrder.push({ name, priority });
    this.systemOrder.sort((a, b) => b.priority - a.priority);
  }

  getSystem(name) {
    return this.systems.get(name);
  }

  update(deltaTime) {
    for (const { name } of this.systemOrder) {
      const system = this.systems.get(name);
      if (system && system.enabled && typeof system.update === 'function') {
        try {
          system.update(deltaTime);
        } catch (error) {
          console.error(`Error in system ${name}:`, error);
        }
      }
    }
  }
}

class GameEngine {
  constructor(config = {}) {
    this.config = {
      maxFPS: 60,
      enableProfiling: false,
      enableErrorRecovery: true,
      ...config
    };

    // Core systems
    this.eventBus = new EventBus();
    this.componentRegistry = new ComponentRegistry();
    this.systemManager = new SystemManager(this.eventBus);
    
    // State
    this.entities = new Map();
    this.entityComponents = new Map();
    this.nextEntityId = 1;
    this.isRunning = false;
    this.isPaused = false;
    
    // Performance tracking
    this.performance = {
      frameCount: 0,
      lastFrameTime: 0,
      deltaTime: 0,
      fps: 0,
      avgFrameTime: 16.67
    };

    // Error recovery
    this.errorCount = 0;
    this.maxErrors = 10;

    this.initializeEngine();
  }

  initializeEngine() {
    this.registerCoreComponents();
    this.setupErrorHandling();
    this.eventBus.emit('engine:initialized', this);
  }

  registerCoreComponents() {
    // Transform Component
    this.componentRegistry.registerComponent('transform', class {
      constructor(data = {}) {
        this.position = data.position || { x: 0, y: 0, z: 0 };
        this.rotation = data.rotation || { x: 0, y: 0, z: 0 };
        this.scale = data.scale || { x: 1, y: 1, z: 1 };
      }
    });

    // Physics Component
    this.componentRegistry.registerComponent('physics', class {
      constructor(data = {}) {
        this.velocity = data.velocity || { x: 0, y: 0, z: 0 };
        this.acceleration = data.acceleration || { x: 0, y: 0, z: 0 };
        this.mass = data.mass || 1;
        this.friction = data.friction || 0.98;
        this.bounciness = data.bounciness || 0;
        this.isKinematic = data.isKinematic || false;
      }
    });

    // Render Component
    this.componentRegistry.registerComponent('render', class {
      constructor(data = {}) {
        this.geometry = data.geometry || 'box';
        this.material = data.material || {};
        this.visible = data.visible ?? true;
        this.castShadow = data.castShadow || false;
        this.receiveShadow = data.receiveShadow || false;
      }
    });

    // Health Component
    this.componentRegistry.registerComponent('health', class {
      constructor(data = {}) {
        this.max = data.max || 100;
        this.current = data.current || this.max;
        this.regeneration = data.regeneration || 0;
        this.invulnerabilityTime = data.invulnerabilityTime || 0;
      }
    });
  }

  setupErrorHandling() {
    if (!this.config.enableErrorRecovery) return;

    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });
  }

  handleError(error) {
    console.error('GameEngine Error:', error);
    
    this.errorCount++;
    this.eventBus.emit('engine:error', { error, count: this.errorCount });

    if (this.errorCount >= this.maxErrors) {
      console.error('Too many errors, stopping engine');
      this.stop();
      this.eventBus.emit('engine:fatal', { error, count: this.errorCount });
    }
  }

  // Entity Management
  createEntity(name = 'entity') {
    const id = this.nextEntityId++;
    const entity = {
      id,
      name: `${name}_${id}`,
      active: true,
      components: new Map()
    };
    
    this.entities.set(id, entity);
    this.entityComponents.set(id, new Map());
    
    this.eventBus.emit('entity:created', entity);
    return id;
  }

  destroyEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    // Cleanup components
    const components = this.entityComponents.get(entityId);
    if (components) {
      for (const [type, component] of components) {
        if (typeof component.destroy === 'function') {
          component.destroy();
        }
      }
    }

    this.entities.delete(entityId);
    this.entityComponents.delete(entityId);
    
    this.eventBus.emit('entity:destroyed', { entityId, entity });
    return true;
  }

  addComponent(entityId, componentType, data = {}) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const component = this.componentRegistry.createComponent(componentType, data);
    component.entityId = entityId;
    
    entity.components.set(componentType, component);
    this.entityComponents.get(entityId).set(componentType, component);
    
    this.eventBus.emit('component:added', { entityId, componentType, component });
    return component;
  }

  removeComponent(entityId, componentType) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    const component = entity.components.get(componentType);
    if (component && typeof component.destroy === 'function') {
      component.destroy();
    }

    entity.components.delete(componentType);
    this.entityComponents.get(entityId).delete(componentType);
    
    this.eventBus.emit('component:removed', { entityId, componentType });
    return true;
  }

  getComponent(entityId, componentType) {
    return this.entityComponents.get(entityId)?.get(componentType);
  }

  getEntitiesWithComponent(componentType) {
    const entities = [];
    for (const [entityId, components] of this.entityComponents) {
      if (components.has(componentType)) {
        entities.push(entityId);
      }
    }
    return entities;
  }

  // System Management
  registerSystem(name, system, priority = 0) {
    this.systemManager.registerSystem(name, system, priority);
    
    if (typeof system.initialize === 'function') {
      system.initialize(this);
    }
  }

  getSystem(name) {
    return this.systemManager.getSystem(name);
  }

  // Main Loop
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    this.performance.lastFrameTime = performance.now();
    
    this.eventBus.emit('engine:started');
    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
    this.eventBus.emit('engine:stopped');
  }

  pause() {
    this.isPaused = true;
    this.eventBus.emit('engine:paused');
  }

  resume() {
    this.isPaused = false;
    this.performance.lastFrameTime = performance.now();
    this.eventBus.emit('engine:resumed');
  }

  gameLoop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    this.performance.deltaTime = currentTime - this.performance.lastFrameTime;
    this.performance.lastFrameTime = currentTime;
    
    // Calculate FPS
    this.performance.frameCount++;
    if (this.performance.frameCount % 60 === 0) {
      this.performance.fps = 1000 / this.performance.deltaTime;
      this.performance.avgFrameTime = this.performance.deltaTime;
    }

    if (!this.isPaused) {
      try {
        this.update(this.performance.deltaTime);
      } catch (error) {
        this.handleError(error);
      }
    }

    requestAnimationFrame(this.gameLoop);
  }

  update(deltaTime) {
    // Limit delta time to prevent spiral of death
    const clampedDelta = Math.min(deltaTime, 33.33); // Max 30 FPS
    
    this.systemManager.update(clampedDelta);
    this.eventBus.emit('engine:update', clampedDelta);
  }

  // Utility methods
  getPerformanceStats() {
    return {
      ...this.performance,
      entityCount: this.entities.size,
      systemCount: this.systemManager.systems.size
    };
  }

  dispose() {
    this.stop();
    
    // Cleanup all entities
    for (const entityId of this.entities.keys()) {
      this.destroyEntity(entityId);
    }
    
    // Cleanup systems
    for (const system of this.systemManager.systems.values()) {
      if (typeof system.dispose === 'function') {
        system.dispose();
      }
    }
    
    this.eventBus.emit('engine:disposed');
  }
}

export { GameEngine, EventBus, ComponentRegistry, SystemManager };