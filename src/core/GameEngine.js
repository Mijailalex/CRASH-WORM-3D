// ========================================
// MOTOR PRINCIPAL DEL JUEGO
// Arquitectura modular y escalable
// ========================================

import * as THREE from 'three';
import { EventEmitter } from 'events';

export class GameEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      targetFPS: config.targetFPS || 60,
      maxDeltaTime: config.maxDeltaTime || 0.1,
      enableProfiling: config.enableProfiling || false,
      autoGC: config.autoGC || true,
      ...config
    };

    // Sistemas principales
    this.systems = new Map();
    this.entities = new Map();
    this.components = new Map();
    
    // Estado del motor
    this.isRunning = false;
    this.isPaused = false;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.totalTime = 0;
    this.frameCount = 0;
    
    // Métricas de rendimiento
    this.performance = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      drawCalls: 0,
      triangles: 0
    };

    // Pool de objetos para optimización
    this.objectPools = new Map();
    
    this.init();
  }

  init() {
    this.setupPerformanceMonitoring();
    this.setupGarbageCollection();
    
    console.log('🎮 Game Engine initialized');
    this.emit('engineInit');
  }

  // ========================================
  // GESTIÓN DE SISTEMAS
  // ========================================

  registerSystem(name, system) {
    if (this.systems.has(name)) {
      console.warn(`Sistema ${name} ya existe, sobrescribiendo...`);
    }
    
    system.engine = this;
    this.systems.set(name, system);
    
    if (typeof system.init === 'function') {
      system.init();
    }
    
    console.log(`📦 Sistema ${name} registrado`);
    this.emit('systemRegistered', { name, system });
  }

  getSystem(name) {
    return this.systems.get(name);
  }

  removeSystem(name) {
    const system = this.systems.get(name);
    if (system && typeof system.destroy === 'function') {
      system.destroy();
    }
    this.systems.delete(name);
    this.emit('systemRemoved', { name });
  }

  // ========================================
  // GESTIÓN DE ENTIDADES (ECS Pattern)
  // ========================================

  createEntity(id = null) {
    const entityId = id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entity = {
      id: entityId,
      components: new Set(),
      active: true,
      created: Date.now()
    };
    
    this.entities.set(entityId, entity);
    this.emit('entityCreated', entity);
    
    return entityId;
  }

  destroyEntity(entityId) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    // Remover todos los componentes
    for (const componentType of entity.components) {
      this.removeComponent(entityId, componentType);
    }

    this.entities.delete(entityId);
    this.emit('entityDestroyed', { entityId });
    
    return true;
  }

  addComponent(entityId, componentType, componentData = {}) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      console.error(`Entidad ${entityId} no encontrada`);
      return false;
    }

    if (!this.components.has(componentType)) {
      this.components.set(componentType, new Map());
    }

    const component = {
      type: componentType,
      entityId,
      data: { ...componentData },
      created: Date.now()
    };

    this.components.get(componentType).set(entityId, component);
    entity.components.add(componentType);
    
    this.emit('componentAdded', { entityId, componentType, component });
    
    return true;
  }

  removeComponent(entityId, componentType) {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    const componentMap = this.components.get(componentType);
    if (componentMap && componentMap.has(entityId)) {
      const component = componentMap.get(entityId);
      componentMap.delete(entityId);
      entity.components.delete(componentType);
      
      this.emit('componentRemoved', { entityId, componentType, component });
      return true;
    }
    
    return false;
  }

  getComponent(entityId, componentType) {
    const componentMap = this.components.get(componentType);
    return componentMap ? componentMap.get(entityId) : null;
  }

  getEntitiesWithComponents(...componentTypes) {
    const entities = [];
    
    for (const [entityId, entity] of this.entities) {
      if (entity.active && componentTypes.every(type => entity.components.has(type))) {
        entities.push(entityId);
      }
    }
    
    return entities;
  }

  // ========================================
  // OBJECT POOLING
  // ========================================

  createPool(type, factory, initialSize = 10) {
    const pool = {
      type,
      factory,
      available: [],
      used: new Set()
    };

    // Crear objetos iniciales
    for (let i = 0; i < initialSize; i++) {
      const obj = factory();
      obj._poolType = type;
      pool.available.push(obj);
    }

    this.objectPools.set(type, pool);
    console.log(`🏊 Pool ${type} creado con ${initialSize} objetos`);
  }

  getFromPool(type) {
    const pool = this.objectPools.get(type);
    if (!pool) {
      console.error(`Pool ${type} no encontrado`);
      return null;
    }

    let obj;
    if (pool.available.length > 0) {
      obj = pool.available.pop();
    } else {
      obj = pool.factory();
      obj._poolType = type;
      console.log(`🆕 Nuevo objeto creado para pool ${type}`);
    }

    pool.used.add(obj);
    
    // Resetear objeto si tiene método reset
    if (typeof obj.reset === 'function') {
      obj.reset();
    }

    return obj;
  }

  returnToPool(obj) {
    if (!obj || !obj._poolType) return false;

    const pool = this.objectPools.get(obj._poolType);
    if (!pool || !pool.used.has(obj)) return false;

    pool.used.delete(obj);
    pool.available.push(obj);

    return true;
  }

  // ========================================
  // LOOP PRINCIPAL DEL JUEGO
  // ========================================

  start() {
    if (this.isRunning) {
      console.warn('El motor ya está ejecutándose');
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    
    console.log('🚀 Motor iniciado');
    this.emit('engineStart');
    
    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️ Motor detenido');
    this.emit('engineStop');
  }

  pause() {
    this.isPaused = true;
    console.log('⏸️ Motor pausado');
    this.emit('enginePause');
  }

  resume() {
    this.isPaused = false;
    this.lastTime = performance.now(); // Resetear tiempo para evitar saltos
    console.log('▶️ Motor reanudado');
    this.emit('engineResume');
  }

  gameLoop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, this.config.maxDeltaTime);
    this.lastTime = currentTime;
    this.totalTime += this.deltaTime;
    this.frameCount++;

    // Actualizar métricas cada segundo
    if (this.frameCount % 60 === 0) {
      this.updatePerformanceMetrics();
    }

    if (!this.isPaused) {
      this.update(this.deltaTime);
      this.render();
    }

    // Garbage collection automático
    if (this.config.autoGC && this.frameCount % 1800 === 0) { // Cada 30 segundos a 60fps
      this.performGarbageCollection();
    }

    requestAnimationFrame(this.gameLoop);
  };

  update(deltaTime) {
    this.emit('preUpdate', deltaTime);

    // Actualizar todos los sistemas
    for (const [name, system] of this.systems) {
      if (system.active !== false && typeof system.update === 'function') {
        try {
          system.update(deltaTime);
        } catch (error) {
          console.error(`Error en sistema ${name}:`, error);
          this.emit('systemError', { name, error });
        }
      }
    }

    this.emit('postUpdate', deltaTime);
  }

  render() {
    this.emit('preRender');

    // Renderizar todos los sistemas que lo requieran
    for (const [name, system] of this.systems) {
      if (system.active !== false && typeof system.render === 'function') {
        try {
          system.render();
        } catch (error) {
          console.error(`Error renderizando sistema ${name}:`, error);
          this.emit('renderError', { name, error });
        }
      }
    }

    this.emit('postRender');
  }

  // ========================================
  // MONITOREO DE RENDIMIENTO
  // ========================================

  setupPerformanceMonitoring() {
    if (!this.config.enableProfiling) return;

    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.name === 'frame') {
          this.performance.frameTime = entry.duration;
        }
      }
    });

    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
  }

  updatePerformanceMetrics() {
    this.performance.fps = Math.round(60 / (this.deltaTime * 60));
    this.performance.frameTime = this.deltaTime * 1000;

    // Métricas de memoria si están disponibles
    if (performance.memory) {
      this.performance.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    this.emit('performanceUpdate', this.performance);

    // Log de rendimiento crítico
    if (this.performance.fps < 30) {
      console.warn(`⚠️ FPS bajo detectado: ${this.performance.fps}`);
      this.emit('lowPerformance', this.performance);
    }
  }

  // ========================================
  // GESTIÓN DE MEMORIA
  // ========================================

  setupGarbageCollection() {
    // Limpieza periódica de entidades inactivas
    setInterval(() => {
      this.cleanupInactiveEntities();
    }, 30000); // Cada 30 segundos
  }

  cleanupInactiveEntities() {
    let cleaned = 0;
    const maxAge = 300000; // 5 minutos
    const currentTime = Date.now();

    for (const [entityId, entity] of this.entities) {
      if (!entity.active && (currentTime - entity.created) > maxAge) {
        this.destroyEntity(entityId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Limpieza automática: ${cleaned} entidades removidas`);
    }
  }

  performGarbageCollection() {
    // Limpieza de pools
    for (const [type, pool] of this.objectPools) {
      if (pool.available.length > 50) { // Mantener máximo 50 objetos disponibles
        pool.available.splice(50);
        console.log(`🗑️ Pool ${type} reducido`);
      }
    }

    // Forzar garbage collection si está disponible
    if (window.gc) {
      window.gc();
    }

    this.emit('garbageCollection');
  }

  // ========================================
  // UTILIDADES Y HERRAMIENTAS
  // ========================================

  getEngineStats() {
    return {
      entities: this.entities.size,
      systems: this.systems.size,
      components: Array.from(this.components.values()).reduce((sum, map) => sum + map.size, 0),
      pools: this.objectPools.size,
      performance: { ...this.performance },
      uptime: this.totalTime,
      frameCount: this.frameCount
    };
  }

  exportState() {
    const state = {
      entities: Array.from(this.entities.entries()),
      components: Array.from(this.components.entries()).map(([type, map]) => [
        type, Array.from(map.entries())
      ]),
      timestamp: Date.now()
    };

    return JSON.stringify(state);
  }

  importState(stateJson) {
    try {
      const state = JSON.parse(stateJson);
      
      // Limpiar estado actual
      this.entities.clear();
      this.components.clear();

      // Restaurar entidades
      for (const [entityId, entity] of state.entities) {
        this.entities.set(entityId, entity);
      }

      // Restaurar componentes
      for (const [type, components] of state.components) {
        const componentMap = new Map(components);
        this.components.set(type, componentMap);
      }

      console.log('📥 Estado importado exitosamente');
      this.emit('stateImported');
      return true;
    } catch (error) {
      console.error('❌ Error importando estado:', error);
      return false;
    }
  }

  // ========================================
  // LIMPIEZA Y DESTRUCCIÓN
  // ========================================

  destroy() {
    this.stop();

    // Destruir todos los sistemas
    for (const [name, system] of this.systems) {
      this.removeSystem(name);
    }

    // Limpiar entidades
    this.entities.clear();
    this.components.clear();
    this.objectPools.clear();

    // Remover listeners
    this.removeAllListeners();

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    console.log('🧹 Motor destruido y limpiado');
  }
}

// ========================================
// SISTEMA BASE ABSTRACTO
// ========================================

export class BaseSystem {
  constructor(name, priority = 0) {
    this.name = name;
    this.priority = priority;
    this.active = true;
    this.engine = null;
  }

  init() {
    // Implementar en sistemas específicos
  }

  update(deltaTime) {
    // Implementar en sistemas específicos
  }

  render() {
    // Implementar en sistemas específicos si es necesario
  }

  destroy() {
    // Limpieza específica del sistema
  }

  // Utilidades comunes
  getEntitiesWithComponents(...componentTypes) {
    return this.engine ? this.engine.getEntitiesWithComponents(...componentTypes) : [];
  }

  getComponent(entityId, componentType) {
    return this.engine ? this.engine.getComponent(entityId, componentType) : null;
  }

  emit(event, data) {
    if (this.engine) {
      this.engine.emit(event, data);
    }
  }
}

// ========================================
// FACTORY DE SISTEMAS COMUNES
// ========================================

export class SystemFactory {
  static createPhysicsSystem() {
    return new class extends BaseSystem {
      constructor() {
        super('physics', 10);
        this.gravity = -9.81;
        this.timeStep = 1/60;
      }

      update(deltaTime) {
        const entities = this.getEntitiesWithComponents('transform', 'rigidbody');
        
        for (const entityId of entities) {
          const transform = this.getComponent(entityId, 'transform');
          const rigidbody = this.getComponent(entityId, 'rigidbody');

          if (!transform || !rigidbody) continue;

          // Aplicar gravedad
          if (rigidbody.data.useGravity) {
            rigidbody.data.velocity.y += this.gravity * deltaTime;
          }

          // Actualizar posición
          transform.data.position.x += rigidbody.data.velocity.x * deltaTime;
          transform.data.position.y += rigidbody.data.velocity.y * deltaTime;
          transform.data.position.z += rigidbody.data.velocity.z * deltaTime;

          // Aplicar fricción
          const friction = rigidbody.data.friction || 0.9;
          rigidbody.data.velocity.x *= friction;
          rigidbody.data.velocity.z *= friction;
        }
      }
    };
  }

  static createRenderSystem() {
    return new class extends BaseSystem {
      constructor() {
        super('render', 1000);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }

      init() {
        document.body.appendChild(this.renderer.domElement);
        
        // Configurar iluminación básica
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
      }

      render() {
        this.renderer.render(this.scene, this.camera);
      }

      destroy() {
        if (this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
      }
    };
  }

  static createAudioSystem() {
    return new class extends BaseSystem {
      constructor() {
        super('audio', 5);
        this.sounds = new Map();
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.audioContext = null;
      }

      init() {
        try {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log('🔊 Sistema de audio inicializado');
        } catch (error) {
          console.warn('⚠️ Audio no disponible:', error);
        }
      }

      playSound(soundId, volume = 1.0, loop = false) {
        const sound = this.sounds.get(soundId);
        if (sound && this.audioContext) {
          const source = this.audioContext.createBufferSource();
          const gainNode = this.audioContext.createGain();
          
          source.buffer = sound;
          source.loop = loop;
          gainNode.gain.value = volume * this.sfxVolume;
          
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          source.start();
          
          return source;
        }
        return null;
      }

      loadSound(soundId, url) {
        if (!this.audioContext) return Promise.reject('Audio context not available');

        return fetch(url)
          .then(response => response.arrayBuffer())
          .then(data => this.audioContext.decodeAudioData(data))
          .then(buffer => {
            this.sounds.set(soundId, buffer);
            console.log(`🎵 Audio ${soundId} cargado`);
          })
          .catch(error => {
            console.error(`❌ Error cargando audio ${soundId}:`, error);
          });
      }

      destroy() {
        if (this.audioContext) {
          this.audioContext.close();
        }
        this.sounds.clear();
      }
    };
  }
}

export default GameEngine;