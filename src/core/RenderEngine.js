// ========================================
// MOTOR DE RENDERIZADO 3D AVANZADO
// Sistema de renderizado optimizado con Three.js
// ========================================

import * as THREE from 'three';
import { BaseSystem } from './GameEngine.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

export class RenderEngine extends BaseSystem {
  constructor(config = {}) {
    super('render', 1000);
    
    this.config = {
      canvas: config.canvas || null,
      width: config.width || window.innerWidth,
      height: config.height || window.innerHeight,
      antialias: config.antialias !== false,
      shadows: config.shadows !== false,
      shadowMapSize: config.shadowMapSize || 2048,
      pixelRatio: config.pixelRatio || Math.min(window.devicePixelRatio, 2),
      powerPreference: config.powerPreference || 'high-performance',
      enablePostProcessing: config.enablePostProcessing !== false,
      enableLOD: config.enableLOD !== false,
      enableFrustumCulling: config.enableFrustumCulling !== false,
      maxLights: config.maxLights || 32,
      ...config
    };

    // Componentes principales
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.composer = null;
    
    // Gestión de objetos
    this.renderables = new Map();
    this.lights = new Map();
    this.materials = new Map();
    this.textures = new Map();
    this.geometries = new Map();
    
    // Sistema de LOD
    this.lodManager = null;
    
    // Pools de objetos
    this.meshPool = [];
    this.materialPool = [];
    
    // Métricas de rendimiento
    this.metrics = {
      drawCalls: 0,
      triangles: 0,
      renderTime: 0,
      geometryCount: 0,
      textureCount: 0,
      materialCount: 0,
      lightCount: 0
    };

    // Estado del renderizado
    this.isInitialized = false;
    this.needsResize = false;
    
    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLighting();
    this.setupPostProcessing();
    this.setupLODManager();
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('🎨 Motor de renderizado inicializado');
  }

  // ========================================
  // CONFIGURACIÓN INICIAL
  // ========================================

  setupRenderer() {
    const rendererConfig = {
      canvas: this.config.canvas,
      antialias: this.config.antialias,
      powerPreference: this.config.powerPreference,
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: true
    };

    this.renderer = new THREE.WebGLRenderer(rendererConfig);
    this.renderer.setSize(this.config.width, this.config.height);
    this.renderer.setPixelRatio(this.config.pixelRatio);
    
    // Configuración de sombras
    if (this.config.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = true;
    }
    
    // Configuraciones avanzadas
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.physicallyCorrectLights = true;
    
    // Optimizaciones
    this.renderer.info.autoReset = false;
    this.renderer.sortObjects = true;
    
    // Agregar al DOM si no hay canvas especificado
    if (!this.config.canvas) {
      document.body.appendChild(this.renderer.domElement);
    }
  }

  setupScene() {
    this.scene = new THREE.Scene();
    
    // Configurar fog atmosférico
    this.scene.fog = new THREE.Fog(0x87CEEB, 50, 2000);
    
    // Configurar background
    this.setupBackground();
  }

  setupBackground() {
    // Crear skybox procedural
    const skyboxGeometry = new THREE.SphereGeometry(1500, 32, 32);
    const skyboxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 400 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });
    
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    this.scene.add(skybox);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.config.width / this.config.height,
      0.1,
      3000
    );
    
    this.camera.position.set(0, 15, 30);
    this.camera.lookAt(0, 0, 0);
  }

  setupLighting() {
    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    this.lights.set('ambient', ambientLight);
    
    // Luz direccional principal (sol)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = this.config.shadows;
    
    if (this.config.shadows) {
      directionalLight.shadow.mapSize.width = this.config.shadowMapSize;
      directionalLight.shadow.mapSize.height = this.config.shadowMapSize;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -200;
      directionalLight.shadow.camera.right = 200;
      directionalLight.shadow.camera.top = 200;
      directionalLight.shadow.camera.bottom = -200;
      directionalLight.shadow.bias = -0.0001;
      directionalLight.shadow.normalBias = 0.02;
    }
    
    this.scene.add(directionalLight);
    this.lights.set('sun', directionalLight);
    
    // Luz de relleno
    const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
    fillLight.position.set(-50, 30, -50);
    this.scene.add(fillLight);
    this.lights.set('fill', fillLight);
  }

  setupPostProcessing() {
    if (!this.config.enablePostProcessing) return;
    
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass principal
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // Bloom pass para efectos brillantes
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.config.width, this.config.height),
      0.5,  // strength
      0.4,  // radius
      0.85  // threshold
    );
    this.composer.addPass(bloomPass);
    
    // SSAO para oclusión ambiental
    const ssaoPass = new SSAOPass(
      this.scene,
      this.camera,
      this.config.width,
      this.config.height
    );
    ssaoPass.kernelRadius = 8;
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.1;
    this.composer.addPass(ssaoPass);
    
    // Antialiasing
    const smaaPass = new SMAAPass(this.config.width, this.config.height);
    this.composer.addPass(smaaPass);
  }

  setupLODManager() {
    if (!this.config.enableLOD) return;
    
    this.lodManager = {
      levels: [
        { distance: 0, detail: 1.0 },
        { distance: 100, detail: 0.7 },
        { distance: 200, detail: 0.4 },
        { distance: 400, detail: 0.2 },
        { distance: 800, detail: 0.0 } // Culling
      ],
      
      updateLOD: (object, cameraPosition) => {
        const distance = object.position.distanceTo(cameraPosition);
        
        for (let i = this.lodManager.levels.length - 1; i >= 0; i--) {
          const level = this.lodManager.levels[i];
          if (distance >= level.distance) {
            this.applyLODLevel(object, level);
            break;
          }
        }
      }
    };
  }

  applyLODLevel(object, level) {
    if (level.detail === 0.0) {
      object.visible = false;
      return;
    }
    
    object.visible = true;
    
    // Ajustar nivel de detalle de geometría si está disponible
    if (object.userData.lodGeometries) {
      const lodIndex = Math.floor((1 - level.detail) * (object.userData.lodGeometries.length - 1));
      const targetGeometry = object.userData.lodGeometries[lodIndex];
      
      if (object.geometry !== targetGeometry) {
        object.geometry = targetGeometry;
      }
    }
    
    // Ajustar calidad de materiales
    if (object.material && object.material.map) {
      const targetSize = Math.max(64, Math.floor(512 * level.detail));
      // Implementar reducción de resolución de texturas aquí
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.needsResize = true;
    });
  }

  // ========================================
  // GESTIÓN DE OBJETOS RENDERIZABLES
  // ========================================

  createRenderable(entityId, config = {}) {
    const renderable = {
      entityId,
      type: config.type || 'mesh',
      geometry: this.getOrCreateGeometry(config.geometry),
      material: this.getOrCreateMaterial(config.material),
      position: new THREE.Vector3(config.position?.x || 0, config.position?.y || 0, config.position?.z || 0),
      rotation: new THREE.Euler(config.rotation?.x || 0, config.rotation?.y || 0, config.rotation?.z || 0),
      scale: new THREE.Vector3(config.scale?.x || 1, config.scale?.y || 1, config.scale?.z || 1),
      visible: config.visible !== false,
      castShadow: config.castShadow !== false,
      receiveShadow: config.receiveShadow !== false,
      frustumCulled: config.frustumCulled !== false,
      renderOrder: config.renderOrder || 0,
      layers: config.layers || [0],
      userData: config.userData || {},
      
      // Objeto Three.js
      object3D: null,
      
      // LOD
      lodEnabled: config.lodEnabled !== false,
      lodGeometries: config.lodGeometries || null,
      
      // Animación
      animations: config.animations || [],
      mixer: null
    };

    // Crear objeto 3D
    if (renderable.type === 'mesh') {
      renderable.object3D = new THREE.Mesh(renderable.geometry, renderable.material);
    } else if (renderable.type === 'points') {
      renderable.object3D = new THREE.Points(renderable.geometry, renderable.material);
    } else if (renderable.type === 'line') {
      renderable.object3D = new THREE.Line(renderable.geometry, renderable.material);
    }

    // Configurar objeto 3D
    if (renderable.object3D) {
      renderable.object3D.position.copy(renderable.position);
      renderable.object3D.rotation.copy(renderable.rotation);
      renderable.object3D.scale.copy(renderable.scale);
      renderable.object3D.visible = renderable.visible;
      renderable.object3D.castShadow = renderable.castShadow;
      renderable.object3D.receiveShadow = renderable.receiveShadow;
      renderable.object3D.frustumCulled = renderable.frustumCulled;
      renderable.object3D.renderOrder = renderable.renderOrder;
      renderable.object3D.userData = { entityId, ...renderable.userData };
      
      // Configurar layers
      renderable.object3D.layers.disableAll();
      renderable.layers.forEach(layer => renderable.object3D.layers.enable(layer));
      
      this.scene.add(renderable.object3D);
    }

    // Configurar animaciones
    if (renderable.animations.length > 0) {
      renderable.mixer = new THREE.AnimationMixer(renderable.object3D);
      renderable.animations.forEach(animation => {
        const action = renderable.mixer.clipAction(animation);
        action.play();
      });
    }

    this.renderables.set(entityId, renderable);
    console.log(`🎨 Renderable creado para entidad ${entityId}`);
    
    return renderable;
  }

  destroyRenderable(entityId) {
    const renderable = this.renderables.get(entityId);
    if (renderable) {
      if (renderable.object3D) {
        this.scene.remove(renderable.object3D);
        
        // Limpiar geometría y material si no se reutilizan
        if (renderable.object3D.geometry && !this.isGeometryShared(renderable.object3D.geometry)) {
          renderable.object3D.geometry.dispose();
        }
        
        if (renderable.object3D.material && !this.isMaterialShared(renderable.object3D.material)) {
          if (Array.isArray(renderable.object3D.material)) {
            renderable.object3D.material.forEach(mat => mat.dispose());
          } else {
            renderable.object3D.material.dispose();
          }
        }
      }
      
      if (renderable.mixer) {
        renderable.mixer.stopAllAction();
      }
      
      this.renderables.delete(entityId);
      return true;
    }
    return false;
  }

  updateRenderable(entityId, updates) {
    const renderable = this.renderables.get(entityId);
    if (!renderable || !renderable.object3D) return false;

    // Actualizar propiedades
    if (updates.position) {
      renderable.position.copy(updates.position);
      renderable.object3D.position.copy(updates.position);
    }
    
    if (updates.rotation) {
      renderable.rotation.copy(updates.rotation);
      renderable.object3D.rotation.copy(updates.rotation);
    }
    
    if (updates.scale) {
      renderable.scale.copy(updates.scale);
      renderable.object3D.scale.copy(updates.scale);
    }
    
    if (updates.visible !== undefined) {
      renderable.visible = updates.visible;
      renderable.object3D.visible = updates.visible;
    }
    
    if (updates.material) {
      const newMaterial = this.getOrCreateMaterial(updates.material);
      renderable.material = newMaterial;
      renderable.object3D.material = newMaterial;
    }
    
    return true;
  }

  // ========================================
  // GESTIÓN DE RECURSOS
  // ========================================

  getOrCreateGeometry(geometryConfig) {
    if (!geometryConfig) {
      return new THREE.BoxGeometry(1, 1, 1);
    }
    
    const key = this.generateGeometryKey(geometryConfig);
    
    if (this.geometries.has(key)) {
      return this.geometries.get(key);
    }
    
    let geometry;
    
    switch (geometryConfig.type) {
      case 'box':
        geometry = new THREE.BoxGeometry(
          geometryConfig.width || 1,
          geometryConfig.height || 1,
          geometryConfig.depth || 1,
          geometryConfig.widthSegments || 1,
          geometryConfig.heightSegments || 1,
          geometryConfig.depthSegments || 1
        );
        break;
        
      case 'sphere':
        geometry = new THREE.SphereGeometry(
          geometryConfig.radius || 0.5,
          geometryConfig.widthSegments || 16,
          geometryConfig.heightSegments || 12
        );
        break;
        
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          geometryConfig.radiusTop || 0.5,
          geometryConfig.radiusBottom || 0.5,
          geometryConfig.height || 1,
          geometryConfig.radialSegments || 16
        );
        break;
        
      case 'plane':
        geometry = new THREE.PlaneGeometry(
          geometryConfig.width || 1,
          geometryConfig.height || 1,
          geometryConfig.widthSegments || 1,
          geometryConfig.heightSegments || 1
        );
        break;
        
      case 'torus':
        geometry = new THREE.TorusGeometry(
          geometryConfig.radius || 0.5,
          geometryConfig.tube || 0.2,
          geometryConfig.radialSegments || 16,
          geometryConfig.tubularSegments || 100
        );
        break;
        
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    
    this.geometries.set(key, geometry);
    this.metrics.geometryCount++;
    
    return geometry;
  }

  getOrCreateMaterial(materialConfig) {
    if (!materialConfig) {
      return new THREE.MeshStandardMaterial({ color: 0x888888 });
    }
    
    const key = this.generateMaterialKey(materialConfig);
    
    if (this.materials.has(key)) {
      return this.materials.get(key);
    }
    
    let material;
    
    switch (materialConfig.type || 'standard') {
      case 'basic':
        material = new THREE.MeshBasicMaterial(materialConfig);
        break;
        
      case 'lambert':
        material = new THREE.MeshLambertMaterial(materialConfig);
        break;
        
      case 'phong':
        material = new THREE.MeshPhongMaterial(materialConfig);
        break;
        
      case 'standard':
        material = new THREE.MeshStandardMaterial(materialConfig);
        break;
        
      case 'physical':
        material = new THREE.MeshPhysicalMaterial(materialConfig);
        break;
        
      case 'toon':
        material = new THREE.MeshToonMaterial(materialConfig);
        break;
        
      case 'points':
        material = new THREE.PointsMaterial(materialConfig);
        break;
        
      case 'line':
        material = new THREE.LineBasicMaterial(materialConfig);
        break;
        
      default:
        material = new THREE.MeshStandardMaterial(materialConfig);
    }
    
    // Configurar texturas si están especificadas
    if (materialConfig.map) {
      material.map = this.getOrCreateTexture(materialConfig.map);
    }
    
    if (materialConfig.normalMap) {
      material.normalMap = this.getOrCreateTexture(materialConfig.normalMap);
    }
    
    if (materialConfig.roughnessMap) {
      material.roughnessMap = this.getOrCreateTexture(materialConfig.roughnessMap);
    }
    
    if (materialConfig.metalnessMap) {
      material.metalnessMap = this.getOrCreateTexture(materialConfig.metalnessMap);
    }
    
    this.materials.set(key, material);
    this.metrics.materialCount++;
    
    return material;
  }

  getOrCreateTexture(textureConfig) {
    if (typeof textureConfig === 'string') {
      textureConfig = { url: textureConfig };
    }
    
    const key = textureConfig.url;
    
    if (this.textures.has(key)) {
      return this.textures.get(key);
    }
    
    const loader = new THREE.TextureLoader();
    const texture = loader.load(textureConfig.url);
    
    // Configurar propiedades de la textura
    texture.wrapS = textureConfig.wrapS || THREE.RepeatWrapping;
    texture.wrapT = textureConfig.wrapT || THREE.RepeatWrapping;
    texture.magFilter = textureConfig.magFilter || THREE.LinearFilter;
    texture.minFilter = textureConfig.minFilter || THREE.LinearMipmapLinearFilter;
    texture.anisotropy = textureConfig.anisotropy || this.renderer.capabilities.getMaxAnisotropy();
    
    if (textureConfig.repeat) {
      texture.repeat.set(textureConfig.repeat.x || 1, textureConfig.repeat.y || 1);
    }
    
    this.textures.set(key, texture);
    this.metrics.textureCount++;
    
    return texture;
  }

  generateGeometryKey(config) {
    return JSON.stringify(config);
  }

  generateMaterialKey(config) {
    // Excluir texturas del key para evitar duplicados
    const { map, normalMap, roughnessMap, metalnessMap, ...keyConfig } = config;
    return JSON.stringify(keyConfig);
  }

  isGeometryShared(geometry) {
    let count = 0;
    for (const [entityId, renderable] of this.renderables) {
      if (renderable.geometry === geometry) {
        count++;
        if (count > 1) return true;
      }
    }
    return false;
  }

  isMaterialShared(material) {
    let count = 0;
    for (const [entityId, renderable] of this.renderables) {
      if (renderable.material === material) {
        count++;
        if (count > 1) return true;
      }
    }
    return false;
  }

  // ========================================
  // GESTIÓN DE LUCES
  // ========================================

  createLight(entityId, config) {
    let light;
    
    switch (config.type) {
      case 'ambient':
        light = new THREE.AmbientLight(config.color || 0x404040, config.intensity || 0.4);
        break;
        
      case 'directional':
        light = new THREE.DirectionalLight(config.color || 0xffffff, config.intensity || 1);
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        if (config.target) {
          light.target.position.set(config.target.x, config.target.y, config.target.z);
        }
        break;
        
      case 'point':
        light = new THREE.PointLight(
          config.color || 0xffffff,
          config.intensity || 1,
          config.distance || 0,
          config.decay || 2
        );
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        break;
        
      case 'spot':
        light = new THREE.SpotLight(
          config.color || 0xffffff,
          config.intensity || 1,
          config.distance || 0,
          config.angle || Math.PI / 3,
          config.penumbra || 0,
          config.decay || 2
        );
        if (config.position) {
          light.position.set(config.position.x, config.position.y, config.position.z);
        }
        if (config.target) {
          light.target.position.set(config.target.x, config.target.y, config.target.z);
        }
        break;
        
      default:
        light = new THREE.PointLight(config.color || 0xffffff, config.intensity || 1);
    }
    
    // Configurar sombras
    if (config.castShadow && this.config.shadows) {
      light.castShadow = true;
      light.shadow.mapSize.width = config.shadowMapSize || 1024;
      light.shadow.mapSize.height = config.shadowMapSize || 1024;
      light.shadow.camera.near = config.shadowNear || 0.5;
      light.shadow.camera.far = config.shadowFar || 500;
    }
    
    this.scene.add(light);
    this.lights.set(entityId, light);
    this.metrics.lightCount++;
    
    console.log(`💡 Luz ${config.type} creada para entidad ${entityId}`);
    return light;
  }

  destroyLight(entityId) {
    const light = this.lights.get(entityId);
    if (light) {
      this.scene.remove(light);
      this.lights.delete(entityId);
      this.metrics.lightCount--;
      return true;
    }
    return false;
  }

  // ========================================
  // CÁMARA Y VIEWPORT
  // ========================================

  updateCamera(cameraData) {
    if (!cameraData) return;
    
    if (cameraData.position) {
      this.camera.position.copy(cameraData.position);
    }
    
    if (cameraData.rotation) {
      this.camera.rotation.copy(cameraData.rotation);
    }
    
    if (cameraData.lookAt) {
      this.camera.lookAt(cameraData.lookAt);
    }
    
    if (cameraData.fov) {
      this.camera.fov = cameraData.fov;
      this.camera.updateProjectionMatrix();
    }
    
    if (cameraData.near !== undefined) {
      this.camera.near = cameraData.near;
      this.camera.updateProjectionMatrix();
    }
    
    if (cameraData.far !== undefined) {
      this.camera.far = cameraData.far;
      this.camera.updateProjectionMatrix();
    }
  }

  handleResize() {
    if (!this.needsResize) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    
    this.needsResize = false;
    console.log(`📏 Renderer redimensionado a ${width}x${height}`);
  }

  // ========================================
  // RENDERIZADO PRINCIPAL
  // ========================================

  update(deltaTime) {
    if (!this.isInitialized) return;
    
    // Manejar redimensionado
    this.handleResize();
    
    // Actualizar animaciones
    this.updateAnimations(deltaTime);
    
    // Actualizar LOD
    if (this.config.enableLOD && this.lodManager) {
      this.updateLOD();
    }
    
    // Actualizar componentes renderizables desde ECS
    this.syncWithECS();
  }

  render() {
    if (!this.isInitialized) return;
    
    const startTime = performance.now();
    
    // Resetear info del renderer
    this.renderer.info.reset();
    
    // Renderizar
    if (this.composer && this.config.enablePostProcessing) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    
    // Actualizar métricas
    this.updateMetrics();
    
    const endTime = performance.now();
    this.metrics.renderTime = endTime - startTime;
  }

  updateAnimations(deltaTime) {
    for (const [entityId, renderable] of this.renderables) {
      if (renderable.mixer) {
        renderable.mixer.update(deltaTime);
      }
    }
  }

  updateLOD() {
    const cameraPosition = this.camera.position;
    
    for (const [entityId, renderable] of this.renderables) {
      if (renderable.lodEnabled && renderable.object3D) {
        this.lodManager.updateLOD(renderable.object3D, cameraPosition);
      }
    }
  }

  syncWithECS() {
    if (!this.engine) return;
    
    // Sincronizar transforms
    const entities = this.engine.getEntitiesWithComponents('transform', 'renderable');
    
    for (const entityId of entities) {
      const transform = this.engine.getComponent(entityId, 'transform');
      const renderableComp = this.engine.getComponent(entityId, 'renderable');
      
      if (transform && renderableComp) {
        this.updateRenderable(entityId, {
          position: transform.data.position,
          rotation: transform.data.rotation,
          scale: transform.data.scale
        });
      }
    }
  }

  updateMetrics() {
    this.metrics.drawCalls = this.renderer.info.render.calls;
    this.metrics.triangles = this.renderer.info.render.triangles;
  }

  // ========================================
  // UTILIDADES
  // ========================================

  screenToWorld(screenX, screenY) {
    const mouse = new THREE.Vector2();
    mouse.x = (screenX / this.config.width) * 2 - 1;
    mouse.y = -(screenY / this.config.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    return raycaster;
  }

  worldToScreen(worldPosition) {
    const vector = worldPosition.clone();
    vector.project(this.camera);
    
    const x = (vector.x * 0.5 + 0.5) * this.config.width;
    const y = (vector.y * -0.5 + 0.5) * this.config.height;
    
    return { x, y, z: vector.z };
  }

  takeScreenshot(width = 1920, height = 1080) {
    const originalSize = this.renderer.getSize(new THREE.Vector2());
    
    // Cambiar resolución temporalmente
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    // Renderizar
    this.renderer.render(this.scene, this.camera);
    
    // Obtener datos de imagen
    const canvas = this.renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');
    
    // Restaurar resolución original
    this.renderer.setSize(originalSize.x, originalSize.y, false);
    this.camera.aspect = originalSize.x / originalSize.y;
    this.camera.updateProjectionMatrix();
    
    return dataURL;
  }

  // ========================================
  // API PÚBLICA
  // ========================================

  getRenderer() {
    return this.renderer;
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  setQuality(level) {
    switch (level) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.config.shadows = false;
        this.config.enablePostProcessing = false;
        this.renderer.shadowMap.enabled = false;
        break;
        
      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.config.shadows = true;
        this.config.enablePostProcessing = false;
        this.renderer.shadowMap.enabled = true;
        break;
        
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.config.shadows = true;
        this.config.enablePostProcessing = true;
        this.renderer.shadowMap.enabled = true;
        break;
        
      case 'ultra':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.config.shadows = true;
        this.config.enablePostProcessing = true;
        this.renderer.shadowMap.enabled = true;
        this.config.shadowMapSize = 4096;
        break;
    }
    
    console.log(`🎨 Calidad de renderizado ajustada a: ${level}`);
  }

  // ========================================
  // LIMPIEZA
  // ========================================

  destroy() {
    // Limpiar objetos de la escena
    for (const [entityId] of this.renderables) {
      this.destroyRenderable(entityId);
    }
    
    for (const [entityId] of this.lights) {
      this.destroyLight(entityId);
    }
    
    // Limpiar recursos
    for (const [key, geometry] of this.geometries) {
      geometry.dispose();
    }
    
    for (const [key, material] of this.materials) {
      material.dispose();
    }
    
    for (const [key, texture] of this.textures) {
      texture.dispose();
    }
    
    // Limpiar renderer
    if (this.composer) {
      this.composer.dispose();
    }
    
    this.renderer.dispose();
    
    // Remover del DOM
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    console.log('🧹 Motor de renderizado destruido');
  }
}

export default RenderEngine;