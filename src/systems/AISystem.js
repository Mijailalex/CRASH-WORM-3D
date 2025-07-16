// ========================================
// SISTEMA DE INTELIGENCIA ARTIFICIAL AVANZADO
// IA comportamental para enemigos y NPCs
// ========================================

import * as THREE from 'three';
import { BaseSystem } from '../core/GameEngine.js';

export class AISystem extends BaseSystem {
  constructor(config = {}) {
    super('ai', 20);
    
    this.config = {
      maxAIEntities: config.maxAIEntities || 100,
      updateFrequency: config.updateFrequency || 60, // FPS para IA
      detectionRange: config.detectionRange || 150,
      pathfindingEnabled: config.pathfindingEnabled !== false,
      flockingEnabled: config.flockingEnabled !== false,
      emergentBehavior: config.emergentBehavior !== false,
      adaptiveDifficulty: config.adaptiveDifficulty !== false,
      debugMode: config.debugMode || false,
      ...config
    };

    // Entidades con IA
    this.aiEntities = new Map();
    this.behaviorStates = new Map();
    this.pathfindingGrid = null;
    
    // Sistemas de comportamiento
    this.behaviors = new Map();
    this.flocks = new Map();
    this.formations = new Map();
    
    // Sistema de pathfinding
    this.pathfinder = null;
    this.pathCache = new Map();
    
    // Sistema de toma de decisiones
    this.decisionTrees = new Map();
    this.utilityFunctions = new Map();
    
    // Sistema de comunicación entre AIs
    this.aiCommunication = {
      alerts: new Map(),
      groupTargets: new Map(),
      formations: new Map()
    };
    
    // Métricas y análisis
    this.metrics = {
      entitiesProcessed: 0,
      pathsCalculated: 0,
      decisionsPerSecond: 0,
      averageProcessingTime: 0,
      behaviorSwitches: 0
    };
    
    // Contadores de tiempo
    this.updateTimer = 0;
    this.frameCounter = 0;
    
    this.init();
  }

  init() {
    this.setupBehaviorTypes();
    this.setupDecisionTrees();
    this.setupUtilityFunctions();
    this.setupPathfinding();
    this.setupFlocking();
    this.setupCommunicationSystem();
    
    console.log('🤖 Sistema de IA inicializado');
  }

  // ========================================
  // CONFIGURACIÓN DE COMPORTAMIENTOS
  // ========================================

  setupBehaviorTypes() {
    // Comportamiento de Patrullaje
    this.behaviors.set('patrol', {
      name: 'Patrol',
      priority: 1,
      
      enter: (entityId, aiComponent) => {
        aiComponent.data.patrolIndex = 0;
        aiComponent.data.patrolDirection = 1;
        if (!aiComponent.data.patrolPoints || aiComponent.data.patrolPoints.length === 0) {
          this.generatePatrolPoints(entityId, aiComponent);
        }
      },
      
      update: (entityId, aiComponent, deltaTime) => {
        const transform = this.engine.getComponent(entityId, 'transform');
        if (!transform || !aiComponent.data.patrolPoints) return;
        
        const currentPos = transform.data.position;
        const targetPoint = aiComponent.data.patrolPoints[aiComponent.data.patrolIndex];
        
        if (!targetPoint) return;
        
        const distance = currentPos.distanceTo(new THREE.Vector3(targetPoint.x, targetPoint.y, targetPoint.z));
        
        if (distance < 5) {
          // Llegó al punto, cambiar al siguiente
          aiComponent.data.patrolIndex += aiComponent.data.patrolDirection;
          
          if (aiComponent.data.patrolIndex >= aiComponent.data.patrolPoints.length) {
            aiComponent.data.patrolIndex = aiComponent.data.patrolPoints.length - 2;
            aiComponent.data.patrolDirection = -1;
          } else if (aiComponent.data.patrolIndex < 0) {
            aiComponent.data.patrolIndex = 1;
            aiComponent.data.patrolDirection = 1;
          }
        }
        
        // Mover hacia el objetivo
        this.moveToTarget(entityId, targetPoint, aiComponent.data.speed || 2);
      },
      
      exit: (entityId, aiComponent) => {
        // Limpiar datos específicos del patrullaje
      }
    });

    // Comportamiento de Persecución
    this.behaviors.set('chase', {
      name: 'Chase',
      priority: 3,
      
      enter: (entityId, aiComponent) => {
        aiComponent.data.chaseStartTime = Date.now();
        aiComponent.data.lastKnownTargetPosition = null;
      },
      
      update: (entityId, aiComponent, deltaTime) => {
        const target = this.findTarget(entityId, aiComponent);
        if (!target) {
          // Perdió el objetivo, cambiar a búsqueda
          this.changeState(entityId, 'search');
          return;
        }
        
        const targetTransform = this.engine.getComponent(target, 'transform');
        if (!targetTransform) return;
        
        const targetPos = targetTransform.data.position;
        aiComponent.data.lastKnownTargetPosition = { ...targetPos };
        
        // Usar pathfinding si está disponible
        if (this.config.pathfindingEnabled) {
          this.moveToTargetWithPathfinding(entityId, targetPos, aiComponent.data.speed * 1.5 || 3);
        } else {
          this.moveToTarget(entityId, targetPos, aiComponent.data.speed * 1.5 || 3);
        }
        
        // Verificar si puede atacar
        const distance = this.getDistanceToTarget(entityId, target);
        if (distance < (aiComponent.data.attackRange || 15)) {
          this.changeState(entityId, 'attack');
        }
      },
      
      exit: (entityId, aiComponent) => {
        aiComponent.data.chaseStartTime = null;
      }
    });

    // Comportamiento de Ataque
    this.behaviors.set('attack', {
      name: 'Attack',
      priority: 4,
      
      enter: (entityId, aiComponent) => {
        aiComponent.data.attackCooldown = 0;
        aiComponent.data.attackStartTime = Date.now();
      },
      
      update: (entityId, aiComponent, deltaTime) => {
        const target = this.findTarget(entityId, aiComponent);
        if (!target) {
          this.changeState(entityId, 'search');
          return;
        }
        
        const distance = this.getDistanceToTarget(entityId, target);
        if (distance > (aiComponent.data.attackRange || 15)) {
          this.changeState(entityId, 'chase');
          return;
        }
        
        // Cooldown de ataque
        aiComponent.data.attackCooldown -= deltaTime;
        if (aiComponent.data.attackCooldown <= 0) {
          this.performAttack(entityId, target, aiComponent);
          aiComponent.data.attackCooldown = aiComponent.data.attackSpeed || 1000; // ms
        }
        
        // Mantenerse cerca del objetivo
        this.faceTarget(entityId, target);
      },
      
      exit: (entityId, aiComponent) => {
        aiComponent.data.attackStartTime = null;
      }
    });

    // Comportamiento de Búsqueda
    this.behaviors.set('search', {
      name: 'Search',
      priority: 2,
      
      enter: (entityId, aiComponent) => {
        aiComponent.data.searchStartTime = Date.now();
        aiComponent.data.searchPoints = this.generateSearchPoints(entityId, aiComponent);
        aiComponent.data.currentSearchIndex = 0;
      },
      
      update: (entityId, aiComponent, deltaTime) => {
        // Buscar objetivo mientras se mueve
        const target = this.findTarget(entityId, aiComponent);
        if (target) {
          this.changeState(entityId, 'chase');
          return;
        }
        
        // Moverse a puntos de búsqueda
        if (aiComponent.data.searchPoints && aiComponent.data.searchPoints.length > 0) {
          const currentPoint = aiComponent.data.searchPoints[aiComponent.data.currentSearchIndex];
          const transform = this.engine.getComponent(entityId, 'transform');
          
          if (transform && currentPoint) {
            const distance = transform.data.position.distanceTo(
              new THREE.Vector3(currentPoint.x, currentPoint.y, currentPoint.z)
            );
            
            if (distance < 10) {
              aiComponent.data.currentSearchIndex = 
                (aiComponent.data.currentSearchIndex + 1) % aiComponent.data.searchPoints.length;
            }
            
            this.moveToTarget(entityId, currentPoint, aiComponent.data.speed || 2);
          }
        }
        
        // Timeout de búsqueda
        if (Date.now() - aiComponent.data.searchStartTime > 10000) {
          this.changeState(entityId, 'patrol');
        }
      },
      
      exit: (entityId, aiComponent) => {
        aiComponent.data.searchPoints = null;
      }
    });

    // Comportamiento de Huida
    this.behaviors.set('flee', {
      name: 'Flee',
      priority: 5,
      
      enter: (entityId, aiComponent) => {
        aiComponent.data.fleeStartTime = Date.now();
        aiComponent.data.fleeDirection = this.calculateFleeDirection(entityId, aiComponent);
      },
      
      update: (entityId, aiComponent, deltaTime) => {
        const target = this.findTarget(entityId, aiComponent);
        if (!target) {
          this.changeState(entityId, 'patrol');
          return;
        }
        
        // Calcular dirección de huida
        const fleeDirection = this.calculateFleeDirection(entityId, aiComponent);
        const transform = this.engine.getComponent(entityId, 'transform');
        
        if (transform && fleeDirection) {
          const currentPos = transform.data.position;
          const fleeTarget = {
            x: currentPos.x + fleeDirection.x * 100,
            y: currentPos.y + fleeDirection.y * 100,
            z: currentPos.z + fleeDirection.z * 100
          };
          
          this.moveToTarget(entityId, fleeTarget, aiComponent.data.speed * 2 || 4);
        }
        
        // Verificar si escapó
        const distance = this.getDistanceToTarget(entityId, target);
        if (distance > (aiComponent.data.detectionRange || 100)) {
          this.changeState(entityId, 'patrol');
        }
      },
      
      exit: (entityId, aiComponent) => {
        aiComponent.data.fleeDirection = null;
      }
    });

    // Comportamiento de Flocking
    this.behaviors.set('flock', {
      name: 'Flock',
      priority: 1,
      
      enter: (entityId, aiComponent) => {
        this.addToFlock(entityId, aiComponent.data.flockId || 'default');
      },
      
      update: (entityId, aiComponent, deltaTime) => {
        const flockForce = this.calculateFlockingForce(entityId, aiComponent);
        if (flockForce) {
          this.applyForce(entityId, flockForce);
        }
      },
      
      exit: (entityId, aiComponent) => {
        this.removeFromFlock(entityId);
      }
    });

    console.log(`🧠 ${this.behaviors.size} tipos de comportamiento registrados`);
  }

  setupDecisionTrees() {
    // Árbol de decisión para enemigos básicos
    this.decisionTrees.set('basicEnemy', {
      evaluate: (entityId, aiComponent) => {
        const health = this.getEntityHealth(entityId);
        const target = this.findTarget(entityId, aiComponent);
        const distance = target ? this.getDistanceToTarget(entityId, target) : Infinity;
        
        // Decisión basada en salud y distancia al objetivo
        if (health < 20) {
          return 'flee';
        } else if (target && distance < 20) {
          return 'attack';
        } else if (target && distance < 100) {
          return 'chase';
        } else if (target && distance < 200) {
          return 'search';
        } else {
          return 'patrol';
        }
      }
    });

    // Árbol de decisión para enemigos de grupo
    this.decisionTrees.set('groupEnemy', {
      evaluate: (entityId, aiComponent) => {
        const allies = this.findNearbyAllies(entityId, 50);
        const enemies = this.findNearbyEnemies(entityId, 100);
        
        if (enemies.length > allies.length * 2) {
          return 'flee';
        } else if (enemies.length > 0 && allies.length >= 2) {
          return 'attack';
        } else if (enemies.length > 0) {
          return 'chase';
        } else {
          return 'patrol';
        }
      }
    });

    // Árbol de decisión para cazadores
    this.decisionTrees.set('hunter', {
      evaluate: (entityId, aiComponent) => {
        const target = this.findTarget(entityId, aiComponent);
        const distance = target ? this.getDistanceToTarget(entityId, target) : Infinity;
        const hasLineOfSight = target ? this.hasLineOfSight(entityId, target) : false;
        
        if (target && hasLineOfSight && distance < 30) {
          return 'attack';
        } else if (target && distance < 150) {
          return 'chase';
        } else if (aiComponent.data.lastKnownTargetPosition) {
          return 'search';
        } else {
          return 'patrol';
        }
      }
    });
  }

  setupUtilityFunctions() {
    // Función de utilidad para selección de objetivos
    this.utilityFunctions.set('targetSelection', {
      evaluate: (entityId, potentialTargets) => {
        const scores = [];
        const transform = this.engine.getComponent(entityId, 'transform');
        if (!transform) return null;
        
        const myPos = transform.data.position;
        
        for (const target of potentialTargets) {
          const targetTransform = this.engine.getComponent(target, 'transform');
          if (!targetTransform) continue;
          
          const targetPos = targetTransform.data.position;
          const distance = myPos.distanceTo(targetPos);
          const health = this.getEntityHealth(target);
          
          // Puntuación basada en distancia y salud del objetivo
          let score = 100;
          score -= distance * 0.5; // Preferir objetivos cercanos
          score += (100 - health) * 0.3; // Preferir objetivos dañados
          
          // Bonus si el objetivo está aislado
          const nearbyAllies = this.findNearbyAllies(target, 50);
          if (nearbyAllies.length === 0) {
            score += 20;
          }
          
          scores.push({ target, score });
        }
        
        // Devolver el objetivo con mayor puntuación
        return scores.length > 0 ? 
          scores.reduce((best, current) => current.score > best.score ? current : best).target : 
          null;
      }
    });

    // Función de utilidad para formaciones
    this.utilityFunctions.set('formationPosition', {
      evaluate: (entityId, formation, role) => {
        const positions = this.calculateFormationPositions(formation, role);
        const transform = this.engine.getComponent(entityId, 'transform');
        if (!transform || !positions) return null;
        
        const myPos = transform.data.position;
        let bestPosition = null;
        let bestScore = -Infinity;
        
        for (const position of positions) {
          const distance = myPos.distanceTo(new THREE.Vector3(position.x, position.y, position.z));
          const crowding = this.calculateCrowdingAt(position);
          
          let score = 100;
          score -= distance * 0.3; // Preferir posiciones cercanas
          score -= crowding * 2; // Evitar aglomeraciones
          
          if (score > bestScore) {
            bestScore = score;
            bestPosition = position;
          }
        }
        
        return bestPosition;
      }
    });
  }

  setupPathfinding() {
    if (!this.config.pathfindingEnabled) return;
    
    // Sistema de pathfinding A* simplificado
    this.pathfinder = {
      gridSize: 10,
      obstacles: new Set(),
      
      findPath: (start, end) => {
        // Implementación básica de A*
        const startNode = this.worldToGrid(start);
        const endNode = this.worldToGrid(end);
        
        const openSet = [startNode];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const nodeKey = (node) => `${node.x},${node.z}`;
        
        gScore.set(nodeKey(startNode), 0);
        fScore.set(nodeKey(startNode), this.heuristic(startNode, endNode));
        
        while (openSet.length > 0) {
          // Encontrar nodo con menor fScore
          let current = openSet.reduce((lowest, node) => 
            fScore.get(nodeKey(node)) < fScore.get(nodeKey(lowest)) ? node : lowest
          );
          
          if (this.nodesEqual(current, endNode)) {
            // Reconstruir camino
            return this.reconstructPath(cameFrom, current);
          }
          
          openSet.splice(openSet.indexOf(current), 1);
          closedSet.add(nodeKey(current));
          
          // Examinar vecinos
          const neighbors = this.getNeighbors(current);
          for (const neighbor of neighbors) {
            const neighborKey = nodeKey(neighbor);
            
            if (closedSet.has(neighborKey) || this.isObstacle(neighbor)) {
              continue;
            }
            
            const tentativeGScore = gScore.get(nodeKey(current)) + this.distance(current, neighbor);
            
            if (!openSet.find(n => nodeKey(n) === neighborKey)) {
              openSet.push(neighbor);
            } else if (tentativeGScore >= gScore.get(neighborKey)) {
              continue;
            }
            
            cameFrom.set(neighborKey, current);
            gScore.set(neighborKey, tentativeGScore);
            fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, endNode));
          }
        }
        
        return null; // No se encontró camino
      }
    };
  }

  setupFlocking() {
    if (!this.config.flockingEnabled) return;
    
    // Configuración de flocking
    this.flockingConfig = {
      separationRadius: 20,
      alignmentRadius: 30,
      cohesionRadius: 40,
      separationForce: 1.5,
      alignmentForce: 1.0,
      cohesionForce: 1.0,
      maxSpeed: 3.0,
      maxForce: 0.5
    };
  }

  setupCommunicationSystem() {
    // Sistema de comunicación entre AIs
    this.communicationChannels = {
      alert: new Map(), // Alertas de peligro
      target: new Map(), // Información de objetivos
      formation: new Map(), // Comandos de formación
      status: new Map() // Estado de las unidades
    };
  }

  // ========================================
  // GESTIÓN DE ENTIDADES IA
  // ========================================

  registerAI(entityId, config = {}) {
    const aiComponent = {
      entityId,
      data: {
        currentState: config.initialState || 'patrol',
        previousState: null,
        stateChangeTime: Date.now(),
        
        // Configuración de comportamiento
        speed: config.speed || 2,
        detectionRange: config.detectionRange || this.config.detectionRange,
        attackRange: config.attackRange || 15,
        attackSpeed: config.attackSpeed || 1000,
        aggressiveness: config.aggressiveness || 0.5,
        intelligence: config.intelligence || 0.5,
        
        // Sistema de decisión
        decisionTree: config.decisionTree || 'basicEnemy',
        updateFrequency: config.updateFrequency || 60,
        lastUpdate: 0,
        
        // Datos específicos del estado
        target: null,
        lastKnownTargetPosition: null,
        patrolPoints: config.patrolPoints || null,
        flockId: config.flockId || null,
        formationId: config.formationId || null,
        
        // Comunicación
        communicationRange: config.communicationRange || 100,
        canCommunicate: config.canCommunicate !== false,
        
        // Métricas
        decisions: 0,
        stateChanges: 0,
        targetsEngaged: 0
      }
    };
    
    this.aiEntities.set(entityId, aiComponent);
    
    // Inicializar estado
    const behavior = this.behaviors.get(aiComponent.data.currentState);
    if (behavior && behavior.enter) {
      behavior.enter(entityId, aiComponent);
    }
    
    console.log(`🤖 IA registrada para entidad ${entityId}`);
    return aiComponent;
  }

  unregisterAI(entityId) {
    const aiComponent = this.aiEntities.get(entityId);
    if (aiComponent) {
      // Salir del estado actual
      const behavior = this.behaviors.get(aiComponent.data.currentState);
      if (behavior && behavior.exit) {
        behavior.exit(entityId, aiComponent);
      }
      
      // Remover de flocks y formaciones
      this.removeFromFlock(entityId);
      this.removeFromFormation(entityId);
      
      this.aiEntities.delete(entityId);
      return true;
    }
    return false;
  }

  // ========================================
  // ACTUALIZACIÓN PRINCIPAL
  // ========================================

  update(deltaTime) {
    if (!this.engine) return;
    
    const startTime = performance.now();
    this.frameCounter++;
    this.updateTimer += deltaTime;
    
    // Actualizar solo a la frecuencia configurada
    if (this.updateTimer < 1000 / this.config.updateFrequency) {
      return;
    }
    
    const actualDeltaTime = this.updateTimer;
    this.updateTimer = 0;
    
    // Procesar entidades IA
    let entitiesProcessed = 0;
    for (const [entityId, aiComponent] of this.aiEntities) {
      if (this.shouldUpdateAI(aiComponent, actualDeltaTime)) {
        this.updateAIEntity(entityId, aiComponent, actualDeltaTime);
        entitiesProcessed++;
      }
    }
    
    // Actualizar sistemas adicionales
    this.updateFlocks(actualDeltaTime);
    this.updateFormations(actualDeltaTime);
    this.updateCommunication(actualDeltaTime);
    this.cleanupStaleData();
    
    // Actualizar métricas
    const endTime = performance.now();
    this.metrics.entitiesProcessed = entitiesProcessed;
    this.metrics.averageProcessingTime = endTime - startTime;
    
    if (this.frameCounter % 60 === 0) { // Cada segundo
      this.metrics.decisionsPerSecond = this.getTotalDecisions();
      this.resetCounters();
    }
  }

  shouldUpdateAI(aiComponent, deltaTime) {
    const timeSinceLastUpdate = Date.now() - aiComponent.data.lastUpdate;
    const updateInterval = 1000 / aiComponent.data.updateFrequency;
    
    return timeSinceLastUpdate >= updateInterval;
  }

  updateAIEntity(entityId, aiComponent, deltaTime) {
    aiComponent.data.lastUpdate = Date.now();
    
    // Evaluar cambio de estado
    const newState = this.evaluateStateChange(entityId, aiComponent);
    if (newState && newState !== aiComponent.data.currentState) {
      this.changeState(entityId, newState);
      this.metrics.behaviorSwitches++;
    }
    
    // Actualizar comportamiento actual
    const behavior = this.behaviors.get(aiComponent.data.currentState);
    if (behavior && behavior.update) {
      behavior.update(entityId, aiComponent, deltaTime);
    }
    
    // Comunicar con otros AIs
    if (aiComponent.data.canCommunicate) {
      this.updateCommunicationForEntity(entityId, aiComponent);
    }
    
    aiComponent.data.decisions++;
  }

  evaluateStateChange(entityId, aiComponent) {
    const decisionTree = this.decisionTrees.get(aiComponent.data.decisionTree);
    if (!decisionTree) return null;
    
    const recommendedState = decisionTree.evaluate(entityId, aiComponent);
    
    // Aplicar histéresis para evitar cambios demasiado frecuentes
    const timeSinceLastChange = Date.now() - aiComponent.data.stateChangeTime;
    const minimumStateTime = 1000; // Mínimo 1 segundo en cada estado
    
    if (timeSinceLastChange < minimumStateTime && 
        recommendedState !== aiComponent.data.currentState) {
      return null; // Muy pronto para cambiar
    }
    
    return recommendedState;
  }

  changeState(entityId, newState) {
    const aiComponent = this.aiEntities.get(entityId);
    if (!aiComponent || newState === aiComponent.data.currentState) return;
    
    // Salir del estado actual
    const currentBehavior = this.behaviors.get(aiComponent.data.currentState);
    if (currentBehavior && currentBehavior.exit) {
      currentBehavior.exit(entityId, aiComponent);
    }
    
    // Cambiar estado
    aiComponent.data.previousState = aiComponent.data.currentState;
    aiComponent.data.currentState = newState;
    aiComponent.data.stateChangeTime = Date.now();
    aiComponent.data.stateChanges++;
    
    // Entrar al nuevo estado
    const newBehavior = this.behaviors.get(newState);
    if (newBehavior && newBehavior.enter) {
      newBehavior.enter(entityId, aiComponent);
    }
    
    if (this.config.debugMode) {
      console.log(`🤖 Entidad ${entityId}: ${aiComponent.data.previousState} → ${newState}`);
    }
  }

  // ========================================
  // FUNCIONES DE UTILIDAD PARA IA
  // ========================================

  findTarget(entityId, aiComponent) {
    if (aiComponent.data.target) {
      // Verificar si el objetivo sigue siendo válido
      const targetTransform = this.engine.getComponent(aiComponent.data.target, 'transform');
      if (targetTransform) {
        const distance = this.getDistanceToTarget(entityId, aiComponent.data.target);
        if (distance <= aiComponent.data.detectionRange) {
          return aiComponent.data.target;
        }
      }
      
      // Objetivo perdido
      aiComponent.data.target = null;
    }
    
    // Buscar nuevo objetivo
    const potentialTargets = this.findNearbyEnemies(entityId, aiComponent.data.detectionRange);
    if (potentialTargets.length > 0) {
      // Usar función de utilidad para seleccionar el mejor objetivo
      const utilityFunction = this.utilityFunctions.get('targetSelection');
      const newTarget = utilityFunction ? 
        utilityFunction.evaluate(entityId, potentialTargets) :
        potentialTargets[0];
      
      aiComponent.data.target = newTarget;
      if (newTarget) {
        aiComponent.data.targetsEngaged++;
      }
      
      return newTarget;
    }
    
    return null;
  }

  findNearbyEnemies(entityId, range) {
    const transform = this.engine.getComponent(entityId, 'transform');
    if (!transform) return [];
    
    const myPos = transform.data.position;
    const enemies = [];
    
    // Buscar entidades con componente 'player' (asumiendo que son enemigos de la IA)
    const playerEntities = this.engine.getEntitiesWithComponents('transform', 'player');
    
    for (const playerId of playerEntities) {
      const playerTransform = this.engine.getComponent(playerId, 'transform');
      if (playerTransform) {
        const distance = myPos.distanceTo(playerTransform.data.position);
        if (distance <= range) {
          enemies.push(playerId);
        }
      }
    }
    
    return enemies;
  }

  findNearbyAllies(entityId, range) {
    const transform = this.engine.getComponent(entityId, 'transform');
    if (!transform) return [];
    
    const myPos = transform.data.position;
    const allies = [];
    
    for (const [allyId, allyAI] of this.aiEntities) {
      if (allyId === entityId) continue;
      
      const allyTransform = this.engine.getComponent(allyId, 'transform');
      if (allyTransform) {
        const distance = myPos.distanceTo(allyTransform.data.position);
        if (distance <= range) {
          allies.push(allyId);
        }
      }
    }
    
    return allies;
  }

  getDistanceToTarget(entityId, targetId) {
    const transform = this.engine.getComponent(entityId, 'transform');
    const targetTransform = this.engine.getComponent(targetId, 'transform');
    
    if (!transform || !targetTransform) return Infinity;
    
    return transform.data.position.distanceTo(targetTransform.data.position);
  }

  hasLineOfSight(entityId, targetId) {
    // Implementación básica - en un juego real usarías raycast
    const transform = this.engine.getComponent(entityId, 'transform');
    const targetTransform = this.engine.getComponent(targetId, 'transform');
    
    if (!transform || !targetTransform) return false;
    
    // Por ahora, asumimos línea de vista si está en rango
    const distance = transform.data.position.distanceTo(targetTransform.data.position);
    return distance <= 200; // Rango máximo de línea de vista
  }

  getEntityHealth(entityId) {
    const healthComponent = this.engine.getComponent(entityId, 'health');
    return healthComponent ? healthComponent.data.current : 100;
  }

  moveToTarget(entityId, targetPos, speed) {
    const transform = this.engine.getComponent(entityId, 'transform');
    if (!transform) return;
    
    const currentPos = transform.data.position;
    const direction = new THREE.Vector3(
      targetPos.x - currentPos.x,
      targetPos.y - currentPos.y,
      targetPos.z - currentPos.z
    ).normalize();
    
    // Aplicar movimiento mediante física si está disponible
    const physicsSystem = this.engine.getSystem('physics');
    if (physicsSystem) {
      const velocity = direction.multiplyScalar(speed);
      physicsSystem.setVelocity(entityId, velocity);
    } else {
      // Movimiento directo
      const movement = direction.multiplyScalar(speed * 0.016); // Asumiendo 60 FPS
      currentPos.add(movement);
    }
  }

  moveToTargetWithPathfinding(entityId, targetPos, speed) {
    const transform = this.engine.getComponent(entityId, 'transform');
    if (!transform || !this.pathfinder) {
      this.moveToTarget(entityId, targetPos, speed);
      return;
    }
    
    const currentPos = transform.data.position;
    const cacheKey = `${entityId}_${Math.floor(targetPos.x/10)}_${Math.floor(targetPos.z/10)}`;
    
    // Usar path cacheado si está disponible
    let path = this.pathCache.get(cacheKey);
    if (!path) {
      path = this.pathfinder.findPath(currentPos, targetPos);
      if (path) {
        this.pathCache.set(cacheKey, path);
        this.metrics.pathsCalculated++;
      }
    }
    
    if (path && path.length > 1) {
      const nextWaypoint = path[1]; // path[0] es la posición actual
      this.moveToTarget(entityId, nextWaypoint, speed);
      
      // Verificar si llegó al waypoint
      const waypointDistance = currentPos.distanceTo(
        new THREE.Vector3(nextWaypoint.x, nextWaypoint.y, nextWaypoint.z)
      );
      
      if (waypointDistance < 5) {
        path.shift(); // Remover waypoint alcanzado
        if (path.length <= 1) {
          this.pathCache.delete(cacheKey); // Path completado
        }
      }
    } else {
      // Sin path, movimiento directo
      this.moveToTarget(entityId, targetPos, speed);
    }
  }

  faceTarget(entityId, targetId) {
    const transform = this.engine.getComponent(entityId, 'transform');
    const targetTransform = this.engine.getComponent(targetId, 'transform');
    
    if (!transform || !targetTransform) return;
    
    const direction = new THREE.Vector3(
      targetTransform.data.position.x - transform.data.position.x,
      0, // Mantener en plano horizontal
      targetTransform.data.position.z - transform.data.position.z
    ).normalize();
    
    const angle = Math.atan2(direction.x, direction.z);
    transform.data.rotation.y = angle;
  }

  performAttack(entityId, targetId, aiComponent) {
    // Emitir evento de ataque
    this.engine.emit('aiAttack', {
      attacker: entityId,
      target: targetId,
      damage: aiComponent.data.attackDamage || 20,
      type: aiComponent.data.attackType || 'melee'
    });
    
    // Efectos visuales/audio
    this.engine.emit('playSound', {
      soundId: 'enemy_attack',
      position: this.engine.getComponent(entityId, 'transform').data.position
    });
  }

  // ========================================
  // SISTEMA DE FLOCKING
  // ========================================

  addToFlock(entityId, flockId) {
    if (!this.flocks.has(flockId)) {
      this.flocks.set(flockId, new Set());
    }
    this.flocks.get(flockId).add(entityId);
  }

  removeFromFlock(entityId) {
    for (const [flockId, members] of this.flocks) {
      if (members.has(entityId)) {
        members.delete(entityId);
        if (members.size === 0) {
          this.flocks.delete(flockId);
        }
        break;
      }
    }
  }

  calculateFlockingForce(entityId, aiComponent) {
    if (!aiComponent.data.flockId) return null;
    
    const flock = this.flocks.get(aiComponent.data.flockId);
    if (!flock || flock.size <= 1) return null;
    
    const transform = this.engine.getComponent(entityId, 'transform');
    if (!transform) return null;
    
    const myPos = transform.data.position;
    const config = this.flockingConfig;
    
    let separation = new THREE.Vector3();
    let alignment = new THREE.Vector3();
    let cohesion = new THREE.Vector3();
    
    let separationCount = 0;
    let alignmentCount = 0;
    let cohesionCount = 0;
    
    for (const neighborId of flock) {
      if (neighborId === entityId) continue;
      
      const neighborTransform = this.engine.getComponent(neighborId, 'transform');
      if (!neighborTransform) continue;
      
      const neighborPos = neighborTransform.data.position;
      const distance = myPos.distanceTo(neighborPos);
      
      // Separación
      if (distance < config.separationRadius && distance > 0) {
        const diff = myPos.clone().sub(neighborPos).normalize();
        diff.divideScalar(distance); // Peso por distancia
        separation.add(diff);
        separationCount++;
      }
      
      // Alineación
      if (distance < config.alignmentRadius) {
        const neighborAI = this.aiEntities.get(neighborId);
        if (neighborAI && neighborAI.data.velocity) {
          alignment.add(neighborAI.data.velocity);
          alignmentCount++;
        }
      }
      
      // Cohesión
      if (distance < config.cohesionRadius) {
        cohesion.add(neighborPos);
        cohesionCount++;
      }
    }
    
    // Calcular fuerzas promedio
    if (separationCount > 0) {
      separation.divideScalar(separationCount).normalize().multiplyScalar(config.separationForce);
    }
    
    if (alignmentCount > 0) {
      alignment.divideScalar(alignmentCount).normalize().multiplyScalar(config.alignmentForce);
    }
    
    if (cohesionCount > 0) {
      cohesion.divideScalar(cohesionCount).sub(myPos).normalize().multiplyScalar(config.cohesionForce);
    }
    
    // Combinar fuerzas
    const totalForce = separation.add(alignment).add(cohesion);
    
    // Limitar fuerza máxima
    if (totalForce.length() > config.maxForce) {
      totalForce.normalize().multiplyScalar(config.maxForce);
    }
    
    return totalForce;
  }

  updateFlocks(deltaTime) {
    // Actualizar velocidades basadas en flocking
    for (const [flockId, members] of this.flocks) {
      for (const entityId of members) {
        const aiComponent = this.aiEntities.get(entityId);
        if (aiComponent && aiComponent.data.currentState === 'flock') {
          const force = this.calculateFlockingForce(entityId, aiComponent);
          if (force) {
            this.applyForce(entityId, force);
          }
        }
      }
    }
  }

  applyForce(entityId, force) {
    const physicsSystem = this.engine.getSystem('physics');
    if (physicsSystem) {
      physicsSystem.addForce(entityId, force);
    }
  }

  // ========================================
  // SISTEMA DE COMUNICACIÓN
  // ========================================

  updateCommunicationForEntity(entityId, aiComponent) {
    // Enviar alertas sobre objetivos detectados
    if (aiComponent.data.target) {
      this.broadcastAlert(entityId, 'targetDetected', {
        target: aiComponent.data.target,
        position: this.engine.getComponent(aiComponent.data.target, 'transform').data.position,
        timestamp: Date.now()
      });
    }
    
    // Procesar mensajes recibidos
    this.processReceivedMessages(entityId, aiComponent);
  }

  broadcastAlert(senderId, alertType, data) {
    const senderAI = this.aiEntities.get(senderId);
    if (!senderAI) return;
    
    const senderTransform = this.engine.getComponent(senderId, 'transform');
    if (!senderTransform) return;
    
    const senderPos = senderTransform.data.position;
    const range = senderAI.data.communicationRange;
    
    // Encontrar receptores en rango
    for (const [receiverId, receiverAI] of this.aiEntities) {
      if (receiverId === senderId || !receiverAI.data.canCommunicate) continue;
      
      const receiverTransform = this.engine.getComponent(receiverId, 'transform');
      if (!receiverTransform) continue;
      
      const distance = senderPos.distanceTo(receiverTransform.data.position);
      if (distance <= range) {
        // Enviar mensaje
        if (!this.communicationChannels.alert.has(receiverId)) {
          this.communicationChannels.alert.set(receiverId, []);
        }
        
        this.communicationChannels.alert.get(receiverId).push({
          sender: senderId,
          type: alertType,
          data,
          timestamp: Date.now()
        });
      }
    }
  }

  processReceivedMessages(entityId, aiComponent) {
    const messages = this.communicationChannels.alert.get(entityId);
    if (!messages || messages.length === 0) return;
    
    for (const message of messages) {
      switch (message.type) {
        case 'targetDetected':
          if (!aiComponent.data.target && message.data.target) {
            // Adoptar objetivo comunicado si no tengo uno
            aiComponent.data.target = message.data.target;
            aiComponent.data.lastKnownTargetPosition = message.data.position;
          }
          break;
          
        case 'callForHelp':
          // Responder a llamadas de ayuda
          if (aiComponent.data.currentState === 'patrol') {
            this.changeState(entityId, 'chase');
            aiComponent.data.target = message.data.target;
          }
          break;
      }
    }
    
    // Limpiar mensajes procesados
    this.communicationChannels.alert.set(entityId, []);
  }

  updateCommunication(deltaTime) {
    // Limpiar mensajes antiguos
    const maxAge = 10000; // 10 segundos
    const now = Date.now();
    
    for (const [entityId, messages] of this.communicationChannels.alert) {
      const filteredMessages = messages.filter(msg => now - msg.timestamp < maxAge);
      this.communicationChannels.alert.set(entityId, filteredMessages);
    }
  }

  // ========================================
  // UTILIDADES DE PATHFINDING
  // ========================================

  worldToGrid(worldPos) {
    return {
      x: Math.floor(worldPos.x / this.pathfinder.gridSize),
      z: Math.floor(worldPos.z / this.pathfinder.gridSize)
    };
  }

  gridToWorld(gridPos) {
    return {
      x: gridPos.x * this.pathfinder.gridSize,
      y: 0,
      z: gridPos.z * this.pathfinder.gridSize
    };
  }

  heuristic(nodeA, nodeB) {
    return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.z - nodeB.z);
  }

  distance(nodeA, nodeB) {
    return Math.sqrt(Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.z - nodeB.z, 2));
  }

  nodesEqual(nodeA, nodeB) {
    return nodeA.x === nodeB.x && nodeA.z === nodeB.z;
  }

  getNeighbors(node) {
    const neighbors = [];
    const directions = [
      { x: 0, z: 1 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: -1, z: 0 }
    ];
    
    for (const dir of directions) {
      neighbors.push({
        x: node.x + dir.x,
        z: node.z + dir.z
      });
    }
    
    return neighbors;
  }

  isObstacle(node) {
    return this.pathfinder.obstacles.has(`${node.x},${node.z}`);
  }

  reconstructPath(cameFrom, current) {
    const path = [this.gridToWorld(current)];
    const nodeKey = (node) => `${node.x},${node.z}`;
    
    while (cameFrom.has(nodeKey(current))) {
      current = cameFrom.get(nodeKey(current));
      path.unshift(this.gridToWorld(current));
    }
    
    return path;
  }

  // ========================================
  // GENERACIÓN DE DATOS AUXILIARES
  // ========================================

  generatePatrolPoints(entityId, aiComponent) {
    const transform = this.engine.getComponent(entityId, 'transform');
    if (!transform) return [];
    
    const center = transform.data.position;
    const radius = 50;
    const pointCount = 4;
    const points = [];
    
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2;
      points.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y,
        z: center.z + Math.sin(angle) * radius
      });
    }
    
    aiComponent.data.patrolPoints = points;
    return points;
  }

  generateSearchPoints(entityId, aiComponent) {
    const searchRadius = 80;
    const pointCount = 6;
    const points = [];
    
    let center = aiComponent.data.lastKnownTargetPosition;
    if (!center) {
      const transform = this.engine.getComponent(entityId, 'transform');
      center = transform ? transform.data.position : { x: 0, y: 0, z: 0 };
    }
    
    for (let i = 0; i < pointCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * searchRadius;
      points.push({
        x: center.x + Math.cos(angle) * distance,
        y: center.y,
        z: center.z + Math.sin(angle) * distance
      });
    }
    
    return points;
  }

  calculateFleeDirection(entityId, aiComponent) {
    const transform = this.engine.getComponent(entityId, 'transform');
    const target = this.findTarget(entityId, aiComponent);
    
    if (!transform || !target) return null;
    
    const targetTransform = this.engine.getComponent(target, 'transform');
    if (!targetTransform) return null;
    
    // Dirección opuesta al objetivo
    const direction = transform.data.position.clone().sub(targetTransform.data.position).normalize();
    
    // Agregar algo de aleatoriedad
    direction.x += (Math.random() - 0.5) * 0.3;
    direction.z += (Math.random() - 0.5) * 0.3;
    
    return direction.normalize();
  }

  // ========================================
  // MÉTRICAS Y LIMPIEZA
  // ========================================

  getTotalDecisions() {
    let total = 0;
    for (const [entityId, aiComponent] of this.aiEntities) {
      total += aiComponent.data.decisions;
    }
    return total;
  }

  resetCounters() {
    for (const [entityId, aiComponent] of this.aiEntities) {
      aiComponent.data.decisions = 0;
    }
  }

  cleanupStaleData() {
    // Limpiar cache de pathfinding
    if (this.pathCache.size > 1000) {
      const entries = Array.from(this.pathCache.entries());
      const toKeep = entries.slice(-500); // Mantener los 500 más recientes
      this.pathCache.clear();
      toKeep.forEach(([key, value]) => this.pathCache.set(key, value));
    }
  }

  updateFormations(deltaTime) {
    // Implementación básica de formaciones
    for (const [formationId, formation] of this.formations) {
      // Actualizar posiciones de formación
    }
  }

  removeFromFormation(entityId) {
    // Remover entidad de formaciones
    for (const [formationId, formation] of this.formations) {
      if (formation.members && formation.members.has(entityId)) {
        formation.members.delete(entityId);
        if (formation.members.size === 0) {
          this.formations.delete(formationId);
        }
        break;
      }
    }
  }

  calculateFormationPositions(formation, role) {
    // Calcular posiciones de formación básicas
    return [];
  }

  calculateCrowdingAt(position) {
    // Calcular densidad de entidades en una posición
    return 0;
  }

  // ========================================
  // API PÚBLICA
  // ========================================

  getAIState(entityId) {
    const aiComponent = this.aiEntities.get(entityId);
    return aiComponent ? aiComponent.data.currentState : null;
  }

  getAIMetrics() {
    return {
      ...this.metrics,
      totalAIEntities: this.aiEntities.size,
      activeBehaviors: Array.from(this.behaviors.keys()),
      activeFlocks: this.flocks.size,
      pathCacheSize: this.pathCache.size
    };
  }

  setAIDebugMode(enabled) {
    this.config.debugMode = enabled;
  }

  // ========================================
  // LIMPIEZA
  // ========================================

  destroy() {
    // Limpiar todas las entidades IA
    for (const [entityId] of this.aiEntities) {
      this.unregisterAI(entityId);
    }
    
    // Limpiar estructuras de datos
    this.aiEntities.clear();
    this.behaviorStates.clear();
    this.pathCache.clear();
    this.flocks.clear();
    this.formations.clear();
    
    // Limpiar comunicación
    Object.values(this.communicationChannels).forEach(channel => channel.clear());
    
    console.log('🧹 Sistema de IA destruido');
  }
}

export default AISystem;