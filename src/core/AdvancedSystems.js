// ========================================
// SISTEMAS AVANZADOS DEL JUEGO
// Physics, AI, Procedural Generation, Performance
// ========================================

import * as THREE from 'three';
import { EventBus } from './GameEngine';

// ========================================
// SISTEMA DE FÍSICA AVANZADO
// ========================================

export class AdvancedPhysicsSystem {
  constructor(config = {}) {
    this.config = {
      gravity: config.gravity || { x: 0, y: -9.81, z: 0 },
      airResistance: config.airResistance || 0.02,
      groundFriction: config.groundFriction || 0.8,
      bounceDamping: config.bounceDamping || 0.7,
      maxVelocity: config.maxVelocity || 50,
      ...config
    };

    this.bodies = new Map();
    this.collisionPairs = new Set();
    this.eventBus = new EventBus();
    
    this.spatialGrid = new SpatialHashGrid(100); // Para optimización de colisiones
  }

  addBody(entityId, bodyData) {
    const body = {
      entityId,
      position: bodyData.position || { x: 0, y: 0, z: 0 },
      velocity: bodyData.velocity || { x: 0, y: 0, z: 0 },
      acceleration: bodyData.acceleration || { x: 0, y: 0, z: 0 },
      mass: bodyData.mass || 1,
      size: bodyData.size || { x: 1, y: 1, z: 1 },
      type: bodyData.type || 'dynamic', // dynamic, kinematic, static
      material: {
        friction: bodyData.friction || 0.8,
        restitution: bodyData.restitution || 0.3,
        density: bodyData.density || 1
      },
      isGrounded: false,
      lastGroundTime: 0,
      forces: []
    };

    this.bodies.set(entityId, body);
    this.spatialGrid.insert(entityId, body.position, body.size);
    return body;
  }

  removeBody(entityId) {
    this.bodies.delete(entityId);
    this.spatialGrid.remove(entityId);
  }

  addForce(entityId, force, duration = 0) {
    const body = this.bodies.get(entityId);
    if (!body) return;

    body.forces.push({
      x: force.x || 0,
      y: force.y || 0,
      z: force.z || 0,
      duration: duration,
      timestamp: Date.now()
    });
  }

  update(deltaTime) {
    const dt = deltaTime / 1000; // Convertir a segundos

    // Integración de física
    this.integratePhysics(dt);
    
    // Detección de colisiones optimizada
    this.detectCollisions();
    
    // Resolver colisiones
    this.resolveCollisions();
    
    // Limpiar fuerzas expiradas
    this.cleanupForces();
  }

  integratePhysics(dt) {
    for (const [entityId, body] of this.bodies) {
      if (body.type === 'static') continue;

      // Aplicar gravedad
      body.acceleration.x = this.config.gravity.x;
      body.acceleration.y = this.config.gravity.y;
      body.acceleration.z = this.config.gravity.z;

      // Aplicar fuerzas
      for (const force of body.forces) {
        const forceFactor = force.duration > 0 ? 
          Math.max(0, 1 - (Date.now() - force.timestamp) / (force.duration * 1000)) : 1;
        
        body.acceleration.x += (force.x / body.mass) * forceFactor;
        body.acceleration.y += (force.y / body.mass) * forceFactor;
        body.acceleration.z += (force.z / body.mass) * forceFactor;
      }

      // Integración de velocidad (Verlet)
      body.velocity.x += body.acceleration.x * dt;
      body.velocity.y += body.acceleration.y * dt;
      body.velocity.z += body.acceleration.z * dt;

      // Aplicar resistencia del aire
      const airFactor = Math.pow(1 - this.config.airResistance, dt);
      body.velocity.x *= airFactor;
      body.velocity.z *= airFactor;

      // Aplicar fricción del suelo si está en el suelo
      if (body.isGrounded) {
        const frictionFactor = Math.pow(this.config.groundFriction, dt);
        body.velocity.x *= frictionFactor;
        body.velocity.z *= frictionFactor;
      }

      // Limitar velocidad máxima
      const speed = Math.sqrt(
        body.velocity.x * body.velocity.x + 
        body.velocity.y * body.velocity.y + 
        body.velocity.z * body.velocity.z
      );
      
      if (speed > this.config.maxVelocity) {
        const factor = this.config.maxVelocity / speed;
        body.velocity.x *= factor;
        body.velocity.y *= factor;
        body.velocity.z *= factor;
      }

      // Integración de posición
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
      body.position.z += body.velocity.z * dt;

      // Actualizar grid espacial
      this.spatialGrid.update(entityId, body.position, body.size);
    }
  }

  detectCollisions() {
    this.collisionPairs.clear();
    
    // Usar grid espacial para reducir complejidad
    const potentialPairs = this.spatialGrid.getBroadPhasePairs();
    
    for (const [id1, id2] of potentialPairs) {
      const body1 = this.bodies.get(id1);
      const body2 = this.bodies.get(id2);
      
      if (!body1 || !body2) continue;
      
      const collision = this.checkCollision(body1, body2);
      if (collision) {
        this.collisionPairs.add({ body1, body2, collision });
      }
    }
  }

  checkCollision(body1, body2) {
    // AABB (Axis-Aligned Bounding Box) collision detection
    const dx = Math.abs(body1.position.x - body2.position.x);
    const dy = Math.abs(body1.position.y - body2.position.y);
    const dz = Math.abs(body1.position.z - body2.position.z);
    
    const combinedWidth = (body1.size.x + body2.size.x) / 2;
    const combinedHeight = (body1.size.y + body2.size.y) / 2;
    const combinedDepth = (body1.size.z + body2.size.z) / 2;
    
    if (dx < combinedWidth && dy < combinedHeight && dz < combinedDepth) {
      // Calcular penetración y normal
      const overlapX = combinedWidth - dx;
      const overlapY = combinedHeight - dy;
      const overlapZ = combinedDepth - dz;
      
      // Encontrar el eje de menor penetración
      let normal = { x: 0, y: 0, z: 0 };
      let penetration = 0;
      
      if (overlapX <= overlapY && overlapX <= overlapZ) {
        penetration = overlapX;
        normal.x = body1.position.x > body2.position.x ? 1 : -1;
      } else if (overlapY <= overlapZ) {
        penetration = overlapY;
        normal.y = body1.position.y > body2.position.y ? 1 : -1;
      } else {
        penetration = overlapZ;
        normal.z = body1.position.z > body2.position.z ? 1 : -1;
      }
      
      return { normal, penetration };
    }
    
    return null;
  }

  resolveCollisions() {
    for (const { body1, body2, collision } of this.collisionPairs) {
      this.resolveCollision(body1, body2, collision);
      
      // Emitir evento de colisión
      this.eventBus.emit('collision', {
        entity1: body1.entityId,
        entity2: body2.entityId,
        normal: collision.normal,
        penetration: collision.penetration
      });
    }
  }

  resolveCollision(body1, body2, collision) {
    const { normal, penetration } = collision;
    
    // Separar cuerpos
    const totalMass = body1.mass + body2.mass;
    const separation1 = penetration * (body2.mass / totalMass);
    const separation2 = penetration * (body1.mass / totalMass);
    
    if (body1.type === 'dynamic') {
      body1.position.x += normal.x * separation1;
      body1.position.y += normal.y * separation1;
      body1.position.z += normal.z * separation1;
    }
    
    if (body2.type === 'dynamic') {
      body2.position.x -= normal.x * separation2;
      body2.position.y -= normal.y * separation2;
      body2.position.z -= normal.z * separation2;
    }
    
    // Resolver velocidades
    const relativeVelocity = {
      x: body1.velocity.x - body2.velocity.x,
      y: body1.velocity.y - body2.velocity.y,
      z: body1.velocity.z - body2.velocity.z
    };
    
    const velocityAlongNormal = 
      relativeVelocity.x * normal.x + 
      relativeVelocity.y * normal.y + 
      relativeVelocity.z * normal.z;
    
    if (velocityAlongNormal > 0) return; // Objetos separándose
    
    const restitution = Math.min(body1.material.restitution, body2.material.restitution);
    const j = -(1 + restitution) * velocityAlongNormal / totalMass;
    
    const impulse = {
      x: j * normal.x,
      y: j * normal.y,
      z: j * normal.z
    };
    
    if (body1.type === 'dynamic') {
      body1.velocity.x += impulse.x * body2.mass / totalMass;
      body1.velocity.y += impulse.y * body2.mass / totalMass;
      body1.velocity.z += impulse.z * body2.mass / totalMass;
    }
    
    if (body2.type === 'dynamic') {
      body2.velocity.x -= impulse.x * body1.mass / totalMass;
      body2.velocity.y -= impulse.y * body1.mass / totalMass;
      body2.velocity.z -= impulse.z * body1.mass / totalMass;
    }
    
    // Detectar si está en el suelo
    if (normal.y > 0.7) {
      body1.isGrounded = true;
      body1.lastGroundTime = Date.now();
    }
    if (normal.y < -0.7) {
      body2.isGrounded = true;
      body2.lastGroundTime = Date.now();
    }
  }

  cleanupForces() {
    const currentTime = Date.now();
    
    for (const body of this.bodies.values()) {
      body.forces = body.forces.filter(force => 
        force.duration === 0 || (currentTime - force.timestamp) < (force.duration * 1000)
      );
      
      // Resetear estado de suelo si no ha tocado el suelo recientemente
      if (currentTime - body.lastGroundTime > 100) {
        body.isGrounded = false;
      }
    }
  }
}

// ========================================
// SPATIAL HASH GRID PARA OPTIMIZACIÓN
// ========================================

class SpatialHashGrid {
  constructor(cellSize = 10) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.objectToCells = new Map();
  }

  hash(x, z) {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  insert(objectId, position, size) {
    this.remove(objectId); // Remover posición anterior
    
    const cells = this.getCellsForObject(position, size);
    this.objectToCells.set(objectId, cells);
    
    for (const cellKey of cells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, new Set());
      }
      this.grid.get(cellKey).add(objectId);
    }
  }

  remove(objectId) {
    const cells = this.objectToCells.get(objectId);
    if (cells) {
      for (const cellKey of cells) {
        const cell = this.grid.get(cellKey);
        if (cell) {
          cell.delete(objectId);
          if (cell.size === 0) {
            this.grid.delete(cellKey);
          }
        }
      }
      this.objectToCells.delete(objectId);
    }
  }

  update(objectId, position, size) {
    this.insert(objectId, position, size);
  }

  getCellsForObject(position, size) {
    const cells = new Set();
    
    const minX = position.x - size.x / 2;
    const maxX = position.x + size.x / 2;
    const minZ = position.z - size.z / 2;
    const maxZ = position.z + size.z / 2;
    
    const startCellX = Math.floor(minX / this.cellSize);
    const endCellX = Math.floor(maxX / this.cellSize);
    const startCellZ = Math.floor(minZ / this.cellSize);
    const endCellZ = Math.floor(maxZ / this.cellSize);
    
    for (let x = startCellX; x <= endCellX; x++) {
      for (let z = startCellZ; z <= endCellZ; z++) {
        cells.add(`${x},${z}`);
      }
    }
    
    return cells;
  }

  getBroadPhasePairs() {
    const pairs = new Set();
    
    for (const cell of this.grid.values()) {
      const objects = Array.from(cell);
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const pair = [objects[i], objects[j]].sort();
          pairs.add(pair);
        }
      }
    }
    
    return pairs;
  }
}

// ========================================
// SISTEMA DE IA AVANZADO
// ========================================

export class AISystem {
  constructor() {
    this.aiEntities = new Map();
    this.behaviorTrees = new Map();
    this.pathfinder = new Pathfinder();
  }

  addAIEntity(entityId, aiConfig) {
    const aiEntity = {
      entityId,
      type: aiConfig.type || 'basic',
      state: aiConfig.initialState || 'idle',
      targetEntity: null,
      lastKnownPlayerPosition: null,
      alertness: 0,
      patrolPoints: aiConfig.patrolPoints || [],
      currentPatrolIndex: 0,
      behaviorTree: this.createBehaviorTree(aiConfig.type),
      memory: {
        lastSeen: new Map(),
        sounds: [],
        damage: []
      }
    };

    this.aiEntities.set(entityId, aiEntity);
    return aiEntity;
  }

  createBehaviorTree(type) {
    switch (type) {
      case 'guard':
        return new GuardBehaviorTree();
      case 'hunter':
        return new HunterBehaviorTree();
      case 'patrol':
        return new PatrolBehaviorTree();
      default:
        return new BasicBehaviorTree();
    }
  }

  update(deltaTime, gameState) {
    for (const [entityId, aiEntity] of this.aiEntities) {
      this.updateAIEntity(aiEntity, deltaTime, gameState);
    }
  }

  updateAIEntity(aiEntity, deltaTime, gameState) {
    // Actualizar percepción
    this.updatePerception(aiEntity, gameState);
    
    // Ejecutar árbol de comportamiento
    const action = aiEntity.behaviorTree.execute(aiEntity, gameState);
    
    // Aplicar acción
    this.executeAction(aiEntity, action, gameState);
    
    // Actualizar memoria
    this.updateMemory(aiEntity, deltaTime);
  }

  updatePerception(aiEntity, gameState) {
    const entity = gameState.entities.get(aiEntity.entityId);
    if (!entity) return;

    const playerEntity = gameState.entities.get('player');
    if (!playerEntity) return;

    // Calcular distancia al jugador
    const distance = this.calculateDistance(entity.position, playerEntity.position);
    
    // Detección visual
    if (distance < 20 && this.hasLineOfSight(entity.position, playerEntity.position, gameState)) {
      aiEntity.lastKnownPlayerPosition = { ...playerEntity.position };
      aiEntity.alertness = Math.min(100, aiEntity.alertness + 10);
      aiEntity.memory.lastSeen.set('player', Date.now());
    }
    
    // Detección auditiva
    if (distance < 15 && playerEntity.velocity && this.calculateSpeed(playerEntity.velocity) > 5) {
      aiEntity.alertness = Math.min(100, aiEntity.alertness + 5);
    }
    
    // Reducir alerta con el tiempo
    aiEntity.alertness = Math.max(0, aiEntity.alertness - 1);
  }

  hasLineOfSight(from, to, gameState) {
    // Raycast simplificado
    const direction = {
      x: to.x - from.x,
      y: to.y - from.y,
      z: to.z - from.z
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    const steps = Math.ceil(distance);
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const checkPoint = {
        x: from.x + direction.x * t,
        y: from.y + direction.y * t,
        z: from.z + direction.z * t
      };
      
      // Verificar colisiones con obstáculos
      if (this.isPointBlocked(checkPoint, gameState)) {
        return false;
      }
    }
    
    return true;
  }

  isPointBlocked(point, gameState) {
    // Verificar colisiones con plataformas y obstáculos
    for (const [entityId, entity] of gameState.entities) {
      if (entity.type === 'platform' || entity.type === 'wall') {
        if (this.pointInBounds(point, entity.position, entity.size)) {
          return true;
        }
      }
    }
    return false;
  }

  pointInBounds(point, center, size) {
    return (
      point.x >= center.x - size.x / 2 && point.x <= center.x + size.x / 2 &&
      point.y >= center.y - size.y / 2 && point.y <= center.y + size.y / 2 &&
      point.z >= center.z - size.z / 2 && point.z <= center.z + size.z / 2
    );
  }

  calculateDistance(pos1, pos2) {
    return Math.sqrt(
      (pos1.x - pos2.x) ** 2 +
      (pos1.y - pos2.y) ** 2 +
      (pos1.z - pos2.z) ** 2
    );
  }

  calculateSpeed(velocity) {
    return Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
  }

  executeAction(aiEntity, action, gameState) {
    const entity = gameState.entities.get(aiEntity.entityId);
    if (!entity) return;

    switch (action.type) {
      case 'move':
        this.moveTowards(entity, action.target, action.speed || 5);
        break;
      case 'patrol':
        this.patrol(aiEntity, entity);
        break;
      case 'chase':
        this.chasePlayer(aiEntity, entity, gameState);
        break;
      case 'search':
        this.searchArea(aiEntity, entity, action.area);
        break;
      case 'attack':
        this.attack(entity, action.target);
        break;
      case 'idle':
        this.idle(entity);
        break;
    }
  }

  moveTowards(entity, target, speed) {
    const direction = {
      x: target.x - entity.position.x,
      y: 0, // No movimiento en Y para enemigos terrestres
      z: target.z - entity.position.z
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.z ** 2);
    if (distance > 0.1) {
      entity.velocity.x = (direction.x / distance) * speed;
      entity.velocity.z = (direction.z / distance) * speed;
    }
  }

  patrol(aiEntity, entity) {
    if (aiEntity.patrolPoints.length === 0) return;
    
    const currentTarget = aiEntity.patrolPoints[aiEntity.currentPatrolIndex];
    const distance = this.calculateDistance(entity.position, currentTarget);
    
    if (distance < 2) {
      aiEntity.currentPatrolIndex = (aiEntity.currentPatrolIndex + 1) % aiEntity.patrolPoints.length;
    } else {
      this.moveTowards(entity, currentTarget, 3);
    }
  }

  chasePlayer(aiEntity, entity, gameState) {
    if (aiEntity.lastKnownPlayerPosition) {
      this.moveTowards(entity, aiEntity.lastKnownPlayerPosition, 8);
    }
  }

  searchArea(aiEntity, entity, area) {
    // Implementar búsqueda en área
    this.moveTowards(entity, area.center, 4);
  }

  attack(entity, target) {
    // Implementar ataque
    console.log(`Entity ${entity.id} attacking ${target.id}`);
  }

  idle(entity) {
    entity.velocity.x *= 0.9;
    entity.velocity.z *= 0.9;
  }

  updateMemory(aiEntity, deltaTime) {
    const currentTime = Date.now();
    
    // Limpiar memoria antigua
    for (const [key, timestamp] of aiEntity.memory.lastSeen) {
      if (currentTime - timestamp > 30000) { // 30 segundos
        aiEntity.memory.lastSeen.delete(key);
      }
    }
    
    // Limpiar sonidos antiguos
    aiEntity.memory.sounds = aiEntity.memory.sounds.filter(
      sound => currentTime - sound.timestamp < 10000
    );
  }
}

// ========================================
// BEHAVIOR TREES
// ========================================

class BehaviorNode {
  execute(aiEntity, gameState) {
    throw new Error('Execute method must be implemented');
  }
}

class SequenceNode extends BehaviorNode {
  constructor(children) {
    super();
    this.children = children;
  }

  execute(aiEntity, gameState) {
    for (const child of this.children) {
      const result = child.execute(aiEntity, gameState);
      if (result.status !== 'success') {
        return result;
      }
    }
    return { status: 'success' };
  }
}

class SelectorNode extends BehaviorNode {
  constructor(children) {
    super();
    this.children = children;
  }

  execute(aiEntity, gameState) {
    for (const child of this.children) {
      const result = child.execute(aiEntity, gameState);
      if (result.status === 'success') {
        return result;
      }
    }
    return { status: 'failure' };
  }
}

class GuardBehaviorTree extends BehaviorNode {
  execute(aiEntity, gameState) {
    if (aiEntity.alertness > 50) {
      return { status: 'success', type: 'chase' };
    } else if (aiEntity.alertness > 20) {
      return { status: 'success', type: 'search', area: { center: aiEntity.lastKnownPlayerPosition } };
    } else {
      return { status: 'success', type: 'patrol' };
    }
  }
}

class BasicBehaviorTree extends BehaviorNode {
  execute(aiEntity, gameState) {
    return { status: 'success', type: 'idle' };
  }
}

// ========================================
// PATHFINDER (A* simplificado)
// ========================================

class Pathfinder {
  constructor() {
    this.grid = null;
    this.gridSize = 1;
  }

  findPath(start, end, obstacles = []) {
    // Implementación simplificada de A*
    const path = [];
    const direction = {
      x: end.x - start.x,
      z: end.z - start.z
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.z ** 2);
    const steps = Math.ceil(distance / this.gridSize);
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      path.push({
        x: start.x + direction.x * t,
        z: start.z + direction.z * t
      });
    }
    
    return path;
  }
}

// ========================================
// SISTEMA DE GENERACIÓN PROCEDURAL
// ========================================

export class ProceduralSystem {
  constructor(config = {}) {
    this.config = {
      chunkSize: config.chunkSize || 100,
      maxChunks: config.maxChunks || 9,
      biomes: config.biomes || ['forest', 'desert', 'ice', 'volcano'],
      noiseScale: config.noiseScale || 0.1,
      ...config
    };
    
    this.loadedChunks = new Map();
    this.chunkQueue = [];
    this.noise = new SimplexNoise();
    this.biomeTransitions = new Map();
    this.platformTemplates = this.initializePlatformTemplates();
  }

  initializePlatformTemplates() {
    return {
      basic: {
        size: { x: 10, y: 2, z: 10 },
        probability: 0.6,
        variants: ['stone', 'wood', 'metal']
      },
      jump: {
        size: { x: 5, y: 1, z: 5 },
        probability: 0.3,
        spacing: { min: 8, max: 15 }
      },
      moving: {
        size: { x: 8, y: 2, z: 8 },
        probability: 0.1,
        speed: 2,
        pattern: 'linear' // linear, circular, pendulum
      }
    };
  }

  generateChunk(chunkX, chunkZ, biome = 'forest') {
    const chunkKey = `${chunkX}_${chunkZ}`;
    
    if (this.loadedChunks.has(chunkKey)) {
      return this.loadedChunks.get(chunkKey);
    }

    const chunk = {
      x: chunkX,
      z: chunkZ,
      biome: biome,
      platforms: [],
      enemies: [],
      collectibles: [],
      decorations: [],
      generated: false
    };

    // Generar contenido del chunk
    this.generatePlatforms(chunk);
    this.generateEnemies(chunk);
    this.generateCollectibles(chunk);
    this.generateDecorations(chunk);

    chunk.generated = true;
    this.loadedChunks.set(chunkKey, chunk);
    
    // Gestionar memoria de chunks
    this.manageChunkMemory();
    
    return chunk;
  }

  generatePlatforms(chunk) {
    const centerX = chunk.x * this.config.chunkSize;
    const centerZ = chunk.z * this.config.chunkSize;
    
    const platformCount = 15 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < platformCount; i++) {
      const localX = (Math.random() - 0.5) * this.config.chunkSize;
      const localZ = (Math.random() - 0.5) * this.config.chunkSize;
      
      const worldX = centerX + localX;
      const worldZ = centerZ + localZ;
      
      // Usar ruido para generar altura
      const height = this.noise.noise2D(
        worldX * this.config.noiseScale,
        worldZ * this.config.noiseScale
      ) * 30 + 10;
      
      // Seleccionar tipo de plataforma
      const platformType = this.selectPlatformType();
      const template = this.platformTemplates[platformType];
      
      const platform = {
        id: `platform_${chunk.x}_${chunk.z}_${i}`,
        type: platformType,
        position: { x: worldX, y: height, z: worldZ },
        size: { ...template.size },
        material: this.getBiomeMaterial(chunk.biome),
        variant: template.variants ? 
          template.variants[Math.floor(Math.random() * template.variants.length)] : 
          'default'
      };
      
      // Propiedades especiales según el tipo
      if (platformType === 'moving') {
        platform.movement = {
          pattern: template.pattern,
          speed: template.speed,
          amplitude: 10 + Math.random() * 10,
          phase: Math.random() * Math.PI * 2
        };
      }
      
      chunk.platforms.push(platform);
    }
  }

  generateEnemies(chunk) {
    const difficulty = Math.abs(chunk.x) + Math.abs(chunk.z); // Dificultad basada en distancia
    const enemyCount = Math.min(2 + Math.floor(difficulty / 2), 8);
    
    for (let i = 0; i < enemyCount; i++) {
      const enemy = {
        id: `enemy_${chunk.x}_${chunk.z}_${i}`,
        type: this.selectEnemyType(difficulty),
        position: this.getRandomChunkPosition(chunk),
        health: 30 + difficulty * 5,
        speed: 3 + Math.random() * 2,
        aiType: Math.random() > 0.7 ? 'guard' : 'patrol',
        patrolRadius: 10 + Math.random() * 15
      };
      
      chunk.enemies.push(enemy);
    }
  }

  generateCollectibles(chunk) {
    const gemCount = 20 + Math.floor(Math.random() * 15);
    const powerupCount = Math.floor(Math.random() * 3);
    
    // Generar gemas
    for (let i = 0; i < gemCount; i++) {
      const collectible = {
        id: `gem_${chunk.x}_${chunk.z}_${i}`,
        type: 'gem',
        subtype: this.selectGemType(),
        position: this.getRandomChunkPosition(chunk),
        value: this.getGemValue(this.selectGemType()),
        effect: null
      };
      
      chunk.collectibles.push(collectible);
    }
    
    // Generar power-ups
    for (let i = 0; i < powerupCount; i++) {
      const powerup = {
        id: `powerup_${chunk.x}_${chunk.z}_${i}`,
        type: 'powerup',
        subtype: this.selectPowerupType(),
        position: this.getRandomChunkPosition(chunk),
        value: 0,
        effect: this.getPowerupEffect(this.selectPowerupType())
      };
      
      chunk.collectibles.push(powerup);
    }
  }

  generateDecorations(chunk) {
    const decorationCount = 30 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i < decorationCount; i++) {
      const decoration = {
        id: `decoration_${chunk.x}_${chunk.z}_${i}`,
        type: this.selectDecorationType(chunk.biome),
        position: this.getRandomChunkPosition(chunk),
        rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
        scale: 0.5 + Math.random() * 1.5
      };
      
      chunk.decorations.push(decoration);
    }
  }

  selectPlatformType() {
    const rand = Math.random();
    if (rand < 0.6) return 'basic';
    if (rand < 0.9) return 'jump';
    return 'moving';
  }

  selectEnemyType(difficulty) {
    if (difficulty < 3) return 'basic';
    if (difficulty < 6) return 'fast';
    if (difficulty < 10) return 'heavy';
    return 'elite';
  }

  selectGemType() {
    const types = ['blue', 'red', 'green', 'yellow', 'purple'];
    return types[Math.floor(Math.random() * types.length)];
  }

  selectPowerupType() {
    const types = ['speed', 'jump', 'health', 'shield', 'magnet'];
    return types[Math.floor(Math.random() * types.length)];
  }

  selectDecorationType(biome) {
    const decorations = {
      forest: ['tree', 'bush', 'rock', 'flower'],
      desert: ['cactus', 'rock', 'sand_dune', 'bones'],
      ice: ['ice_crystal', 'snow_pile', 'frozen_tree'],
      volcano: ['lava_rock', 'ash_pile', 'steam_vent']
    };
    
    const options = decorations[biome] || decorations.forest;
    return options[Math.floor(Math.random() * options.length)];
  }

  getBiomeMaterial(biome) {
    const materials = {
      forest: { color: '#228B22', roughness: 0.8 },
      desert: { color: '#F4A460', roughness: 0.9 },
      ice: { color: '#B0E0E6', roughness: 0.1 },
      volcano: { color: '#8B0000', roughness: 0.7 }
    };
    
    return materials[biome] || materials.forest;
  }

  getRandomChunkPosition(chunk) {
    const centerX = chunk.x * this.config.chunkSize;
    const centerZ = chunk.z * this.config.chunkSize;
    
    return {
      x: centerX + (Math.random() - 0.5) * this.config.chunkSize,
      y: 5 + Math.random() * 20,
      z: centerZ + (Math.random() - 0.5) * this.config.chunkSize
    };
  }

  getGemValue(type) {
    const values = {
      blue: 10,
      red: 15,
      green: 12,
      yellow: 20,
      purple: 50
    };
    return values[type] || 10;
  }

  getPowerupEffect(type) {
    const effects = {
      speed: { type: 'speed_boost', duration: 10000, multiplier: 1.5 },
      jump: { type: 'jump_boost', duration: 15000, multiplier: 1.8 },
      health: { type: 'heal', amount: 50 },
      shield: { type: 'shield', duration: 20000 },
      magnet: { type: 'magnet', duration: 12000, radius: 15 }
    };
    return effects[type] || null;
  }

  manageChunkMemory() {
    if (this.loadedChunks.size > this.config.maxChunks) {
      // Remover chunks más antiguos o más lejanos
      const chunksToRemove = this.loadedChunks.size - this.config.maxChunks;
      const chunkEntries = Array.from(this.loadedChunks.entries());
      
      // Ordenar por distancia al origen (0,0)
      chunkEntries.sort((a, b) => {
        const distA = Math.abs(a[1].x) + Math.abs(a[1].z);
        const distB = Math.abs(b[1].x) + Math.abs(b[1].z);
        return distB - distA;
      });
      
      for (let i = 0; i < chunksToRemove; i++) {
        this.loadedChunks.delete(chunkEntries[i][0]);
      }
    }
  }

  getChunk(chunkX, chunkZ) {
    return this.loadedChunks.get(`${chunkX}_${chunkZ}`);
  }

  getLoadedChunks() {
    return Array.from(this.loadedChunks.values());
  }
}

// ========================================
// SIMPLEX NOISE (Implementación básica)
// ========================================

class SimplexNoise {
  constructor() {
    this.perm = new Array(512);
    this.permMod12 = new Array(512);
    
    const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(x, y) {
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0, n1, n2;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }
}

// ========================================
// EXPORTACIONES
// ========================================

export { AISystem, ProceduralSystem, SimplexNoise };