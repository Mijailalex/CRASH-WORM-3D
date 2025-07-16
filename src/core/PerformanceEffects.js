// ========================================
// SISTEMAS DE RENDIMIENTO Y EFECTOS VISUALES
// Performance Manager, VFX System, Resource Manager
// ========================================

import * as THREE from 'three';

// ========================================
// PERFORMANCE MANAGER
// ========================================

export class PerformanceManager {
  constructor(config = {}) {
    this.config = {
      targetFPS: config.targetFPS || 60,
      adaptiveQuality: config.adaptiveQuality !== false,
      profilingEnabled: config.profilingEnabled || false,
      memoryThreshold: config.memoryThreshold || 200, // MB
      ...config
    };

    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      memory: { used: 0, total: 0 },
      drawCalls: 0,
      triangles: 0,
      entities: 0,
      chunks: 0
    };

    this.history = {
      fps: [],
      frameTime: [],
      memory: [],
      maxHistory: 100
    };

    this.qualityLevels = {
      ultra: {
        shadowMapSize: 2048,
        particleCount: 5000,
        viewDistance: 500,
        LOD: false,
        antialiasing: true,
        postProcessing: true,
        physicsSteps: 8
      },
      high: {
        shadowMapSize: 1024,
        particleCount: 3000,
        viewDistance: 400,
        LOD: true,
        antialiasing: true,
        postProcessing: true,
        physicsSteps: 6
      },
      medium: {
        shadowMapSize: 512,
        particleCount: 1500,
        viewDistance: 300,
        LOD: true,
        antialiasing: false,
        postProcessing: false,
        physicsSteps: 4
      },
      low: {
        shadowMapSize: 256,
        particleCount: 500,
        viewDistance: 200,
        LOD: true,
        antialiasing: false,
        postProcessing: false,
        physicsSteps: 2
      }
    };

    this.currentQuality = 'high';
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.adaptiveTimer = 0;
    this.adaptiveInterval = 2000; // Evaluar cada 2 segundos

    this.initializePerformanceMonitoring();
  }

  initializePerformanceMonitoring() {
    // Detectar capacidades del dispositivo
    this.deviceCapabilities = this.detectDeviceCapabilities();
    
    // Establecer calidad inicial basada en capabilities
    this.currentQuality = this.determineInitialQuality();
    
    console.log(`🎯 Performance Manager inicializado - Calidad: ${this.currentQuality}`);
  }

  detectDeviceCapabilities() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { tier: 'low', reason: 'No WebGL support' };
    }

    const capabilities = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      extensions: gl.getSupportedExtensions(),
      renderer: gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR)
    };

    // Calcular tier basado en capabilities
    let score = 0;
    
    if (capabilities.maxTextureSize >= 4096) score += 2;
    else if (capabilities.maxTextureSize >= 2048) score += 1;
    
    if (capabilities.extensions.includes('OES_texture_float')) score += 1;
    if (capabilities.extensions.includes('WEBGL_depth_texture')) score += 1;
    if (capabilities.extensions.includes('EXT_texture_filter_anisotropic')) score += 1;
    
    // Detectar GPU aproximadamente
    const renderer = capabilities.renderer.toLowerCase();
    if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) {
      score += 2;
    } else if (renderer.includes('intel')) {
      score += 1;
    }

    let tier;
    if (score >= 6) tier = 'ultra';
    else if (score >= 4) tier = 'high';
    else if (score >= 2) tier = 'medium';
    else tier = 'low';

    return { tier, score, ...capabilities };
  }

  determineInitialQuality() {
    const tier = this.deviceCapabilities.tier;
    
    // Ajustar según memoria disponible si está disponible
    if (navigator.deviceMemory) {
      if (navigator.deviceMemory < 4 && tier === 'ultra') return 'high';
      if (navigator.deviceMemory < 2 && tier === 'high') return 'medium';
    }
    
    return tier;
  }

  update(deltaTime, renderer, scene, camera) {
    this.updateMetrics(deltaTime, renderer, scene);
    
    if (this.config.adaptiveQuality) {
      this.adaptiveTimer += deltaTime;
      if (this.adaptiveTimer >= this.adaptiveInterval) {
        this.evaluatePerformance();
        this.adaptiveTimer = 0;
      }
    }
    
    if (this.config.profilingEnabled) {
      this.updateProfiling();
    }
  }

  updateMetrics(deltaTime, renderer, scene) {
    const currentTime = performance.now();
    
    // FPS y Frame Time
    this.metrics.frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      this.metrics.fps = 1000 / this.metrics.frameTime;
      this.addToHistory('fps', this.metrics.fps);
      this.addToHistory('frameTime', this.metrics.frameTime);
    }

    // Memoria
    if (performance.memory) {
      this.metrics.memory.used = performance.memory.usedJSHeapSize / (1024 * 1024);
      this.metrics.memory.total = performance.memory.totalJSHeapSize / (1024 * 1024);
      
      if (this.frameCount % 300 === 0) { // Cada 5 segundos
        this.addToHistory('memory', this.metrics.memory.used);
      }
    }

    // Métricas de renderizado
    if (renderer && renderer.info) {
      this.metrics.drawCalls = renderer.info.render.calls;
      this.metrics.triangles = renderer.info.render.triangles;
    }

    // Contar entidades en escena
    if (scene) {
      this.metrics.entities = this.countEntitiesInScene(scene);
    }
  }

  countEntitiesInScene(scene) {
    let count = 0;
    
    scene.traverse((object) => {
      if (object.isMesh || object.isSprite) {
        count++;
      }
    });
    
    return count;
  }

  addToHistory(metric, value) {
    if (!this.history[metric]) this.history[metric] = [];
    
    this.history[metric].push(value);
    if (this.history[metric].length > this.history.maxHistory) {
      this.history[metric].shift();
    }
  }

  evaluatePerformance() {
    const avgFPS = this.getAverageFromHistory('fps', 30);
    const avgFrameTime = this.getAverageFromHistory('frameTime', 30);
    const memoryUsage = this.metrics.memory.used;
    
    let shouldUpgrade = false;
    let shouldDowngrade = false;
    
    // Criterios para downgrade
    if (avgFPS < this.config.targetFPS * 0.8) {
      shouldDowngrade = true;
      console.log(`📉 Performance downgrade triggered: FPS ${avgFPS.toFixed(1)} < ${this.config.targetFPS * 0.8}`);
    }
    
    if (memoryUsage > this.config.memoryThreshold) {
      shouldDowngrade = true;
      console.log(`📉 Performance downgrade triggered: Memory ${memoryUsage.toFixed(1)}MB > ${this.config.memoryThreshold}MB`);
    }
    
    // Criterios para upgrade
    if (avgFPS > this.config.targetFPS * 1.1 && memoryUsage < this.config.memoryThreshold * 0.7) {
      shouldUpgrade = true;
      console.log(`📈 Performance upgrade opportunity: FPS ${avgFPS.toFixed(1)}, Memory ${memoryUsage.toFixed(1)}MB`);
    }
    
    if (shouldDowngrade) {
      this.downgradeQuality();
    } else if (shouldUpgrade) {
      this.upgradeQuality();
    }
  }

  getAverageFromHistory(metric, samples = 10) {
    const history = this.history[metric];
    if (!history || history.length === 0) return 0;
    
    const slice = history.slice(-samples);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  }

  upgradeQuality() {
    const qualityOrder = ['low', 'medium', 'high', 'ultra'];
    const currentIndex = qualityOrder.indexOf(this.currentQuality);
    
    if (currentIndex < qualityOrder.length - 1) {
      const newQuality = qualityOrder[currentIndex + 1];
      this.setQuality(newQuality);
      console.log(`⬆️ Quality upgraded: ${this.currentQuality} → ${newQuality}`);
    }
  }

  downgradeQuality() {
    const qualityOrder = ['low', 'medium', 'high', 'ultra'];
    const currentIndex = qualityOrder.indexOf(this.currentQuality);
    
    if (currentIndex > 0) {
      const newQuality = qualityOrder[currentIndex - 1];
      this.setQuality(newQuality);
      console.log(`⬇️ Quality downgraded: ${this.currentQuality} → ${newQuality}`);
    }
  }

  setQuality(quality) {
    if (!this.qualityLevels[quality]) return;
    
    this.currentQuality = quality;
    
    // Emitir evento para que otros sistemas se actualicen
    window.dispatchEvent(new CustomEvent('qualityChanged', {
      detail: { quality, settings: this.qualityLevels[quality] }
    }));
  }

  getCurrentQualitySettings() {
    return this.qualityLevels[this.currentQuality];
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getDetailedReport() {
    return {
      metrics: this.getMetrics(),
      quality: this.currentQuality,
      qualitySettings: this.getCurrentQualitySettings(),
      deviceCapabilities: this.deviceCapabilities,
      history: {
        fps: this.history.fps.slice(-10),
        frameTime: this.history.frameTime.slice(-10),
        memory: this.history.memory.slice(-5)
      }
    };
  }

  updateProfiling() {
    // Profiling detallado para desarrollo
    if (this.frameCount % 600 === 0) { // Cada 10 segundos
      console.log('🔍 Performance Report:', this.getDetailedReport());
    }
  }

  dispose() {
    // Cleanup
    this.history = { fps: [], frameTime: [], memory: [] };
  }
}

// ========================================
// VISUAL EFFECTS SYSTEM
// ========================================

export class VFXSystem {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = {
      maxParticles: config.maxParticles || 10000,
      poolSize: config.poolSize || 1000,
      maxEffects: config.maxEffects || 50,
      ...config
    };

    this.activeEffects = new Map();
    this.particlePools = new Map();
    this.effectTemplates = this.initializeEffectTemplates();
    
    this.initializeParticlePools();
  }

  initializeEffectTemplates() {
    return {
      explosion: {
        particles: 100,
        duration: 2000,
        spread: 5,
        speed: { min: 5, max: 15 },
        size: { start: 0.5, end: 0.1 },
        color: { start: '#ff6600', end: '#ff0000' },
        gravity: -5,
        fadeOut: true
      },
      
      sparkle: {
        particles: 50,
        duration: 1500,
        spread: 2,
        speed: { min: 2, max: 8 },
        size: { start: 0.2, end: 0.05 },
        color: { start: '#ffff00', end: '#ffffff' },
        gravity: 0,
        fadeOut: true,
        twinkle: true
      },
      
      smoke: {
        particles: 30,
        duration: 3000,
        spread: 3,
        speed: { min: 1, max: 4 },
        size: { start: 0.3, end: 1.5 },
        color: { start: '#666666', end: '#333333' },
        gravity: 2,
        fadeOut: true
      },
      
      heal: {
        particles: 40,
        duration: 2000,
        spread: 1.5,
        speed: { min: 1, max: 3 },
        size: { start: 0.1, end: 0.3 },
        color: { start: '#00ff00', end: '#ffffff' },
        gravity: 3,
        fadeOut: true,
        spiral: true
      },
      
      magic: {
        particles: 80,
        duration: 2500,
        spread: 4,
        speed: { min: 3, max: 10 },
        size: { start: 0.3, end: 0.1 },
        color: { start: '#9900ff', end: '#ff00ff' },
        gravity: 0,
        fadeOut: true,
        orbital: true
      },
      
      collect: {
        particles: 20,
        duration: 1000,
        spread: 1,
        speed: { min: 2, max: 6 },
        size: { start: 0.2, end: 0.1 },
        color: { start: '#00ffff', end: '#ffffff' },
        gravity: 0,
        fadeOut: true,
        magnetism: true
      }
    };
  }

  initializeParticlePools() {
    const poolTypes = ['basic', 'textured', 'animated'];
    
    poolTypes.forEach(type => {
      this.particlePools.set(type, new ParticlePool(type, this.config.poolSize));
    });
  }

  playEffect(effectName, position, options = {}) {
    const template = this.effectTemplates[effectName];
    if (!template) {
      console.warn(`Effect template '${effectName}' not found`);
      return null;
    }

    const effectId = `${effectName}_${Date.now()}_${Math.random()}`;
    const effect = new ParticleEffect(effectId, template, position, options, this);
    
    this.activeEffects.set(effectId, effect);
    effect.start();
    
    // Cleanup automático
    setTimeout(() => {
      this.removeEffect(effectId);
    }, template.duration + 1000);
    
    return effectId;
  }

  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.dispose();
      this.activeEffects.delete(effectId);
    }
  }

  update(deltaTime) {
    for (const [effectId, effect] of this.activeEffects) {
      effect.update(deltaTime);
      
      if (effect.isFinished()) {
        this.removeEffect(effectId);
      }
    }
  }

  getParticleFromPool(type = 'basic') {
    const pool = this.particlePools.get(type);
    return pool ? pool.get() : null;
  }

  returnParticleToPool(particle, type = 'basic') {
    const pool = this.particlePools.get(type);
    if (pool) {
      pool.return(particle);
    }
  }

  dispose() {
    // Cleanup todos los efectos
    for (const [effectId] of this.activeEffects) {
      this.removeEffect(effectId);
    }
    
    // Cleanup pools
    for (const pool of this.particlePools.values()) {
      pool.dispose();
    }
  }
}

// ========================================
// PARTICLE EFFECT CLASS
// ========================================

class ParticleEffect {
  constructor(id, template, position, options, vfxSystem) {
    this.id = id;
    this.template = { ...template, ...options };
    this.position = { ...position };
    this.vfxSystem = vfxSystem;
    
    this.particles = [];
    this.group = new THREE.Group();
    this.startTime = 0;
    this.isActive = false;
    
    this.vfxSystem.scene.add(this.group);
  }

  start() {
    this.startTime = Date.now();
    this.isActive = true;
    
    this.createParticles();
  }

  createParticles() {
    const particleCount = this.template.particles;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.createParticle();
      this.particles.push(particle);
      this.group.add(particle.mesh);
    }
  }

  createParticle() {
    const geometry = new THREE.SphereGeometry(0.1, 8, 6);
    const material = new THREE.MeshBasicMaterial({
      color: this.template.color.start,
      transparent: true
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Posición inicial aleatoria
    const spread = this.template.spread;
    mesh.position.set(
      this.position.x + (Math.random() - 0.5) * spread,
      this.position.y + (Math.random() - 0.5) * spread,
      this.position.z + (Math.random() - 0.5) * spread
    );
    
    // Velocidad inicial aleatoria
    const speed = this.template.speed.min + 
                  Math.random() * (this.template.speed.max - this.template.speed.min);
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random(),
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(speed);
    
    const particle = {
      mesh,
      velocity,
      initialPosition: mesh.position.clone(),
      life: 0,
      maxLife: this.template.duration / 1000,
      initialSize: this.template.size.start,
      initialColor: new THREE.Color(this.template.color.start),
      endColor: new THREE.Color(this.template.color.end)
    };
    
    return particle;
  }

  update(deltaTime) {
    if (!this.isActive) return;
    
    const dt = deltaTime / 1000;
    const elapsed = Date.now() - this.startTime;
    const progress = elapsed / this.template.duration;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Actualizar vida de la partícula
      particle.life += dt;
      const lifeProgress = particle.life / particle.maxLife;
      
      if (lifeProgress >= 1) {
        // Remover partícula terminada
        this.group.remove(particle.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      
      // Actualizar posición
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(dt)
      );
      
      // Aplicar gravedad
      if (this.template.gravity) {
        particle.velocity.y += this.template.gravity * dt;
      }
      
      // Efectos especiales
      if (this.template.spiral) {
        const angle = particle.life * 5;
        const radius = lifeProgress * 2;
        particle.mesh.position.x = particle.initialPosition.x + 
                                   Math.cos(angle) * radius;
        particle.mesh.position.z = particle.initialPosition.z + 
                                   Math.sin(angle) * radius;
      }
      
      if (this.template.orbital) {
        const angle = particle.life * 3;
        particle.mesh.position.x += Math.cos(angle) * 0.1;
        particle.mesh.position.z += Math.sin(angle) * 0.1;
      }
      
      // Actualizar tamaño
      const size = THREE.MathUtils.lerp(
        this.template.size.start,
        this.template.size.end,
        lifeProgress
      );
      particle.mesh.scale.setScalar(size);
      
      // Actualizar color
      const currentColor = particle.initialColor.clone().lerp(
        particle.endColor,
        lifeProgress
      );
      particle.mesh.material.color.copy(currentColor);
      
      // Fade out
      if (this.template.fadeOut) {
        particle.mesh.material.opacity = 1 - lifeProgress;
      }
      
      // Twinkle effect
      if (this.template.twinkle) {
        particle.mesh.material.opacity *= 
          0.5 + 0.5 * Math.sin(particle.life * 10);
      }
    }
  }

  isFinished() {
    const elapsed = Date.now() - this.startTime;
    return elapsed > this.template.duration && this.particles.length === 0;
  }

  dispose() {
    // Remover todas las partículas
    for (const particle of this.particles) {
      this.group.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
    }
    
    // Remover grupo de la escena
    this.vfxSystem.scene.remove(this.group);
    
    this.particles = [];
    this.isActive = false;
  }
}

// ========================================
// PARTICLE POOL
// ========================================

class ParticlePool {
  constructor(type, size) {
    this.type = type;
    this.available = [];
    this.used = new Set();
    
    // Pre-crear partículas
    for (let i = 0; i < size; i++) {
      const particle = this.createParticle();
      this.available.push(particle);
    }
  }

  createParticle() {
    const geometry = new THREE.SphereGeometry(0.1, 8, 6);
    const material = new THREE.MeshBasicMaterial({
      transparent: true
    });
    
    return {
      mesh: new THREE.Mesh(geometry, material),
      inUse: false
    };
  }

  get() {
    let particle;
    
    if (this.available.length > 0) {
      particle = this.available.pop();
    } else {
      particle = this.createParticle();
    }
    
    particle.inUse = true;
    this.used.add(particle);
    
    return particle;
  }

  return(particle) {
    if (this.used.has(particle)) {
      particle.inUse = false;
      this.used.delete(particle);
      this.available.push(particle);
      
      // Reset particle state
      particle.mesh.position.set(0, 0, 0);
      particle.mesh.scale.setScalar(1);
      particle.mesh.material.opacity = 1;
      particle.mesh.visible = true;
    }
  }

  dispose() {
    // Cleanup todas las partículas
    for (const particle of this.available) {
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
    }
    
    for (const particle of this.used) {
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
    }
    
    this.available = [];
    this.used.clear();
  }
}

// ========================================
// RESOURCE MANAGER
// ========================================

export class ResourceManager {
  constructor() {
    this.resources = new Map();
    this.loadingQueue = [];
    this.loadingPromises = new Map();
    this.cache = new Map();
    
    this.stats = {
      loaded: 0,
      failed: 0,
      cached: 0,
      memoryUsage: 0
    };
    
    this.loaders = {
      texture: new THREE.TextureLoader(),
      audio: null, // Se inicializa cuando se necesita
      model: null, // Para GLTFLoader si se necesita
      font: new THREE.FontLoader()
    };
  }

  async loadResource(type, url, options = {}) {
    const cacheKey = `${type}:${url}`;
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      this.stats.cached++;
      return this.cache.get(cacheKey);
    }
    
    // Verificar si ya se está cargando
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }
    
    // Crear promise de carga
    const loadPromise = this.performLoad(type, url, options);
    this.loadingPromises.set(cacheKey, loadPromise);
    
    try {
      const resource = await loadPromise;
      this.cache.set(cacheKey, resource);
      this.stats.loaded++;
      return resource;
    } catch (error) {
      this.stats.failed++;
      console.error(`Failed to load ${type} resource: ${url}`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async performLoad(type, url, options) {
    switch (type) {
      case 'texture':
        return this.loadTexture(url, options);
      case 'audio':
        return this.loadAudio(url, options);
      case 'model':
        return this.loadModel(url, options);
      case 'font':
        return this.loadFont(url, options);
      default:
        throw new Error(`Unknown resource type: ${type}`);
    }
  }

  loadTexture(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.loaders.texture.load(
        url,
        (texture) => {
          // Aplicar opciones
          if (options.repeat) {
            texture.repeat.set(options.repeat.x || 1, options.repeat.y || 1);
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          }
          
          if (options.flipY !== undefined) {
            texture.flipY = options.flipY;
          }
          
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  async loadAudio(url, options = {}) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      throw new Error(`Failed to load audio: ${error.message}`);
    }
  }

  loadModel(url, options = {}) {
    // Implementar carga de modelos 3D si se necesita
    return Promise.reject(new Error('Model loading not implemented'));
  }

  loadFont(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.loaders.font.load(url, resolve, undefined, reject);
    });
  }

  // Batch loading
  async loadBatch(resources) {
    const promises = resources.map(({ type, url, options }) => 
      this.loadResource(type, url, options)
    );
    
    return Promise.allSettled(promises);
  }

  // Preload recursos críticos
  async preloadCriticalResources() {
    const criticalResources = [
      // Texturas básicas
      { type: 'texture', url: '/textures/grass.jpg' },
      { type: 'texture', url: '/textures/stone.jpg' },
      
      // Sonidos básicos
      { type: 'audio', url: '/audio/jump.wav' },
      { type: 'audio', url: '/audio/collect.wav' }
    ];
    
    console.log('🔄 Preloading critical resources...');
    const results = await this.loadBatch(criticalResources);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Preloaded ${successful}/${criticalResources.length} critical resources`);
    
    return results;
  }

  // Gestión de memoria
  clearCache() {
    for (const [key, resource] of this.cache) {
      if (resource && typeof resource.dispose === 'function') {
        resource.dispose();
      }
    }
    
    this.cache.clear();
    this.stats.cached = 0;
    console.log('🧹 Resource cache cleared');
  }

  getMemoryUsage() {
    let usage = 0;
    
    for (const resource of this.cache.values()) {
      if (resource && resource.image) {
        // Estimar uso de memoria de texturas
        const width = resource.image.width || 256;
        const height = resource.image.height || 256;
        usage += width * height * 4; // RGBA
      }
    }
    
    return usage / (1024 * 1024); // MB
  }

  getStats() {
    return {
      ...this.stats,
      memoryUsage: this.getMemoryUsage(),
      cacheSize: this.cache.size,
      loading: this.loadingPromises.size
    };
  }

  dispose() {
    this.clearCache();
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// ========================================
// EXPORTACIONES
// ========================================

export { PerformanceManager, VFXSystem, ResourceManager };