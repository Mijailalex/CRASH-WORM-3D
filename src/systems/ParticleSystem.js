// ========================================
// SISTEMA DE PARTÍCULAS AVANZADO
// Sistema de efectos visuales y partículas 3D optimizado
// ========================================

import * as THREE from 'three';
import { BaseSystem } from '../core/GameEngine.js';

export class ParticleSystem extends BaseSystem {
  constructor(config = {}) {
    super('particles', 25);
    
    this.config = {
      maxParticles: config.maxParticles || 10000,
      poolSize: config.poolSize || 5000,
      enableGPUParticles: config.enableGPUParticles !== false,
      enableCollisions: config.enableCollisions || false,
      enablePhysics: config.enablePhysics || false,
      qualityLevel: config.qualityLevel || 'high', // low, medium, high, ultra
      autoCleanup: config.autoCleanup !== false,
      debugMode: config.debugMode || false,
      ...config
    };

    // Gestión de sistemas de partículas
    this.particleSystems = new Map();
    this.emitters = new Map();
    this.templates = new Map();
    
    // Pool de partículas para optimización
    this.particlePool = [];
    this.activeParticles = [];
    this.emitterPool = [];
    
    // Materiales y geometrías cacheadas
    this.materialCache = new Map();
    this.geometryCache = new Map();
    this.textureCache = new Map();
    
    // Sistema de LOD para partículas
    this.lodManager = {
      distances: [50, 150, 300, 600],
      qualityLevels: [1.0, 0.7, 0.4, 0.1, 0.0],
      currentLevel: 0
    };
    
    // Métricas de rendimiento
    this.metrics = {
      activeParticles: 0,
      activeSystems: 0,
      particlesPerSecond: 0,
      drawCalls: 0,
      memoryUsage: 0,
      processingTime: 0,
      culledParticles: 0
    };
    
    // Configuraciones de calidad
    this.qualitySettings = {
      low: { maxParticles: 1000, enableShadows: false, enableCollisions: false },
      medium: { maxParticles: 3000, enableShadows: false, enableCollisions: false },
      high: { maxParticles: 7000, enableShadows: true, enableCollisions: true },
      ultra: { maxParticles: 15000, enableShadows: true, enableCollisions: true }
    };
    
    this.init();
  }

  init() {
    this.setupParticlePool();
    this.loadParticleTemplates();
    this.setupMaterialCache();
    this.setupQualitySettings();
    
    console.log('✨ Sistema de partículas inicializado');
  }

  // ========================================
  // CONFIGURACIÓN INICIAL
  // ========================================

  setupParticlePool() {
    // Crear pool de partículas para reutilización
    for (let i = 0; i < this.config.poolSize; i++) {
      const particle = {
        id: `particle_${i}`,
        active: false,
        
        // Propiedades de posición y movimiento
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        acceleration: new THREE.Vector3(),
        
        // Propiedades visuales
        size: 1.0,
        color: new THREE.Color(1, 1, 1),
        opacity: 1.0,
        rotation: 0,
        rotationSpeed: 0,
        
        // Propiedades de tiempo de vida
        life: 1.0,
        maxLife: 1.0,
        age: 0,
        
        // Propiedades de animación
        startSize: 1.0,
        endSize: 1.0,
        startColor: new THREE.Color(1, 1, 1),
        endColor: new THREE.Color(1, 1, 1),
        startOpacity: 1.0,
        endOpacity: 0.0,
        
        // Propiedades físicas
        mass: 1.0,
        drag: 0.0,
        bounce: 0.0,
        gravity: 0.0,
        
        // Referencias
        systemId: null,
        emitterId: null,
        materialId: null,
        
        // Funciones de actualización
        updateFunction: null,
        renderFunction: null
      };
      
      this.particlePool.push(particle);
    }
    
    console.log(`✨ Pool de ${this.config.poolSize} partículas creado`);
  }

  loadParticleTemplates() {
    // Plantilla de Fuego
    this.templates.set('fire', {
      name: 'Fuego',
      emission: {
        rate: 50,
        burst: 0,
        duration: -1, // Infinito
        prewarm: false
      },
      shape: {
        type: 'cone',
        radius: 2,
        angle: 15,
        length: 5
      },
      velocity: {
        startSpeed: { min: 5, max: 15 },
        direction: { x: 0, y: 1, z: 0 },
        randomDirection: 0.3,
        gravity: -2
      },
      size: {
        startSize: { min: 0.5, max: 2.0 },
        endSize: { min: 0.1, max: 0.5 },
        sizeOverLife: 'decreasing'
      },
      color: {
        startColor: { r: 1.0, g: 0.8, b: 0.2 },
        endColor: { r: 0.8, g: 0.1, b: 0.0 },
        colorOverLife: 'gradient'
      },
      opacity: {
        startOpacity: 0.8,
        endOpacity: 0.0,
        opacityOverLife: 'fadeOut'
      },
      life: {
        startLife: { min: 1.0, max: 3.0 },
        damping: 0.98
      },
      material: {
        type: 'sprite',
        texture: 'fire_particle.png',
        blending: THREE.AdditiveBlending,
        transparent: true
      },
      physics: {
        gravity: -9.81,
        drag: 0.02,
        turbulence: 0.1
      }
    });

    // Plantilla de Humo
    this.templates.set('smoke', {
      name: 'Humo',
      emission: {
        rate: 20,
        burst: 0,
        duration: -1
      },
      shape: {
        type: 'circle',
        radius: 1,
        height: 0
      },
      velocity: {
        startSpeed: { min: 2, max: 8 },
        direction: { x: 0, y: 1, z: 0 },
        randomDirection: 0.5,
        gravity: -1
      },
      size: {
        startSize: { min: 1.0, max: 2.0 },
        endSize: { min: 3.0, max: 6.0 },
        sizeOverLife: 'increasing'
      },
      color: {
        startColor: { r: 0.3, g: 0.3, b: 0.3 },
        endColor: { r: 0.7, g: 0.7, b: 0.7 },
        colorOverLife: 'gradient'
      },
      opacity: {
        startOpacity: 0.6,
        endOpacity: 0.0,
        opacityOverLife: 'fadeOut'
      },
      life: {
        startLife: { min: 3.0, max: 6.0 },
        damping: 0.99
      },
      material: {
        type: 'sprite',
        texture: 'smoke_particle.png',
        blending: THREE.NormalBlending,
        transparent: true
      },
      physics: {
        gravity: -2,
        drag: 0.05,
        turbulence: 0.3
      }
    });

    // Plantilla de Explosión
    this.templates.set('explosion', {
      name: 'Explosión',
      emission: {
        rate: 0,
        burst: 100,
        duration: 0.1,
        prewarm: false
      },
      shape: {
        type: 'sphere',
        radius: 0.5
      },
      velocity: {
        startSpeed: { min: 10, max: 30 },
        direction: 'radial',
        randomDirection: 0.2,
        gravity: -5
      },
      size: {
        startSize: { min: 0.2, max: 1.0 },
        endSize: { min: 0.1, max: 0.3 },
        sizeOverLife: 'decreasing'
      },
      color: {
        startColor: { r: 1.0, g: 1.0, b: 0.8 },
        endColor: { r: 1.0, g: 0.2, b: 0.0 },
        colorOverLife: 'gradient'
      },
      opacity: {
        startOpacity: 1.0,
        endOpacity: 0.0,
        opacityOverLife: 'fadeOut'
      },
      life: {
        startLife: { min: 0.5, max: 2.0 },
        damping: 0.95
      },
      material: {
        type: 'sprite',
        texture: 'explosion_particle.png',
        blending: THREE.AdditiveBlending,
        transparent: true
      },
      physics: {
        gravity: -9.81,
        drag: 0.03,
        turbulence: 0.05
      }
    });

    // Plantilla de Chispas
    this.templates.set('sparks', {
      name: 'Chispas',
      emission: {
        rate: 80,
        burst: 0,
        duration: -1
      },
      shape: {
        type: 'point'
      },
      velocity: {
        startSpeed: { min: 5, max: 20 },
        direction: 'random',
        randomDirection: 1.0,
        gravity: -15
      },
      size: {
        startSize: { min: 0.1, max: 0.3 },
        endSize: { min: 0.05, max: 0.1 },
        sizeOverLife: 'decreasing'
      },
      color: {
        startColor: { r: 1.0, g: 0.9, b: 0.3 },
        endColor: { r: 0.8, g: 0.2, b: 0.0 },
        colorOverLife: 'gradient'
      },
      opacity: {
        startOpacity: 1.0,
        endOpacity: 0.0,
        opacityOverLife: 'fadeOut'
      },
      life: {
        startLife: { min: 0.3, max: 1.5 },
        damping: 0.98
      },
      material: {
        type: 'point',
        texture: 'spark_particle.png',
        blending: THREE.AdditiveBlending,
        transparent: true
      },
      physics: {
        gravity: -9.81,
        drag: 0.01,
        bounce: 0.3
      }
    });

    // Plantilla de Agua
    this.templates.set('water', {
      name: 'Agua',
      emission: {
        rate: 100,
        burst: 0,
        duration: -1
      },
      shape: {
        type: 'cone',
        radius: 1,
        angle: 30,
        length: 2
      },
      velocity: {
        startSpeed: { min: 8, max: 15 },
        direction: { x: 0, y: 1, z: 0 },
        randomDirection: 0.2,
        gravity: -20
      },
      size: {
        startSize: { min: 0.2, max: 0.5 },
        endSize: { min: 0.1, max: 0.2 },
        sizeOverLife: 'decreasing'
      },
      color: {
        startColor: { r: 0.3, g: 0.6, b: 1.0 },
        endColor: { r: 0.1, g: 0.3, b: 0.8 },
        colorOverLife: 'stable'
      },
      opacity: {
        startOpacity: 0.7,
        endOpacity: 0.0,
        opacityOverLife: 'fadeOut'
      },
      life: {
        startLife: { min: 1.0, max: 3.0 },
        damping: 0.99
      },
      material: {
        type: 'sprite',
        texture: 'water_particle.png',
        blending: THREE.NormalBlending,
        transparent: true
      },
      physics: {
        gravity: -9.81,
        drag: 0.02,
        bounce: 0.1,
        collision: true
      }
    });

    // Plantilla de Magia
    this.templates.set('magic', {
      name: 'Efecto Mágico',
      emission: {
        rate: 30,
        burst: 0,
        duration: -1
      },
      shape: {
        type: 'spiral',
        radius: 3,
        height: 5,
        turns: 2
      },
      velocity: {
        startSpeed: { min: 3, max: 8 },
        direction: 'spiral',
        randomDirection: 0.1,
        gravity: 0
      },
      size: {
        startSize: { min: 0.3, max: 0.8 },
        endSize: { min: 0.1, max: 0.3 },
        sizeOverLife: 'pulse'
      },
      color: {
        startColor: { r: 0.5, g: 0.2, b: 1.0 },
        endColor: { r: 0.8, g: 0.6, b: 1.0 },
        colorOverLife: 'rainbow'
      },
      opacity: {
        startOpacity: 0.8,
        endOpacity: 0.0,
        opacityOverLife: 'fadeOut'
      },
      life: {
        startLife: { min: 2.0, max: 4.0 },
        damping: 1.0
      },
      material: {
        type: 'sprite',
        texture: 'magic_particle.png',
        blending: THREE.AdditiveBlending,
        transparent: true
      },
      physics: {
        gravity: 0,
        drag: 0.01,
        turbulence: 0.2
      }
    });

    console.log(`✨ ${this.templates.size} plantillas de partículas cargadas`);
  }

  setupMaterialCache() {
    // Crear materiales base
    const spriteMaterial = new THREE.SpriteMaterial({
      color: 0xffffff,
      transparent: true,
      blending: THREE.NormalBlending,
      alphaTest: 0.01
    });
    this.materialCache.set('sprite_default', spriteMaterial);

    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.0,
      transparent: true,
      blending: THREE.NormalBlending,
      alphaTest: 0.01,
      sizeAttenuation: true
    });
    this.materialCache.set('points_default', pointsMaterial);

    // Crear geometrías base
    const pointGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.config.maxParticles * 3);
    const colors = new Float32Array(this.config.maxParticles * 3);
    const sizes = new Float32Array(this.config.maxParticles);
    
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pointGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    this.geometryCache.set('points_buffer', pointGeometry);
  }

  setupQualitySettings() {
    const settings = this.qualitySettings[this.config.qualityLevel];
    if (settings) {
      this.config.maxParticles = Math.min(this.config.maxParticles, settings.maxParticles);
      this.config.enableShadows = settings.enableShadows;
      this.config.enableCollisions = settings.enableCollisions;
    }
  }

  // ========================================
  // GESTIÓN DE SISTEMAS DE PARTÍCULAS
  // ========================================

  createParticleSystem(id, templateId, config = {}) {
    const template = this.templates.get(templateId);
    if (!template) {
      console.error(`Plantilla de partículas '${templateId}' no encontrada`);
      return null;
    }

    const system = {
      id,
      templateId,
      template: { ...template },
      
      // Estado del sistema
      active: true,
      paused: false,
      loop: config.loop !== false,
      
      // Posición y transformación
      position: new THREE.Vector3(config.x || 0, config.y || 0, config.z || 0),
      rotation: new THREE.Euler(config.rotX || 0, config.rotY || 0, config.rotZ || 0),
      scale: config.scale || 1.0,
      
      // Control de emisión
      emissionRate: template.emission.rate,
      emissionAccumulator: 0,
      emissionTime: 0,
      duration: template.emission.duration,
      maxParticles: config.maxParticles || 1000,
      
      // Partículas del sistema
      particles: [],
      deadParticles: [],
      
      // Configuración específica
      config: { ...config },
      
      // Objetos Three.js
      group: new THREE.Group(),
      pointsSystem: null,
      spritesSystem: null,
      
      // Métricas
      particlesEmitted: 0,
      particlesActive: 0,
      
      // Callbacks
      onComplete: config.onComplete || null,
      onParticleSpawn: config.onParticleSpawn || null,
      onParticleDeath: config.onParticleDeath || null
    };

    // Configurar objetos de renderizado
    this.setupSystemRendering(system);
    
    // Agregar al motor de renderizado
    const renderEngine = this.engine.getSystem('render');
    if (renderEngine) {
      renderEngine.getScene().add(system.group);
    }

    this.particleSystems.set(id, system);
    console.log(`✨ Sistema de partículas '${id}' creado`);
    
    return system;
  }

  setupSystemRendering(system) {
    const template = system.template;
    
    if (template.material.type === 'sprite') {
      // Sistema basado en sprites individuales
      system.spritesSystem = new THREE.Group();
      system.group.add(system.spritesSystem);
    } else if (template.material.type === 'point') {
      // Sistema basado en points (más eficiente para muchas partículas)
      const geometry = this.geometryCache.get('points_buffer').clone();
      const material = this.createPointsMaterial(template);
      
      system.pointsSystem = new THREE.Points(geometry, material);
      system.group.add(system.pointsSystem);
    }
  }

  createPointsMaterial(template) {
    const material = new THREE.PointsMaterial({
      color: template.color.startColor ? 
        new THREE.Color(template.color.startColor.r, template.color.startColor.g, template.color.startColor.b) :
        0xffffff,
      size: template.size.startSize.max || 1.0,
      transparent: true,
      blending: template.material.blending || THREE.NormalBlending,
      alphaTest: 0.01,
      sizeAttenuation: true,
      vertexColors: true
    });

    // Cargar textura si está especificada
    if (template.material.texture) {
      const texture = this.loadTexture(template.material.texture);
      material.map = texture;
    }

    return material;
  }

  destroyParticleSystem(id) {
    const system = this.particleSystems.get(id);
    if (!system) return false;

    // Devolver partículas al pool
    system.particles.forEach(particle => {
      this.returnParticleToPool(particle);
    });

    // Remover del motor de renderizado
    const renderEngine = this.engine.getSystem('render');
    if (renderEngine && system.group) {
      renderEngine.getScene().remove(system.group);
    }

    // Limpiar objetos Three.js
    if (system.pointsSystem) {
      system.pointsSystem.geometry.dispose();
      system.pointsSystem.material.dispose();
    }

    if (system.spritesSystem) {
      system.spritesSystem.clear();
    }

    this.particleSystems.delete(id);
    console.log(`✨ Sistema de partículas '${id}' destruido`);
    
    return true;
  }

  // ========================================
  // GESTIÓN DE PARTÍCULAS
  // ========================================

  getParticleFromPool() {
    for (let i = 0; i < this.particlePool.length; i++) {
      const particle = this.particlePool[i];
      if (!particle.active) {
        particle.active = true;
        return particle;
      }
    }
    
    // Pool agotado, crear nueva partícula si hay espacio
    if (this.activeParticles.length < this.config.maxParticles) {
      const particle = this.createNewParticle();
      this.particlePool.push(particle);
      particle.active = true;
      return particle;
    }
    
    return null; // No hay partículas disponibles
  }

  createNewParticle() {
    return {
      id: `particle_${this.particlePool.length}`,
      active: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      acceleration: new THREE.Vector3(),
      size: 1.0,
      color: new THREE.Color(1, 1, 1),
      opacity: 1.0,
      rotation: 0,
      rotationSpeed: 0,
      life: 1.0,
      maxLife: 1.0,
      age: 0,
      startSize: 1.0,
      endSize: 1.0,
      startColor: new THREE.Color(1, 1, 1),
      endColor: new THREE.Color(1, 1, 1),
      startOpacity: 1.0,
      endOpacity: 0.0,
      mass: 1.0,
      drag: 0.0,
      bounce: 0.0,
      gravity: 0.0,
      systemId: null,
      emitterId: null,
      materialId: null,
      updateFunction: null,
      renderFunction: null
    };
  }

  returnParticleToPool(particle) {
    particle.active = false;
    particle.systemId = null;
    particle.emitterId = null;
    particle.updateFunction = null;
    particle.renderFunction = null;
    
    // Resetear propiedades
    particle.position.set(0, 0, 0);
    particle.velocity.set(0, 0, 0);
    particle.acceleration.set(0, 0, 0);
    particle.size = 1.0;
    particle.color.setRGB(1, 1, 1);
    particle.opacity = 1.0;
    particle.rotation = 0;
    particle.rotationSpeed = 0;
    particle.life = 1.0;
    particle.age = 0;
  }

  emitParticle(systemId, overrides = {}) {
    const system = this.particleSystems.get(systemId);
    if (!system || !system.active || system.paused) return null;

    const particle = this.getParticleFromPool();
    if (!particle) return null;

    const template = system.template;
    
    // Configurar partícula según plantilla
    this.initializeParticle(particle, system, template, overrides);
    
    // Agregar a sistema
    system.particles.push(particle);
    system.particlesActive++;
    system.particlesEmitted++;
    
    // Crear objeto visual
    this.createParticleVisual(particle, system);
    
    // Callback de spawn
    if (system.onParticleSpawn) {
      system.onParticleSpawn(particle, system);
    }
    
    return particle;
  }

  initializeParticle(particle, system, template, overrides) {
    // Posición inicial
    const emissionShape = template.shape;
    const spawnPos = this.calculateSpawnPosition(emissionShape, system.position);
    particle.position.copy(spawnPos);
    
    // Velocidad inicial
    const velocity = this.calculateInitialVelocity(template.velocity, system);
    particle.velocity.copy(velocity);
    
    // Propiedades visuales
    particle.startSize = this.randomRange(template.size.startSize);
    particle.endSize = this.randomRange(template.size.endSize);
    particle.size = particle.startSize;
    
    if (template.color.startColor) {
      particle.startColor.setRGB(
        template.color.startColor.r,
        template.color.startColor.g,
        template.color.startColor.b
      );
    }
    
    if (template.color.endColor) {
      particle.endColor.setRGB(
        template.color.endColor.r,
        template.color.endColor.g,
        template.color.endColor.b
      );
    }
    
    particle.color.copy(particle.startColor);
    
    particle.startOpacity = template.opacity.startOpacity;
    particle.endOpacity = template.opacity.endOpacity;
    particle.opacity = particle.startOpacity;
    
    // Tiempo de vida
    particle.maxLife = this.randomRange(template.life.startLife);
    particle.life = particle.maxLife;
    particle.age = 0;
    
    // Propiedades físicas
    particle.mass = template.physics?.mass || 1.0;
    particle.drag = template.physics?.drag || 0.0;
    particle.bounce = template.physics?.bounce || 0.0;
    particle.gravity = template.physics?.gravity || 0.0;
    
    // Rotación
    particle.rotation = Math.random() * Math.PI * 2;
    particle.rotationSpeed = (Math.random() - 0.5) * 0.1;
    
    // Referencias
    particle.systemId = system.id;
    
    // Aplicar overrides
    Object.assign(particle, overrides);
  }

  calculateSpawnPosition(shape, systemPos) {
    const pos = new THREE.Vector3();
    
    switch (shape.type) {
      case 'point':
        pos.copy(systemPos);
        break;
        
      case 'circle':
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * shape.radius;
        pos.set(
          systemPos.x + Math.cos(angle) * radius,
          systemPos.y,
          systemPos.z + Math.sin(angle) * radius
        );
        break;
        
      case 'sphere':
        const phi = Math.random() * Math.PI * 2;
        const costheta = Math.random() * 2 - 1;
        const theta = Math.acos(costheta);
        const r = Math.random() * shape.radius;
        
        pos.set(
          systemPos.x + r * Math.sin(theta) * Math.cos(phi),
          systemPos.y + r * Math.sin(theta) * Math.sin(phi),
          systemPos.z + r * Math.cos(theta)
        );
        break;
        
      case 'cone':
        const coneAngle = Math.random() * Math.PI * 2;
        const coneRadius = Math.random() * shape.radius;
        const coneHeight = Math.random() * shape.length;
        
        pos.set(
          systemPos.x + Math.cos(coneAngle) * coneRadius,
          systemPos.y + coneHeight,
          systemPos.z + Math.sin(coneAngle) * coneRadius
        );
        break;
        
      case 'box':
        pos.set(
          systemPos.x + (Math.random() - 0.5) * shape.width,
          systemPos.y + (Math.random() - 0.5) * shape.height,
          systemPos.z + (Math.random() - 0.5) * shape.depth
        );
        break;
        
      default:
        pos.copy(systemPos);
    }
    
    return pos;
  }

  calculateInitialVelocity(velocityConfig, system) {
    const velocity = new THREE.Vector3();
    const speed = this.randomRange(velocityConfig.startSpeed);
    
    let direction = new THREE.Vector3();
    
    if (velocityConfig.direction === 'radial') {
      // Dirección radial desde el centro del sistema
      direction.copy(system.position).normalize();
    } else if (velocityConfig.direction === 'random') {
      // Dirección completamente aleatoria
      direction.set(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
    } else if (typeof velocityConfig.direction === 'object') {
      // Dirección específica
      direction.set(
        velocityConfig.direction.x,
        velocityConfig.direction.y,
        velocityConfig.direction.z
      ).normalize();
    }
    
    // Aplicar aleatorización
    if (velocityConfig.randomDirection > 0) {
      direction.x += (Math.random() - 0.5) * velocityConfig.randomDirection;
      direction.y += (Math.random() - 0.5) * velocityConfig.randomDirection;
      direction.z += (Math.random() - 0.5) * velocityConfig.randomDirection;
      direction.normalize();
    }
    
    velocity.copy(direction).multiplyScalar(speed);
    
    return velocity;
  }

  createParticleVisual(particle, system) {
    const template = system.template;
    
    if (template.material.type === 'sprite') {
      // Crear sprite individual
      const material = this.createSpriteMaterial(template);
      const sprite = new THREE.Sprite(material);
      
      sprite.position.copy(particle.position);
      sprite.scale.setScalar(particle.size);
      sprite.material.opacity = particle.opacity;
      sprite.material.color.copy(particle.color);
      
      particle.visual = sprite;
      system.spritesSystem.add(sprite);
      
    } else if (template.material.type === 'point') {
      // Actualizar buffer de points
      this.updatePointsBuffer(system);
    }
  }

  createSpriteMaterial(template) {
    const cacheKey = `sprite_${template.material.texture || 'default'}_${template.material.blending}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey).clone();
    }
    
    const material = new THREE.SpriteMaterial({
      transparent: true,
      blending: template.material.blending || THREE.NormalBlending,
      alphaTest: 0.01
    });
    
    if (template.material.texture) {
      material.map = this.loadTexture(template.material.texture);
    }
    
    this.materialCache.set(cacheKey, material);
    return material.clone();
  }

  updatePointsBuffer(system) {
    if (!system.pointsSystem) return;
    
    const geometry = system.pointsSystem.geometry;
    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.color.array;
    const sizes = geometry.attributes.size.array;
    
    for (let i = 0; i < system.particles.length; i++) {
      const particle = system.particles[i];
      const index = i * 3;
      
      // Posición
      positions[index] = particle.position.x;
      positions[index + 1] = particle.position.y;
      positions[index + 2] = particle.position.z;
      
      // Color
      colors[index] = particle.color.r;
      colors[index + 1] = particle.color.g;
      colors[index + 2] = particle.color.b;
      
      // Tamaño
      sizes[i] = particle.size;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    
    geometry.setDrawRange(0, system.particles.length);
  }

  // ========================================
  // ACTUALIZACIÓN PRINCIPAL
  // ========================================

  update(deltaTime) {
    if (!this.engine) return;
    
    const startTime = performance.now();
    
    // Actualizar todos los sistemas
    for (const [systemId, system] of this.particleSystems) {
      this.updateParticleSystem(system, deltaTime);
    }
    
    // Actualizar métricas
    this.updateMetrics();
    
    // Limpieza automática
    if (this.config.autoCleanup) {
      this.performCleanup();
    }
    
    const endTime = performance.now();
    this.metrics.processingTime = endTime - startTime;
  }

  updateParticleSystem(system, deltaTime) {
    if (!system.active || system.paused) return;
    
    const deltaTimeSeconds = deltaTime / 1000;
    
    // Actualizar tiempo de emisión
    system.emissionTime += deltaTime;
    
    // Emitir nuevas partículas
    if (system.emissionRate > 0 && 
        (system.duration < 0 || system.emissionTime < system.duration)) {
      
      system.emissionAccumulator += system.emissionRate * deltaTimeSeconds;
      
      while (system.emissionAccumulator >= 1.0 && 
             system.particles.length < system.maxParticles) {
        this.emitParticle(system.id);
        system.emissionAccumulator -= 1.0;
      }
    }
    
    // Actualizar partículas existentes
    const deadParticles = [];
    
    for (let i = system.particles.length - 1; i >= 0; i--) {
      const particle = system.particles[i];
      
      if (this.updateParticle(particle, system, deltaTimeSeconds)) {
        // Partícula murió
        deadParticles.push(particle);
        system.particles.splice(i, 1);
        system.particlesActive--;
      }
    }
    
    // Procesar partículas muertas
    deadParticles.forEach(particle => {
      this.killParticle(particle, system);
    });
    
    // Actualizar visualización
    this.updateSystemVisuals(system);
    
    // Verificar si el sistema terminó
    if (system.duration >= 0 && 
        system.emissionTime >= system.duration && 
        system.particles.length === 0) {
      
      system.active = false;
      
      if (system.onComplete) {
        system.onComplete(system);
      }
      
      if (!system.loop) {
        this.destroyParticleSystem(system.id);
      } else {
        // Reiniciar sistema
        system.emissionTime = 0;
        system.emissionAccumulator = 0;
        system.active = true;
      }
    }
  }

  updateParticle(particle, system, deltaTime) {
    const template = system.template;
    
    // Actualizar edad
    particle.age += deltaTime;
    particle.life -= deltaTime;
    
    // Verificar si murió
    if (particle.life <= 0) {
      return true; // Partícula muerta
    }
    
    // Calcular progreso de vida (0 = recién nacida, 1 = muriendo)
    const lifeProgress = particle.age / particle.maxLife;
    
    // Actualizar física
    this.updateParticlePhysics(particle, template, deltaTime);
    
    // Actualizar propiedades visuales
    this.updateParticleVisuals(particle, template, lifeProgress);
    
    // Actualizar función personalizada si existe
    if (particle.updateFunction) {
      particle.updateFunction(particle, deltaTime, lifeProgress);
    }
    
    return false; // Partícula sigue viva
  }

  updateParticlePhysics(particle, template, deltaTime) {
    // Aplicar gravedad
    if (particle.gravity !== 0) {
      particle.acceleration.y += particle.gravity;
    }
    
    // Aplicar turbulencia
    if (template.physics?.turbulence > 0) {
      const turbulence = template.physics.turbulence;
      particle.acceleration.x += (Math.random() - 0.5) * turbulence;
      particle.acceleration.y += (Math.random() - 0.5) * turbulence;
      particle.acceleration.z += (Math.random() - 0.5) * turbulence;
    }
    
    // Actualizar velocidad
    particle.velocity.add(particle.acceleration.clone().multiplyScalar(deltaTime));
    
    // Aplicar drag
    if (particle.drag > 0) {
      particle.velocity.multiplyScalar(1 - particle.drag);
    }
    
    // Actualizar posición
    particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
    
    // Resetear aceleración
    particle.acceleration.set(0, 0, 0);
    
    // Actualizar rotación
    particle.rotation += particle.rotationSpeed * deltaTime;
    
    // Colisiones básicas con el suelo (Y = 0)
    if (this.config.enableCollisions && particle.position.y < 0) {
      particle.position.y = 0;
      particle.velocity.y *= -particle.bounce;
      
      // Fricción en el suelo
      particle.velocity.x *= 0.8;
      particle.velocity.z *= 0.8;
    }
  }

  updateParticleVisuals(particle, template, lifeProgress) {
    // Actualizar tamaño
    if (template.size.sizeOverLife === 'decreasing') {
      particle.size = THREE.MathUtils.lerp(particle.startSize, particle.endSize, lifeProgress);
    } else if (template.size.sizeOverLife === 'increasing') {
      particle.size = THREE.MathUtils.lerp(particle.startSize, particle.endSize, lifeProgress);
    } else if (template.size.sizeOverLife === 'pulse') {
      const pulse = Math.sin(lifeProgress * Math.PI * 4) * 0.2 + 1;
      particle.size = particle.startSize * pulse;
    }
    
    // Actualizar color
    if (template.color.colorOverLife === 'gradient') {
      particle.color.lerpColors(particle.startColor, particle.endColor, lifeProgress);
    } else if (template.color.colorOverLife === 'rainbow') {
      particle.color.setHSL((lifeProgress * 6) % 1, 1, 0.5);
    }
    
    // Actualizar opacidad
    if (template.opacity.opacityOverLife === 'fadeOut') {
      particle.opacity = THREE.MathUtils.lerp(particle.startOpacity, particle.endOpacity, lifeProgress);
    } else if (template.opacity.opacityOverLife === 'fadeIn') {
      particle.opacity = THREE.MathUtils.lerp(particle.endOpacity, particle.startOpacity, 1 - lifeProgress);
    } else if (template.opacity.opacityOverLife === 'pulse') {
      const pulse = Math.sin(lifeProgress * Math.PI) * 0.5 + 0.5;
      particle.opacity = particle.startOpacity * pulse;
    }
  }

  updateSystemVisuals(system) {
    const template = system.template;
    
    if (template.material.type === 'sprite' && system.spritesSystem) {
      // Actualizar sprites individuales
      for (let i = 0; i < system.particles.length; i++) {
        const particle = system.particles[i];
        
        if (particle.visual) {
          particle.visual.position.copy(particle.position);
          particle.visual.scale.setScalar(particle.size);
          particle.visual.material.opacity = particle.opacity;
          particle.visual.material.color.copy(particle.color);
          particle.visual.rotation = particle.rotation;
        }
      }
    } else if (template.material.type === 'point' && system.pointsSystem) {
      // Actualizar buffer de points
      this.updatePointsBuffer(system);
    }
  }

  killParticle(particle, system) {
    // Callback de muerte
    if (system.onParticleDeath) {
      system.onParticleDeath(particle, system);
    }
    
    // Remover visual
    if (particle.visual && system.spritesSystem) {
      system.spritesSystem.remove(particle.visual);
      
      if (particle.visual.material) {
        particle.visual.material.dispose();
      }
    }
    
    // Devolver al pool
    this.returnParticleToPool(particle);
  }

  // ========================================
  // UTILIDADES
  // ========================================

  randomRange(range) {
    if (typeof range === 'number') {
      return range;
    } else if (range.min !== undefined && range.max !== undefined) {
      return range.min + Math.random() * (range.max - range.min);
    }
    return 1.0;
  }

  loadTexture(texturePath) {
    if (this.textureCache.has(texturePath)) {
      return this.textureCache.get(texturePath);
    }
    
    const loader = new THREE.TextureLoader();
    const texture = loader.load(texturePath);
    
    // Configurar filtros para partículas
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    this.textureCache.set(texturePath, texture);
    return texture;
  }

  updateMetrics() {
    let totalParticles = 0;
    let activeSystems = 0;
    
    for (const [systemId, system] of this.particleSystems) {
      totalParticles += system.particlesActive;
      if (system.active) activeSystems++;
    }
    
    this.metrics.activeParticles = totalParticles;
    this.metrics.activeSystems = activeSystems;
    this.metrics.memoryUsage = (this.particlePool.length * 1024) + (totalParticles * 512); // Estimación
  }

  performCleanup() {
    // Limpiar sistemas inactivos sin loop
    const toDestroy = [];
    
    for (const [systemId, system] of this.particleSystems) {
      if (!system.active && !system.loop && system.particles.length === 0) {
        toDestroy.push(systemId);
      }
    }
    
    toDestroy.forEach(systemId => {
      this.destroyParticleSystem(systemId);
    });
    
    // Limpiar cache de texturas si es muy grande
    if (this.textureCache.size > 50) {
      const entries = Array.from(this.textureCache.entries());
      entries.slice(0, 25).forEach(([key]) => {
        const texture = this.textureCache.get(key);
        texture.dispose();
        this.textureCache.delete(key);
      });
    }
  }

  // ========================================
  // API PÚBLICA
  // ========================================

  playEffect(templateId, position, config = {}) {
    const systemId = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const systemConfig = {
      ...config,
      x: position.x,
      y: position.y,
      z: position.z,
      loop: false,
      onComplete: (system) => {
        // Auto-destruir después de completar
        setTimeout(() => {
          this.destroyParticleSystem(systemId);
        }, 1000);
      }
    };
    
    return this.createParticleSystem(systemId, templateId, systemConfig);
  }

  setSystemPosition(systemId, position) {
    const system = this.particleSystems.get(systemId);
    if (system) {
      system.position.copy(position);
      system.group.position.copy(position);
    }
  }

  pauseSystem(systemId) {
    const system = this.particleSystems.get(systemId);
    if (system) {
      system.paused = true;
    }
  }

  resumeSystem(systemId) {
    const system = this.particleSystems.get(systemId);
    if (system) {
      system.paused = false;
    }
  }

  setQualityLevel(level) {
    this.config.qualityLevel = level;
    this.setupQualitySettings();
  }

  getMetrics() {
    return { ...this.metrics };
  }

  // ========================================
  // LIMPIEZA
  // ========================================

  destroy() {
    // Destruir todos los sistemas
    const systemIds = Array.from(this.particleSystems.keys());
    systemIds.forEach(systemId => {
      this.destroyParticleSystem(systemId);
    });
    
    // Limpiar pools
    this.particlePool.length = 0;
    this.activeParticles.length = 0;
    this.emitterPool.length = 0;
    
    // Limpiar caches
    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();
    
    this.geometryCache.forEach(geometry => geometry.dispose());
    this.geometryCache.clear();
    
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
    
    // Limpiar estructuras
    this.particleSystems.clear();
    this.emitters.clear();
    this.templates.clear();
    
    console.log('🧹 Sistema de partículas destruido');
  }
}

export default ParticleSystem;