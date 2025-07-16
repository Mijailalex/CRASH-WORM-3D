// ========================================
// GENERADOR DE NIVELES PROCEDURAL AVANZADO
// Sistema de generación de mundos 3D dinámicos
// ========================================

import * as THREE from 'three';
import { BaseSystem } from '../core/GameEngine.js';

export class LevelGenerator extends BaseSystem {
  constructor(config = {}) {
    super('levelGenerator', 15);
    
    this.config = {
      chunkSize: config.chunkSize || 500,
      maxChunks: config.maxChunks || 25,
      preloadDistance: config.preloadDistance || 2,
      unloadDistance: config.unloadDistance || 4,
      seed: config.seed || Math.random(),
      biomes: config.biomes || ['forest', 'desert', 'ice', 'volcano', 'space', 'underground'],
      difficulty: config.difficulty || 'normal',
      platformDensity: config.platformDensity || 0.3,
      enemyDensity: config.enemyDensity || 0.15,
      collectibleDensity: config.collectibleDensity || 0.25,
      heightVariation: config.heightVariation || 150,
      enableSecrets: config.enableSecrets !== false,
      enableEvents: config.enableEvents !== false,
      ...config
    };

    // Gestión de chunks
    this.chunks = new Map();
    this.loadedChunks = new Set();
    this.chunkQueue = [];
    this.generationQueue = [];
    
    // Sistema de ruido procedural
    this.noiseGenerators = {
      terrain: null,
      biome: null,
      density: null,
      height: null,
      temperature: null,
      humidity: null
    };
    
    // Plantillas y patrones
    this.biomeTemplates = new Map();
    this.structureTemplates = new Map();
    this.pathTemplates = new Map();
    
    // Estadísticas de generación
    this.stats = {
      chunksGenerated: 0,
      chunksLoaded: 0,
      entitiesCreated: 0,
      generationTime: 0,
      memoryUsage: 0
    };
    
    // Cache de generación
    this.entityCache = new Map();
    this.materialCache = new Map();
    this.geometryCache = new Map();
    
    this.init();
  }

  init() {
    this.setupNoiseGenerators();
    this.loadBiomeTemplates();
    this.loadStructureTemplates();
    this.setupPathGeneration();
    
    console.log('🌍 Generador de niveles inicializado');
  }

  // ========================================
  // CONFIGURACIÓN DE GENERADORES DE RUIDO
  // ========================================

  setupNoiseGenerators() {
    // Implementación de ruido Perlin/Simplex simplificado
    const createNoiseGenerator = (seed, scale = 1, octaves = 4, persistence = 0.5) => {
      const permutation = this.generatePermutation(seed);
      
      return {
        noise2D: (x, y) => {
          let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
          value += this.perlinNoise2D(x * frequency, y * frequency, permutation) * amplitude;
          maxValue += amplitude;
          amplitude *= persistence;
          frequency *= 2;
        }
        
        return value / maxValue;
        },
        
        noise3D: (x, y, z) => {
          let value = 0;
          let amplitude = 1;
          let frequency = scale;
          let maxValue = 0;
          
          for (let i = 0; i < octaves; i++) {
            value += this.perlinNoise3D(x * frequency, y * frequency, z * frequency, permutation) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
          }
          
          return value / maxValue;
        }
      };
    };
    
    // Generadores especializados
    this.noiseGenerators.terrain = createNoiseGenerator(this.config.seed, 0.01, 6, 0.6);
    this.noiseGenerators.biome = createNoiseGenerator(this.config.seed + 1000, 0.005, 3, 0.5);
    this.noiseGenerators.density = createNoiseGenerator(this.config.seed + 2000, 0.02, 4, 0.4);
    this.noiseGenerators.height = createNoiseGenerator(this.config.seed + 3000, 0.008, 5, 0.7);
    this.noiseGenerators.temperature = createNoiseGenerator(this.config.seed + 4000, 0.003, 2, 0.3);
    this.noiseGenerators.humidity = createNoiseGenerator(this.config.seed + 5000, 0.004, 3, 0.4);
  }

  generatePermutation(seed) {
    const rng = this.seededRandom(seed);
    const permutation = Array.from({ length: 256 }, (_, i) => i);
    
    // Fisher-Yates shuffle con seed
    for (let i = permutation.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
    
    return [...permutation, ...permutation];
  }

  seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    
    return () => {
      s = s * 16807 % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  perlinNoise2D(x, y, perm) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const a = perm[X] + Y;
    const b = perm[X + 1] + Y;
    
    return this.lerp(v,
      this.lerp(u, this.grad2D(perm[a], x, y), this.grad2D(perm[b], x - 1, y)),
      this.lerp(u, this.grad2D(perm[a + 1], x, y - 1), this.grad2D(perm[b + 1], x - 1, y - 1))
    );
  }

  perlinNoise3D(x, y, z, perm) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    const a = perm[X] + Y;
    const aa = perm[a] + Z;
    const ab = perm[a + 1] + Z;
    const b = perm[X + 1] + Y;
    const ba = perm[b] + Z;
    const bb = perm[b + 1] + Z;
    
    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad3D(perm[aa], x, y, z), this.grad3D(perm[ba], x - 1, y, z)),
        this.lerp(u, this.grad3D(perm[ab], x, y - 1, z), this.grad3D(perm[bb], x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad3D(perm[aa + 1], x, y, z - 1), this.grad3D(perm[ba + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad3D(perm[ab + 1], x, y - 1, z - 1), this.grad3D(perm[bb + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  
  grad2D(hash, x, y) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  
  grad3D(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  // ========================================
  // PLANTILLAS DE BIOMAS
  // ========================================

  loadBiomeTemplates() {
    // Bioma Bosque
    this.biomeTemplates.set('forest', {
      name: 'Bosque Encantado',
      baseHeight: 0,
      heightVariation: 100,
      temperature: 0.6,
      humidity: 0.8,
      
      platforms: [
        {
          type: 'wood',
          probability: 0.6,
          materials: {
            color: '#8B4513',
            roughness: 0.8,
            metalness: 0.1,
            normalMap: 'wood_normal.jpg'
          },
          sizes: [
            { width: 30, height: 8, depth: 30, weight: 0.5 },
            { width: 50, height: 12, depth: 50, weight: 0.3 },
            { width: 20, height: 6, depth: 20, weight: 0.2 }
          ]
        },
        {
          type: 'stone',
          probability: 0.3,
          materials: {
            color: '#696969',
            roughness: 0.9,
            metalness: 0.0
          },
          sizes: [
            { width: 40, height: 15, depth: 40, weight: 0.7 },
            { width: 25, height: 10, depth: 25, weight: 0.3 }
          ]
        },
        {
          type: 'mushroom',
          probability: 0.1,
          materials: {
            color: '#FF6347',
            roughness: 0.4,
            metalness: 0.0,
            emissive: '#FF2222',
            emissiveIntensity: 0.2
          },
          sizes: [
            { width: 35, height: 20, depth: 35, weight: 1.0 }
          ]
        }
      ],
      
      enemies: [
        {
          type: 'forestGuardian',
          probability: 0.1,
          config: { health: 80, speed: 1.5, aggressiveness: 0.6 }
        },
        {
          type: 'wildBoar',
          probability: 0.3,
          config: { health: 40, speed: 2.0, aggressiveness: 0.8 }
        },
        {
          type: 'firefly',
          probability: 0.4,
          config: { health: 10, speed: 3.0, aggressiveness: 0.2 }
        }
      ],
      
      collectibles: [
        {
          type: 'emerald',
          probability: 0.3,
          value: 50,
          effects: ['glow', 'particles']
        },
        {
          type: 'acorn',
          probability: 0.5,
          value: 10,
          effects: ['sparkle']
        },
        {
          type: 'crystalShard',
          probability: 0.1,
          value: 200,
          effects: ['glow', 'particles', 'sound']
        }
      ],
      
      decorations: [
        {
          type: 'tree',
          probability: 0.4,
          variants: ['oak', 'pine', 'birch']
        },
        {
          type: 'bush',
          probability: 0.6,
          variants: ['berry', 'flower', 'fern']
        },
        {
          type: 'rock',
          probability: 0.2,
          variants: ['small', 'medium', 'large']
        }
      ],
      
      lighting: {
        ambient: { color: '#404040', intensity: 0.4 },
        directional: { color: '#90EE90', intensity: 0.8, position: [50, 100, 50] },
        fog: { color: '#228B22', near: 50, far: 300 }
      },
      
      sounds: {
        ambient: 'forest_ambience.ogg',
        music: 'forest_theme.ogg'
      }
    });

    // Bioma Desierto
    this.biomeTemplates.set('desert', {
      name: 'Desierto Ardiente',
      baseHeight: -20,
      heightVariation: 80,
      temperature: 0.9,
      humidity: 0.1,
      
      platforms: [
        {
          type: 'sand',
          probability: 0.5,
          materials: {
            color: '#F4A460',
            roughness: 1.0,
            metalness: 0.0
          },
          sizes: [
            { width: 40, height: 10, depth: 40, weight: 0.6 },
            { width: 60, height: 15, depth: 60, weight: 0.4 }
          ]
        },
        {
          type: 'sandstone',
          probability: 0.4,
          materials: {
            color: '#CD853F',
            roughness: 0.8,
            metalness: 0.0
          },
          sizes: [
            { width: 35, height: 20, depth: 35, weight: 1.0 }
          ]
        },
        {
          type: 'oasis',
          probability: 0.1,
          materials: {
            color: '#87CEEB',
            roughness: 0.1,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
          },
          sizes: [
            { width: 50, height: 5, depth: 50, weight: 1.0 }
          ]
        }
      ],
      
      enemies: [
        {
          type: 'sandWorm',
          probability: 0.1,
          config: { health: 120, speed: 1.0, aggressiveness: 0.9 }
        },
        {
          type: 'scorpion',
          probability: 0.3,
          config: { health: 30, speed: 1.5, aggressiveness: 0.7 }
        },
        {
          type: 'vulture',
          probability: 0.2,
          config: { health: 25, speed: 2.5, aggressiveness: 0.5 }
        }
      ],
      
      collectibles: [
        {
          type: 'gold',
          probability: 0.4,
          value: 75,
          effects: ['shine']
        },
        {
          type: 'ruby',
          probability: 0.2,
          value: 150,
          effects: ['glow', 'particles']
        },
        {
          type: 'ancientCoin',
          probability: 0.1,
          value: 300,
          effects: ['glow', 'rotate', 'sound']
        }
      ],
      
      decorations: [
        {
          type: 'cactus',
          probability: 0.3,
          variants: ['saguaro', 'barrel', 'prickly']
        },
        {
          type: 'dune',
          probability: 0.5,
          variants: ['small', 'medium', 'large']
        },
        {
          type: 'bone',
          probability: 0.1,
          variants: ['skull', 'ribcage', 'femur']
        }
      ],
      
      lighting: {
        ambient: { color: '#FFB347', intensity: 0.6 },
        directional: { color: '#FFA500', intensity: 1.2, position: [100, 150, 100] },
        fog: { color: '#DEB887', near: 100, far: 500 }
      },
      
      sounds: {
        ambient: 'desert_wind.ogg',
        music: 'desert_theme.ogg'
      }
    });

    // Bioma Hielo
    this.biomeTemplates.set('ice', {
      name: 'Tundra Helada',
      baseHeight: 20,
      heightVariation: 120,
      temperature: 0.1,
      humidity: 0.3,
      
      platforms: [
        {
          type: 'ice',
          probability: 0.6,
          materials: {
            color: '#87CEEB',
            roughness: 0.1,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
          },
          sizes: [
            { width: 45, height: 12, depth: 45, weight: 0.7 },
            { width: 30, height: 8, depth: 30, weight: 0.3 }
          ]
        },
        {
          type: 'snow',
          probability: 0.3,
          materials: {
            color: '#FFFAFA',
            roughness: 0.9,
            metalness: 0.0
          },
          sizes: [
            { width: 50, height: 15, depth: 50, weight: 1.0 }
          ]
        },
        {
          type: 'crystal',
          probability: 0.1,
          materials: {
            color: '#E0FFFF',
            roughness: 0.0,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9,
            emissive: '#87CEEB',
            emissiveIntensity: 0.3
          },
          sizes: [
            { width: 25, height: 25, depth: 25, weight: 1.0 }
          ]
        }
      ],
      
      enemies: [
        {
          type: 'frostGiant',
          probability: 0.1,
          config: { health: 150, speed: 0.8, aggressiveness: 0.8 }
        },
        {
          type: 'iceBeast',
          probability: 0.2,
          config: { health: 60, speed: 1.2, aggressiveness: 0.6 }
        },
        {
          type: 'snowball',
          probability: 0.4,
          config: { health: 15, speed: 2.0, aggressiveness: 0.4 }
        }
      ],
      
      collectibles: [
        {
          type: 'diamond',
          probability: 0.2,
          value: 200,
          effects: ['glow', 'particles', 'rotate']
        },
        {
          type: 'iceGem',
          probability: 0.4,
          value: 80,
          effects: ['glow', 'frost']
        },
        {
          type: 'frozenOrb',
          probability: 0.1,
          value: 400,
          effects: ['glow', 'particles', 'sound', 'freeze']
        }
      ],
      
      decorations: [
        {
          type: 'icicle',
          probability: 0.3,
          variants: ['small', 'medium', 'large']
        },
        {
          type: 'snowdrift',
          probability: 0.5,
          variants: ['mound', 'pile', 'bank']
        },
        {
          type: 'frozenTree',
          probability: 0.2,
          variants: ['pine', 'bare', 'crystalline']
        }
      ],
      
      lighting: {
        ambient: { color: '#B0E0E6', intensity: 0.5 },
        directional: { color: '#F0F8FF', intensity: 0.9, position: [80, 120, 80] },
        fog: { color: '#E6E6FA', near: 80, far: 400 }
      },
      
      sounds: {
        ambient: 'ice_wind.ogg',
        music: 'ice_theme.ogg'
      }
    });

    console.log(`🗺️ ${this.biomeTemplates.size} plantillas de bioma cargadas`);
  }

  // ========================================
  // ESTRUCTURAS Y PATRONES
  // ========================================

  loadStructureTemplates() {
    // Puente
    this.structureTemplates.set('bridge', {
      name: 'Puente Suspendido',
      size: { width: 100, height: 30, depth: 20 },
      components: [
        {
          type: 'platform',
          positions: [
            { x: 0, y: 0, z: 0, size: { width: 100, height: 5, depth: 20 } }
          ],
          material: 'wood'
        },
        {
          type: 'support',
          positions: [
            { x: -40, y: 15, z: 0, size: { width: 5, height: 30, depth: 5 } },
            { x: 40, y: 15, z: 0, size: { width: 5, height: 30, depth: 5 } }
          ],
          material: 'rope'
        }
      ],
      spawns: [
        { type: 'collectible', position: { x: 0, y: 10, z: 0 }, probability: 0.8 }
      ]
    });

    // Torre
    this.structureTemplates.set('tower', {
      name: 'Torre Antigua',
      size: { width: 40, height: 120, depth: 40 },
      components: [
        {
          type: 'platform',
          positions: [
            { x: 0, y: 0, z: 0, size: { width: 40, height: 10, depth: 40 } },
            { x: 0, y: 30, z: 0, size: { width: 35, height: 8, depth: 35 } },
            { x: 0, y: 60, z: 0, size: { width: 30, height: 8, depth: 30 } },
            { x: 0, y: 90, z: 0, size: { width: 25, height: 8, depth: 25 } },
            { x: 0, y: 110, z: 0, size: { width: 20, height: 10, depth: 20 } }
          ],
          material: 'stone'
        }
      ],
      spawns: [
        { type: 'enemy', position: { x: 0, y: 35, z: 0 }, probability: 0.6 },
        { type: 'collectible', position: { x: 0, y: 120, z: 0 }, probability: 1.0 }
      ]
    });

    // Laberinto
    this.structureTemplates.set('maze', {
      name: 'Laberinto Perdido',
      size: { width: 200, height: 40, depth: 200 },
      generator: 'maze', // Generación procedural especial
      parameters: {
        cellSize: 20,
        wallHeight: 25,
        pathWidth: 10,
        deadEndProbability: 0.3
      }
    });

    console.log(`🏗️ ${this.structureTemplates.size} plantillas de estructura cargadas`);
  }

  setupPathGeneration() {
    this.pathTemplates.set('main', {
      width: 15,
      material: 'stone',
      elevation: 2,
      branches: true,
      branchProbability: 0.3,
      decorations: true
    });

    this.pathTemplates.set('secret', {
      width: 8,
      material: 'wood',
      elevation: 1,
      hidden: true,
      branches: false,
      decorations: false
    });
  }

  // ========================================
  // GENERACIÓN DE CHUNKS
  // ========================================

  generateChunk(chunkX, chunkZ, forceGenerate = false) {
    const chunkKey = `${chunkX}_${chunkZ}`;
    
    if (this.chunks.has(chunkKey) && !forceGenerate) {
      return this.chunks.get(chunkKey);
    }

    const startTime = performance.now();
    
    const chunk = {
      id: chunkKey,
      x: chunkX,
      z: chunkZ,
      position: {
        x: chunkX * this.config.chunkSize,
        z: chunkZ * this.config.chunkSize
      },
      size: this.config.chunkSize,
      
      // Datos del terreno
      biome: null,
      baseHeight: 0,
      heightMap: [],
      temperatureMap: [],
      humidityMap: [],
      
      // Entidades generadas
      platforms: [],
      enemies: [],
      collectibles: [],
      decorations: [],
      structures: [],
      paths: [],
      
      // Metadatos
      generated: false,
      loaded: false,
      entities: new Set(),
      difficulty: this.calculateChunkDifficulty(chunkX, chunkZ),
      
      // Eventos especiales
      events: [],
      secrets: []
    };

    // Generar datos base del chunk
    this.generateChunkTerrain(chunk);
    this.determineChunkBiome(chunk);
    this.generateChunkPlatforms(chunk);
    this.generateChunkEnemies(chunk);
    this.generateChunkCollectibles(chunk);
    this.generateChunkDecorations(chunk);
    this.generateChunkStructures(chunk);
    this.generateChunkPaths(chunk);
    this.generateChunkEvents(chunk);
    this.generateChunkSecrets(chunk);

    chunk.generated = true;
    this.chunks.set(chunkKey, chunk);
    this.stats.chunksGenerated++;

    const endTime = performance.now();
    this.stats.generationTime += endTime - startTime;

    console.log(`🌍 Chunk ${chunkKey} generado en ${(endTime - startTime).toFixed(2)}ms`);
    
    return chunk;
  }

  generateChunkTerrain(chunk) {
    const resolution = 32;
    const worldX = chunk.position.x;
    const worldZ = chunk.position.z;
    
    for (let x = 0; x < resolution; x++) {
      chunk.heightMap[x] = [];
      chunk.temperatureMap[x] = [];
      chunk.humidityMap[x] = [];
      
      for (let z = 0; z < resolution; z++) {
        const sampleX = worldX + (x / resolution) * chunk.size;
        const sampleZ = worldZ + (z / resolution) * chunk.size;
        
        // Generar altura del terreno
        const height = this.noiseGenerators.height.noise2D(sampleX, sampleZ) * this.config.heightVariation;
        chunk.heightMap[x][z] = height;
        
        // Generar temperatura y humedad
        const temperature = (this.noiseGenerators.temperature.noise2D(sampleX, sampleZ) + 1) * 0.5;
        const humidity = (this.noiseGenerators.humidity.noise2D(sampleX, sampleZ) + 1) * 0.5;
        
        chunk.temperatureMap[x][z] = temperature;
        chunk.humidityMap[x][z] = humidity;
      }
    }
    
    // Calcular altura base del chunk
    let totalHeight = 0;
    for (let x = 0; x < resolution; x++) {
      for (let z = 0; z < resolution; z++) {
        totalHeight += chunk.heightMap[x][z];
      }
    }
    chunk.baseHeight = totalHeight / (resolution * resolution);
  }

  determineChunkBiome(chunk) {
    const worldX = chunk.position.x;
    const worldZ = chunk.position.z;
    
    // Usar ruido para determinar bioma
    const biomeNoise = this.noiseGenerators.biome.noise2D(worldX, worldZ);
    const temperature = this.getAverageTemperature(chunk);
    const humidity = this.getAverageHumidity(chunk);
    
    // Matriz de biomas basada en temperatura y humedad
    if (temperature < 0.3) {
      chunk.biome = humidity > 0.5 ? 'ice' : 'tundra';
    } else if (temperature > 0.7) {
      chunk.biome = humidity < 0.3 ? 'desert' : 'savanna';
    } else {
      chunk.biome = humidity > 0.6 ? 'forest' : 'plains';
    }
    
    // Biomas especiales basados en ruido
    if (biomeNoise > 0.8) {
      chunk.biome = 'volcano';
    } else if (biomeNoise < -0.8) {
      chunk.biome = 'underground';
    }
    
    // Fallback a biomas disponibles
    if (!this.biomeTemplates.has(chunk.biome)) {
      chunk.biome = Array.from(this.biomeTemplates.keys())[
        Math.floor(Math.abs(biomeNoise) * this.biomeTemplates.size)
      ];
    }
  }

  getAverageTemperature(chunk) {
    let total = 0;
    const resolution = chunk.temperatureMap.length;
    
    for (let x = 0; x < resolution; x++) {
      for (let z = 0; z < resolution; z++) {
        total += chunk.temperatureMap[x][z];
      }
    }
    
    return total / (resolution * resolution);
  }

  getAverageHumidity(chunk) {
    let total = 0;
    const resolution = chunk.humidityMap.length;
    
    for (let x = 0; x < resolution; x++) {
      for (let z = 0; z < resolution; z++) {
        total += chunk.humidityMap[x][z];
      }
    }
    
    return total / (resolution * resolution);
  }

  generateChunkPlatforms(chunk) {
    const biomeTemplate = this.biomeTemplates.get(chunk.biome);
    if (!biomeTemplate) return;
    
    const density = this.config.platformDensity * this.getDifficultyMultiplier(chunk.difficulty);
    const platformCount = Math.floor(density * 100); // Aprox. 30 plataformas por chunk
    
    for (let i = 0; i < platformCount; i++) {
      const x = chunk.position.x + (Math.random() - 0.5) * chunk.size * 0.8;
      const z = chunk.position.z + (Math.random() - 0.5) * chunk.size * 0.8;
      const y = chunk.baseHeight + this.sampleHeightAt(chunk, x, z) + Math.random() * 50;
      
      // Seleccionar tipo de plataforma
      const platformType = this.selectRandomWeighted(biomeTemplate.platforms);
      const platformSize = this.selectRandomWeighted(platformType.sizes);
      
      const platform = {
        id: `platform_${chunk.id}_${i}`,
        type: platformType.type,
        position: { x, y, z },
        size: { ...platformSize },
        rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
        material: platformType.materials,
        stable: Math.random() > 0.1,
        moving: Math.random() < 0.15,
        breakable: Math.random() < 0.05,
        chunkId: chunk.id
      };
      
      if (platform.moving) {
        platform.movement = {
          type: Math.random() > 0.5 ? 'horizontal' : 'vertical',
          speed: 0.5 + Math.random() * 1.5,
          range: 30 + Math.random() * 70,
          phase: Math.random() * Math.PI * 2
        };
      }
      
      chunk.platforms.push(platform);
    }
  }

  generateChunkEnemies(chunk) {
    const biomeTemplate = this.biomeTemplates.get(chunk.biome);
    if (!biomeTemplate) return;
    
    const density = this.config.enemyDensity * this.getDifficultyMultiplier(chunk.difficulty);
    const enemyCount = Math.floor(density * chunk.platforms.length);
    
    for (let i = 0; i < enemyCount; i++) {
      if (chunk.platforms.length === 0) break;
      
      const platform = chunk.platforms[Math.floor(Math.random() * chunk.platforms.length)];
      const enemyType = this.selectRandomWeighted(biomeTemplate.enemies);
      
      const enemy = {
        id: `enemy_${chunk.id}_${i}`,
        type: enemyType.type,
        position: {
          x: platform.position.x + (Math.random() - 0.5) * platform.size.width * 0.8,
          y: platform.position.y + platform.size.height + 10,
          z: platform.position.z + (Math.random() - 0.5) * platform.size.depth * 0.8
        },
        config: {
          ...enemyType.config,
          health: enemyType.config.health * this.getDifficultyMultiplier(chunk.difficulty),
          speed: enemyType.config.speed * (0.8 + Math.random() * 0.4)
        },
        behavior: {
          type: 'patrol',
          center: { ...platform.position },
          radius: Math.min(platform.size.width, platform.size.depth) / 2,
          aggressiveness: enemyType.config.aggressiveness
        },
        chunkId: chunk.id
      };
      
      chunk.enemies.push(enemy);
    }
  }

  generateChunkCollectibles(chunk) {
    const biomeTemplate = this.biomeTemplates.get(chunk.biome);
    if (!biomeTemplate) return;
    
    const density = this.config.collectibleDensity;
    const collectibleCount = Math.floor(density * chunk.platforms.length);
    
    for (let i = 0; i < collectibleCount; i++) {
      if (chunk.platforms.length === 0) break;
      
      const platform = chunk.platforms[Math.floor(Math.random() * chunk.platforms.length)];
      const collectibleType = this.selectRandomWeighted(biomeTemplate.collectibles);
      
      const collectible = {
        id: `collectible_${chunk.id}_${i}`,
        type: collectibleType.type,
        value: collectibleType.value * this.getDifficultyMultiplier(chunk.difficulty),
        position: {
          x: platform.position.x + (Math.random() - 0.5) * platform.size.width * 0.6,
          y: platform.position.y + platform.size.height + 15,
          z: platform.position.z + (Math.random() - 0.5) * platform.size.depth * 0.6
        },
        effects: [...collectibleType.effects],
        animation: {
          type: 'float',
          speed: 0.02 + Math.random() * 0.01,
          amplitude: 5 + Math.random() * 5,
          rotation: Math.random() * 0.05
        },
        chunkId: chunk.id
      };
      
      chunk.collectibles.push(collectible);
    }
  }

  generateChunkDecorations(chunk) {
    const biomeTemplate = this.biomeTemplates.get(chunk.biome);
    if (!biomeTemplate || !biomeTemplate.decorations) return;
    
    const decorationCount = Math.floor(chunk.size / 10); // Densidad basada en tamaño
    
    for (let i = 0; i < decorationCount; i++) {
      const decorationType = this.selectRandomWeighted(biomeTemplate.decorations);
      const variant = decorationType.variants[
        Math.floor(Math.random() * decorationType.variants.length)
      ];
      
      const x = chunk.position.x + (Math.random() - 0.5) * chunk.size;
      const z = chunk.position.z + (Math.random() - 0.5) * chunk.size;
      const y = chunk.baseHeight + this.sampleHeightAt(chunk, x, z);
      
      const decoration = {
        id: `decoration_${chunk.id}_${i}`,
        type: decorationType.type,
        variant,
        position: { x, y, z },
        rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
        scale: 0.8 + Math.random() * 0.4,
        chunkId: chunk.id
      };
      
      chunk.decorations.push(decoration);
    }
  }

  generateChunkStructures(chunk) {
    // Probabilidad de generar estructuras especiales
    if (Math.random() > 0.3) return;
    
    const structureTypes = Array.from(this.structureTemplates.keys());
    if (structureTypes.length === 0) return;
    
    const structureType = structureTypes[Math.floor(Math.random() * structureTypes.length)];
    const template = this.structureTemplates.get(structureType);
    
    const x = chunk.position.x + (Math.random() - 0.5) * chunk.size * 0.6;
    const z = chunk.position.z + (Math.random() - 0.5) * chunk.size * 0.6;
    const y = chunk.baseHeight + this.sampleHeightAt(chunk, x, z);
    
    const structure = {
      id: `structure_${chunk.id}_${structureType}`,
      type: structureType,
      template,
      position: { x, y, z },
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      chunkId: chunk.id,
      generated: false
    };
    
    chunk.structures.push(structure);
  }

  generateChunkPaths(chunk) {
    // Generar caminos que conecten con chunks adyacentes
    const pathTemplate = this.pathTemplates.get('main');
    
    // Camino horizontal (conecta este-oeste)
    if (Math.random() > 0.4) {
      const path = {
        id: `path_h_${chunk.id}`,
        type: 'horizontal',
        points: [
          { x: chunk.position.x - chunk.size/2, z: chunk.position.z },
          { x: chunk.position.x + chunk.size/2, z: chunk.position.z }
        ],
        width: pathTemplate.width,
        material: pathTemplate.material,
        chunkId: chunk.id
      };
      
      chunk.paths.push(path);
    }
    
    // Camino vertical (conecta norte-sur)
    if (Math.random() > 0.4) {
      const path = {
        id: `path_v_${chunk.id}`,
        type: 'vertical',
        points: [
          { x: chunk.position.x, z: chunk.position.z - chunk.size/2 },
          { x: chunk.position.x, z: chunk.position.z + chunk.size/2 }
        ],
        width: pathTemplate.width,
        material: pathTemplate.material,
        chunkId: chunk.id
      };
      
      chunk.paths.push(path);
    }
  }

  generateChunkEvents(chunk) {
    if (!this.config.enableEvents) return;
    
    // Eventos especiales aleatorios
    const events = [
      {
        type: 'platformCollapse',
        probability: 0.1,
        config: { delay: 30000, warning: 5000 }
      },
      {
        type: 'enemyWave',
        probability: 0.05,
        config: { waveSize: 3, interval: 10000 }
      },
      {
        type: 'treasureRain',
        probability: 0.02,
        config: { duration: 15000, intensity: 5 }
      }
    ];
    
    for (const eventTemplate of events) {
      if (Math.random() < eventTemplate.probability) {
        const event = {
          id: `event_${chunk.id}_${eventTemplate.type}`,
          type: eventTemplate.type,
          config: { ...eventTemplate.config },
          triggered: false,
          chunkId: chunk.id
        };
        
        chunk.events.push(event);
      }
    }
  }

  generateChunkSecrets(chunk) {
    if (!this.config.enableSecrets) return;
    
    // Áreas secretas
    if (Math.random() < 0.15) {
      const secret = {
        id: `secret_${chunk.id}`,
        type: 'hiddenArea',
        position: {
          x: chunk.position.x + (Math.random() - 0.5) * chunk.size * 0.8,
          y: chunk.baseHeight + 100 + Math.random() * 50,
          z: chunk.position.z + (Math.random() - 0.5) * chunk.size * 0.8
        },
        size: { width: 80, height: 40, depth: 80 },
        reward: {
          type: 'collectibles',
          count: 5 + Math.floor(Math.random() * 10),
          quality: 'rare'
        },
        discovered: false,
        chunkId: chunk.id
      };
      
      chunk.secrets.push(secret);
    }
  }

  // ========================================
  // GESTIÓN DE CHUNKS
  // ========================================

  update(deltaTime) {
    if (!this.engine) return;
    
    // Obtener posición del jugador
    const playerEntity = this.getPlayerEntity();
    if (!playerEntity) return;
    
    const playerPos = this.getPlayerPosition(playerEntity);
    if (!playerPos) return;
    
    // Determinar chunks necesarios
    const requiredChunks = this.getRequiredChunks(playerPos);
    
    // Cargar chunks necesarios
    this.loadRequiredChunks(requiredChunks);
    
    // Descargar chunks lejanos
    this.unloadDistantChunks(playerPos);
    
    // Procesar cola de generación
    this.processGenerationQueue();
  }

  getPlayerEntity() {
    if (!this.engine) return null;
    
    const entities = this.engine.getEntitiesWithComponents('transform', 'player');
    return entities.length > 0 ? entities[0] : null;
  }

  getPlayerPosition(playerEntity) {
    const transform = this.engine.getComponent(playerEntity, 'transform');
    return transform ? transform.data.position : null;
  }

  getRequiredChunks(playerPos) {
    const playerChunkX = Math.floor(playerPos.x / this.config.chunkSize);
    const playerChunkZ = Math.floor(playerPos.z / this.config.chunkSize);
    const requiredChunks = [];
    
    const distance = this.config.preloadDistance;
    
    for (let x = -distance; x <= distance; x++) {
      for (let z = -distance; z <= distance; z++) {
        requiredChunks.push({
          x: playerChunkX + x,
          z: playerChunkZ + z,
          key: `${playerChunkX + x}_${playerChunkZ + z}`,
          distance: Math.sqrt(x * x + z * z)
        });
      }
    }
    
    return requiredChunks.sort((a, b) => a.distance - b.distance);
  }

  loadRequiredChunks(requiredChunks) {
    for (const chunkInfo of requiredChunks) {
      if (!this.chunks.has(chunkInfo.key)) {
        if (this.generationQueue.length < 10) { // Limitar cola
          this.generationQueue.push(chunkInfo);
        }
      } else if (!this.loadedChunks.has(chunkInfo.key)) {
        this.loadChunk(chunkInfo.key);
      }
    }
  }

  unloadDistantChunks(playerPos) {
    const playerChunkX = Math.floor(playerPos.x / this.config.chunkSize);
    const playerChunkZ = Math.floor(playerPos.z / this.config.chunkSize);
    const maxDistance = this.config.unloadDistance;
    
    for (const chunkKey of this.loadedChunks) {
      const [chunkX, chunkZ] = chunkKey.split('_').map(Number);
      const distance = Math.sqrt(
        Math.pow(chunkX - playerChunkX, 2) + 
        Math.pow(chunkZ - playerChunkZ, 2)
      );
      
      if (distance > maxDistance) {
        this.unloadChunk(chunkKey);
      }
    }
  }

  processGenerationQueue() {
    if (this.generationQueue.length === 0) return;
    
    // Procesar un chunk por frame para mantener rendimiento
    const chunkInfo = this.generationQueue.shift();
    const chunk = this.generateChunk(chunkInfo.x, chunkInfo.z);
    this.loadChunk(chunk.id);
  }

  loadChunk(chunkKey) {
    const chunk = this.chunks.get(chunkKey);
    if (!chunk || chunk.loaded) return;
    
    // Crear entidades en el ECS
    this.createChunkEntities(chunk);
    
    chunk.loaded = true;
    this.loadedChunks.add(chunkKey);
    this.stats.chunksLoaded++;
    
    console.log(`📦 Chunk ${chunkKey} cargado`);
  }

  unloadChunk(chunkKey) {
    const chunk = this.chunks.get(chunkKey);
    if (!chunk || !chunk.loaded) return;
    
    // Destruir entidades del ECS
    this.destroyChunkEntities(chunk);
    
    chunk.loaded = false;
    this.loadedChunks.delete(chunkKey);
    
    console.log(`📤 Chunk ${chunkKey} descargado`);
  }

  createChunkEntities(chunk) {
    if (!this.engine) return;
    
    // Crear plataformas
    for (const platform of chunk.platforms) {
      const entityId = this.engine.createEntity(platform.id);
      
      this.engine.addComponent(entityId, 'transform', {
        position: platform.position,
        rotation: platform.rotation,
        scale: { x: 1, y: 1, z: 1 }
      });
      
      this.engine.addComponent(entityId, 'renderable', {
        geometry: {
          type: 'box',
          width: platform.size.width,
          height: platform.size.height,
          depth: platform.size.depth
        },
        material: {
          type: 'standard',
          ...platform.material
        },
        castShadow: true,
        receiveShadow: true
      });
      
      this.engine.addComponent(entityId, 'platform', {
        type: platform.type,
        stable: platform.stable,
        moving: platform.moving,
        movement: platform.movement
      });
      
      if (this.engine.getSystem('physics')) {
        this.engine.getSystem('physics').createRigidBody(entityId, {
          type: 'static',
          position: platform.position
        });
        
        this.engine.getSystem('physics').createCollider(entityId, 'box', {
          size: new THREE.Vector3(platform.size.width, platform.size.height, platform.size.depth)
        });
      }
      
      chunk.entities.add(entityId);
      this.stats.entitiesCreated++;
    }
    
    // Crear enemigos
    for (const enemy of chunk.enemies) {
      const entityId = this.engine.createEntity(enemy.id);
      
      this.engine.addComponent(entityId, 'transform', {
        position: enemy.position,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      });
      
      this.engine.addComponent(entityId, 'renderable', {
        geometry: { type: 'sphere', radius: 1 },
        material: {
          type: 'standard',
          color: '#FF4444',
          roughness: 0.4,
          metalness: 0.2
        },
        castShadow: true
      });
      
      this.engine.addComponent(entityId, 'enemy', {
        type: enemy.type,
        health: enemy.config.health,
        maxHealth: enemy.config.health,
        speed: enemy.config.speed,
        behavior: enemy.behavior
      });
      
      chunk.entities.add(entityId);
      this.stats.entitiesCreated++;
    }
    
    // Crear coleccionables
    for (const collectible of chunk.collectibles) {
      const entityId = this.engine.createEntity(collectible.id);
      
      this.engine.addComponent(entityId, 'transform', {
        position: collectible.position,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      });
      
      this.engine.addComponent(entityId, 'renderable', {
        geometry: { type: 'box', width: 1, height: 1, depth: 1 },
        material: {
          type: 'standard',
          color: '#FFD700',
          roughness: 0.1,
          metalness: 0.8,
          emissive: '#FFD700',
          emissiveIntensity: 0.3
        },
        castShadow: true
      });
      
      this.engine.addComponent(entityId, 'collectible', {
        type: collectible.type,
        value: collectible.value,
        effects: collectible.effects,
        animation: collectible.animation
      });
      
      chunk.entities.add(entityId);
      this.stats.entitiesCreated++;
    }
  }

  destroyChunkEntities(chunk) {
    if (!this.engine) return;
    
    for (const entityId of chunk.entities) {
      this.engine.destroyEntity(entityId);
    }
    
    chunk.entities.clear();
  }

  // ========================================
  // UTILIDADES
  // ========================================

  selectRandomWeighted(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.probability || item.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= (item.probability || item.weight || 1);
      if (random <= 0) {
        return item;
      }
    }
    
    return items[items.length - 1];
  }

  calculateChunkDifficulty(chunkX, chunkZ) {
    const distance = Math.sqrt(chunkX * chunkX + chunkZ * chunkZ);
    return Math.min(1.0, distance / 20); // Dificultad aumenta con distancia del origen
  }

  getDifficultyMultiplier(difficulty) {
    const difficultyMap = {
      easy: 0.7,
      normal: 1.0,
      hard: 1.4,
      extreme: 2.0
    };
    
    const baseDifficulty = difficultyMap[this.config.difficulty] || 1.0;
    return baseDifficulty * (1 + difficulty * 0.5);
  }

  sampleHeightAt(chunk, worldX, worldZ) {
    const localX = ((worldX - chunk.position.x) / chunk.size + 0.5) * chunk.heightMap.length;
    const localZ = ((worldZ - chunk.position.z) / chunk.size + 0.5) * chunk.heightMap[0].length;
    
    const x = Math.max(0, Math.min(chunk.heightMap.length - 1, Math.floor(localX)));
    const z = Math.max(0, Math.min(chunk.heightMap[0].length - 1, Math.floor(localZ)));
    
    return chunk.heightMap[x] ? chunk.heightMap[x][z] || 0 : 0;
  }

  // ========================================
  // API PÚBLICA
  // ========================================

  getChunk(chunkX, chunkZ) {
    return this.chunks.get(`${chunkX}_${chunkZ}`);
  }

  getChunkAt(worldX, worldZ) {
    const chunkX = Math.floor(worldX / this.config.chunkSize);
    const chunkZ = Math.floor(worldZ / this.config.chunkSize);
    return this.getChunk(chunkX, chunkZ);
  }

  isChunkLoaded(chunkX, chunkZ) {
    return this.loadedChunks.has(`${chunkX}_${chunkZ}`);
  }

  getLoadedChunks() {
    return Array.from(this.loadedChunks);
  }

  getStats() {
    return {
      ...this.stats,
      loadedChunks: this.loadedChunks.size,
      totalChunks: this.chunks.size,
      queueSize: this.generationQueue.length
    };
  }

  regenerateChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX}_${chunkZ}`;
    
    if (this.chunks.has(chunkKey)) {
      const chunk = this.chunks.get(chunkKey);
      if (chunk.loaded) {
        this.unloadChunk(chunkKey);
      }
      this.chunks.delete(chunkKey);
    }
    
    return this.generateChunk(chunkX, chunkZ, true);
  }

  // ========================================
  // LIMPIEZA
  // ========================================

  destroy() {
    // Descargar todos los chunks
    for (const chunkKey of this.loadedChunks) {
      this.unloadChunk(chunkKey);
    }
    
    // Limpiar datos
    this.chunks.clear();
    this.loadedChunks.clear();
    this.generationQueue.length = 0;
    this.chunkQueue.length = 0;
    
    // Limpiar caches
    this.entityCache.clear();
    this.materialCache.clear();
    this.geometryCache.clear();
    
    console.log('🧹 Generador de niveles destruido');
  }
}

export default LevelGenerator;