// ========================================
// MOTOR DE FÍSICA OPTIMIZADO
// Sistema de física 3D de alto rendimiento
// ========================================

import * as THREE from 'three';
import { BaseSystem } from './GameEngine.js';

export class PhysicsEngine extends BaseSystem {
  constructor(config = {}) {
    super('physics', 10);
    
    this.config = {
      gravity: config.gravity || -9.81,
      timeStep: config.timeStep || 1/60,
      maxSubSteps: config.maxSubSteps || 3,
      enableCollisionDetection: config.enableCollisionDetection !== false,
      enableSpatialPartitioning: config.enableSpatialPartitioning !== false,
      worldBounds: config.worldBounds || { x: 2000, y: 1000, z: 6000 },
      ...config
    };

    // Estructuras de datos principales
    this.rigidBodies = new Map();
    this.colliders = new Map();
    this.constraints = [];
    this.forces = [];
    
    // Sistema de particionado espacial
    this.spatialGrid = null;
    this.gridSize = 100;
    
    // Pools de objetos para optimización
    this.vectorPool = [];
    this.contactPool = [];
    
    // Métricas de rendimiento
    this.metrics = {
      rigidBodyCount: 0,
      collisionChecks: 0,
      activeCollisions: 0,
      physicsTime: 0
    };

    this.init();
  }

  init() {
    this.setupSpatialPartitioning();
    this.setupObjectPools();
    console.log('⚛️ Motor de física inicializado');
  }

  // ========================================
  // GESTIÓN DE CUERPOS RÍGIDOS
  // ========================================

  createRigidBody(entityId, config = {}) {
    const rigidBody = {
      entityId,
      type: config.type || 'dynamic', // static, kinematic, dynamic
      
      // Propiedades físicas
      position: new THREE.Vector3(config.position?.x || 0, config.position?.y || 0, config.position?.z || 0),
      velocity: new THREE.Vector3(0, 0, 0),
      acceleration: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Quaternion(config.rotation?.x || 0, config.rotation?.y || 0, config.rotation?.z || 0, config.rotation?.w || 1),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      
      // Propiedades del material
      mass: config.mass || 1,
      inverseMass: config.mass ? 1 / config.mass : 0,
      restitution: config.restitution || 0.3,
      friction: config.friction || 0.5,
      linearDamping: config.linearDamping || 0.01,
      angularDamping: config.angularDamping || 0.01,
      
      // Estado
      isActive: true,
      isSleeping: false,
      sleepThreshold: 0.01,
      sleepTime: 0,
      
      // Fuerzas aplicadas
      forces: new THREE.Vector3(0, 0, 0),
      torques: new THREE.Vector3(0, 0, 0),
      
      // Collider asociado
      colliderId: null,
      
      // Configuración adicional
      useGravity: config.useGravity !== false,
      isKinematic: config.type === 'kinematic',
      isStatic: config.type === 'static',
      
      // Callbacks
      onCollisionEnter: config.onCollisionEnter,
      onCollisionStay: config.onCollisionStay,
      onCollisionExit: config.onCollisionExit
    };

    this.rigidBodies.set(entityId, rigidBody);
    this.metrics.rigidBodyCount++;
    
    console.log(`⚛️ RigidBody creado para entidad ${entityId}`);
    return rigidBody;
  }

  destroyRigidBody(entityId) {
    if (this.rigidBodies.has(entityId)) {
      const rigidBody = this.rigidBodies.get(entityId);
      
      // Remover collider asociado
      if (rigidBody.colliderId) {
        this.destroyCollider(rigidBody.colliderId);
      }
      
      this.rigidBodies.delete(entityId);
      this.metrics.rigidBodyCount--;
      return true;
    }
    return false;
  }

  getRigidBody(entityId) {
    return this.rigidBodies.get(entityId);
  }

  // ========================================
  // GESTIÓN DE COLISIONES
  // ========================================

  createCollider(entityId, type, config = {}) {
    const collider = {
      id: `collider_${entityId}_${Date.now()}`,
      entityId,
      type, // 'box', 'sphere', 'capsule', 'mesh'
      
      // Propiedades geométricas
      center: new THREE.Vector3(config.center?.x || 0, config.center?.y || 0, config.center?.z || 0),
      size: config.size || new THREE.Vector3(1, 1, 1),
      radius: config.radius || 0.5,
      height: config.height || 1,
      
      // Configuración
      isTrigger: config.isTrigger || false,
      material: config.material || { friction: 0.5, restitution: 0.3 },
      
      // Estado
      isActive: true,
      
      // Geometría de Three.js para visualización
      geometry: this.createColliderGeometry(type, config),
      
      // Callbacks específicos del collider
      onTriggerEnter: config.onTriggerEnter,
      onTriggerStay: config.onTriggerStay,
      onTriggerExit: config.onTriggerExit
    };

    this.colliders.set(collider.id, collider);
    
    // Asociar con rigid body
    const rigidBody = this.rigidBodies.get(entityId);
    if (rigidBody) {
      rigidBody.colliderId = collider.id;
    }

    console.log(`🔲 Collider ${type} creado para entidad ${entityId}`);
    return collider.id;
  }

  createColliderGeometry(type, config) {
    switch (type) {
      case 'box':
        const size = config.size || new THREE.Vector3(1, 1, 1);
        return new THREE.BoxGeometry(size.x, size.y, size.z);
        
      case 'sphere':
        const radius = config.radius || 0.5;
        return new THREE.SphereGeometry(radius, 16, 16);
        
      case 'capsule':
        const capsuleRadius = config.radius || 0.5;
        const height = config.height || 1;
        return new THREE.CapsuleGeometry(capsuleRadius, height, 8, 16);
        
      case 'plane':
        const planeSize = config.size || new THREE.Vector3(10, 10, 1);
        return new THREE.PlaneGeometry(planeSize.x, planeSize.y);
        
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  destroyCollider(colliderId) {
    return this.colliders.delete(colliderId);
  }

  // ========================================
  // DETECCIÓN DE COLISIONES
  // ========================================

  checkCollisions() {
    const startTime = performance.now();
    this.metrics.collisionChecks = 0;
    this.metrics.activeCollisions = 0;

    const activeBodies = Array.from(this.rigidBodies.values()).filter(body => 
      body.isActive && !body.isSleeping && !body.isStatic
    );

    // Usar particionado espacial si está habilitado
    if (this.config.enableSpatialPartitioning && this.spatialGrid) {
      this.checkCollisionsSpatial(activeBodies);
    } else {
      this.checkCollisionsBruteForce(activeBodies);
    }

    const endTime = performance.now();
    this.metrics.physicsTime = endTime - startTime;
  }

  checkCollisionsBruteForce(bodies) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        this.testCollision(bodies[i], bodies[j]);
        this.metrics.collisionChecks++;
      }
    }
  }

  checkCollisionsSpatial(bodies) {
    // Actualizar grid espacial
    this.updateSpatialGrid(bodies);
    
    // Verificar colisiones solo en celdas adyacentes
    const checkedPairs = new Set();
    
    for (const body of bodies) {
      const cellKey = this.getSpatialCellKey(body.position);
      const nearbyBodies = this.getNearbyBodies(cellKey);
      
      for (const nearbyBody of nearbyBodies) {
        if (body.entityId !== nearbyBody.entityId) {
          const pairKey = `${Math.min(body.entityId, nearbyBody.entityId)}_${Math.max(body.entityId, nearbyBody.entityId)}`;
          
          if (!checkedPairs.has(pairKey)) {
            this.testCollision(body, nearbyBody);
            checkedPairs.add(pairKey);
            this.metrics.collisionChecks++;
          }
        }
      }
    }
  }

  testCollision(bodyA, bodyB) {
    const colliderA = this.colliders.get(bodyA.colliderId);
    const colliderB = this.colliders.get(bodyB.colliderId);
    
    if (!colliderA || !colliderB) return;

    const collision = this.detectCollision(bodyA, colliderA, bodyB, colliderB);
    
    if (collision.isColliding) {
      this.metrics.activeCollisions++;
      this.handleCollision(bodyA, bodyB, collision);
    }
  }

  detectCollision(bodyA, colliderA, bodyB, colliderB) {
    // Implementar diferentes tipos de detección según los colliders
    if (colliderA.type === 'sphere' && colliderB.type === 'sphere') {
      return this.sphereVsSphere(bodyA, colliderA, bodyB, colliderB);
    } else if (colliderA.type === 'box' && colliderB.type === 'box') {
      return this.boxVsBox(bodyA, colliderA, bodyB, colliderB);
    } else if ((colliderA.type === 'sphere' && colliderB.type === 'box') ||
               (colliderA.type === 'box' && colliderB.type === 'sphere')) {
      return this.sphereVsBox(bodyA, colliderA, bodyB, colliderB);
    }
    
    // Fallback: usar bounding spheres
    return this.boundingSphereTest(bodyA, bodyB);
  }

  sphereVsSphere(bodyA, colliderA, bodyB, colliderB) {
    const posA = bodyA.position.clone().add(colliderA.center);
    const posB = bodyB.position.clone().add(colliderB.center);
    const distance = posA.distanceTo(posB);
    const combinedRadius = colliderA.radius + colliderB.radius;
    
    if (distance < combinedRadius) {
      const normal = posB.clone().sub(posA).normalize();
      const penetration = combinedRadius - distance;
      
      return {
        isColliding: true,
        normal,
        penetration,
        contactPoint: posA.clone().add(normal.clone().multiplyScalar(colliderA.radius))
      };
    }
    
    return { isColliding: false };
  }

  boxVsBox(bodyA, colliderA, bodyB, colliderB) {
    // Implementación simplificada usando AABB
    const minA = bodyA.position.clone().add(colliderA.center).sub(colliderA.size.clone().multiplyScalar(0.5));
    const maxA = bodyA.position.clone().add(colliderA.center).add(colliderA.size.clone().multiplyScalar(0.5));
    const minB = bodyB.position.clone().add(colliderB.center).sub(colliderB.size.clone().multiplyScalar(0.5));
    const maxB = bodyB.position.clone().add(colliderB.center).add(colliderB.size.clone().multiplyScalar(0.5));
    
    const isColliding = (minA.x <= maxB.x && maxA.x >= minB.x) &&
                       (minA.y <= maxB.y && maxA.y >= minB.y) &&
                       (minA.z <= maxB.z && maxA.z >= minB.z);
    
    if (isColliding) {
      // Calcular normal y penetración básica
      const overlapX = Math.min(maxA.x - minB.x, maxB.x - minA.x);
      const overlapY = Math.min(maxA.y - minB.y, maxB.y - minA.y);
      const overlapZ = Math.min(maxA.z - minB.z, maxB.z - minA.z);
      
      let normal = new THREE.Vector3();
      let penetration = 0;
      
      if (overlapX <= overlapY && overlapX <= overlapZ) {
        normal.set(bodyA.position.x > bodyB.position.x ? 1 : -1, 0, 0);
        penetration = overlapX;
      } else if (overlapY <= overlapZ) {
        normal.set(0, bodyA.position.y > bodyB.position.y ? 1 : -1, 0);
        penetration = overlapY;
      } else {
        normal.set(0, 0, bodyA.position.z > bodyB.position.z ? 1 : -1);
        penetration = overlapZ;
      }
      
      return {
        isColliding: true,
        normal,
        penetration,
        contactPoint: bodyA.position.clone().lerp(bodyB.position, 0.5)
      };
    }
    
    return { isColliding: false };
  }

  sphereVsBox(bodyA, colliderA, bodyB, colliderB) {
    // Determinar qué es esfera y qué es caja
    let sphereBody, sphereCollider, boxBody, boxCollider;
    
    if (colliderA.type === 'sphere') {
      sphereBody = bodyA; sphereCollider = colliderA;
      boxBody = bodyB; boxCollider = colliderB;
    } else {
      sphereBody = bodyB; sphereCollider = colliderB;
      boxBody = bodyA; boxCollider = colliderA;
    }
    
    const spherePos = sphereBody.position.clone().add(sphereCollider.center);
    const boxPos = boxBody.position.clone().add(boxCollider.center);
    const halfSize = boxCollider.size.clone().multiplyScalar(0.5);
    
    // Punto más cercano en la caja
    const closestPoint = new THREE.Vector3(
      Math.max(boxPos.x - halfSize.x, Math.min(spherePos.x, boxPos.x + halfSize.x)),
      Math.max(boxPos.y - halfSize.y, Math.min(spherePos.y, boxPos.y + halfSize.y)),
      Math.max(boxPos.z - halfSize.z, Math.min(spherePos.z, boxPos.z + halfSize.z))
    );
    
    const distance = spherePos.distanceTo(closestPoint);
    
    if (distance < sphereCollider.radius) {
      const normal = spherePos.clone().sub(closestPoint).normalize();
      const penetration = sphereCollider.radius - distance;
      
      return {
        isColliding: true,
        normal,
        penetration,
        contactPoint: closestPoint
      };
    }
    
    return { isColliding: false };
  }

  boundingSphereTest(bodyA, bodyB) {
    const distance = bodyA.position.distanceTo(bodyB.position);
    const combinedRadius = 1; // Radio por defecto
    
    return {
      isColliding: distance < combinedRadius,
      normal: bodyB.position.clone().sub(bodyA.position).normalize(),
      penetration: combinedRadius - distance,
      contactPoint: bodyA.position.clone().lerp(bodyB.position, 0.5)
    };
  }

  // ========================================
  // RESOLUCIÓN DE COLISIONES
  // ========================================

  handleCollision(bodyA, bodyB, collision) {
    const colliderA = this.colliders.get(bodyA.colliderId);
    const colliderB = this.colliders.get(bodyB.colliderId);
    
    // Manejar triggers
    if (colliderA.isTrigger || colliderB.isTrigger) {
      this.handleTrigger(bodyA, bodyB, collision);
      return;
    }
    
    // Separar objetos
    this.separateObjects(bodyA, bodyB, collision);
    
    // Resolver velocidades
    this.resolveVelocities(bodyA, bodyB, collision);
    
    // Callbacks de colisión
    if (bodyA.onCollisionEnter) {
      bodyA.onCollisionEnter(bodyB, collision);
    }
    if (bodyB.onCollisionEnter) {
      bodyB.onCollisionEnter(bodyA, collision);
    }
  }

  separateObjects(bodyA, bodyB, collision) {
    if (bodyA.isStatic && bodyB.isStatic) return;
    
    const totalMass = bodyA.inverseMass + bodyB.inverseMass;
    if (totalMass === 0) return;
    
    const separationA = collision.normal.clone().multiplyScalar(-collision.penetration * (bodyA.inverseMass / totalMass));
    const separationB = collision.normal.clone().multiplyScalar(collision.penetration * (bodyB.inverseMass / totalMass));
    
    if (!bodyA.isStatic) {
      bodyA.position.add(separationA);
    }
    if (!bodyB.isStatic) {
      bodyB.position.add(separationB);
    }
  }

  resolveVelocities(bodyA, bodyB, collision) {
    const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
    const separatingVelocity = relativeVelocity.dot(collision.normal);
    
    if (separatingVelocity > 0) return; // Objetos ya se están separando
    
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const newSeparatingVelocity = -separatingVelocity * restitution;
    
    const deltaVelocity = newSeparatingVelocity - separatingVelocity;
    const totalInverseMass = bodyA.inverseMass + bodyB.inverseMass;
    
    if (totalInverseMass === 0) return;
    
    const impulse = deltaVelocity / totalInverseMass;
    const impulsePerMass = collision.normal.clone().multiplyScalar(impulse);
    
    if (!bodyA.isStatic) {
      bodyA.velocity.sub(impulsePerMass.clone().multiplyScalar(bodyA.inverseMass));
    }
    if (!bodyB.isStatic) {
      bodyB.velocity.add(impulsePerMass.clone().multiplyScalar(bodyB.inverseMass));
    }
  }

  handleTrigger(bodyA, bodyB, collision) {
    const colliderA = this.colliders.get(bodyA.colliderId);
    const colliderB = this.colliders.get(bodyB.colliderId);
    
    if (colliderA.isTrigger && colliderA.onTriggerEnter) {
      colliderA.onTriggerEnter(bodyB, collision);
    }
    if (colliderB.isTrigger && colliderB.onTriggerEnter) {
      colliderB.onTriggerEnter(bodyA, collision);
    }
  }

  // ========================================
  // INTEGRACIÓN FÍSICA
  // ========================================

  update(deltaTime) {
    if (!this.engine) return;
    
    const startTime = performance.now();
    
    // Integrar física con sub-pasos para estabilidad
    const numSubSteps = Math.min(Math.ceil(deltaTime / this.config.timeStep), this.config.maxSubSteps);
    const subDeltaTime = deltaTime / numSubSteps;
    
    for (let i = 0; i < numSubSteps; i++) {
      this.integrateMotion(subDeltaTime);
      this.applyConstraints();
      
      if (this.config.enableCollisionDetection) {
        this.checkCollisions();
      }
      
      this.updateSleepState(subDeltaTime);
    }
    
    this.updateComponents();
    
    const endTime = performance.now();
    this.metrics.physicsTime = endTime - startTime;
  }

  integrateMotion(deltaTime) {
    for (const [entityId, body] of this.rigidBodies) {
      if (!body.isActive || body.isSleeping || body.isStatic) continue;
      
      // Aplicar gravedad
      if (body.useGravity && !body.isKinematic) {
        body.forces.y += body.mass * this.config.gravity;
      }
      
      // Calcular aceleración
      body.acceleration.copy(body.forces).multiplyScalar(body.inverseMass);
      
      // Integración de Verlet para mejor estabilidad
      const newVelocity = body.velocity.clone()
        .add(body.acceleration.clone().multiplyScalar(deltaTime));
      
      const newPosition = body.position.clone()
        .add(body.velocity.clone().multiplyScalar(deltaTime))
        .add(body.acceleration.clone().multiplyScalar(0.5 * deltaTime * deltaTime));
      
      // Aplicar damping
      newVelocity.multiplyScalar(1 - body.linearDamping);
      body.angularVelocity.multiplyScalar(1 - body.angularDamping);
      
      // Verificar límites del mundo
      this.enforceWorldBounds(newPosition, newVelocity);
      
      // Actualizar valores
      body.velocity.copy(newVelocity);
      body.position.copy(newPosition);
      
      // Limpiar fuerzas
      body.forces.set(0, 0, 0);
      body.torques.set(0, 0, 0);
    }
  }

  enforceWorldBounds(position, velocity) {
    const bounds = this.config.worldBounds;
    
    if (position.x < -bounds.x / 2) {
      position.x = -bounds.x / 2;
      velocity.x = Math.abs(velocity.x) * 0.5;
    } else if (position.x > bounds.x / 2) {
      position.x = bounds.x / 2;
      velocity.x = -Math.abs(velocity.x) * 0.5;
    }
    
    if (position.y < -bounds.y / 2) {
      position.y = -bounds.y / 2;
      velocity.y = Math.abs(velocity.y) * 0.5;
    } else if (position.y > bounds.y / 2) {
      position.y = bounds.y / 2;
      velocity.y = -Math.abs(velocity.y) * 0.5;
    }
    
    if (position.z < -bounds.z / 2) {
      position.z = -bounds.z / 2;
      velocity.z = Math.abs(velocity.z) * 0.5;
    } else if (position.z > bounds.z / 2) {
      position.z = bounds.z / 2;
      velocity.z = -Math.abs(velocity.z) * 0.5;
    }
  }

  updateSleepState(deltaTime) {
    for (const [entityId, body] of this.rigidBodies) {
      if (body.isStatic || body.isKinematic) continue;
      
      const velocityMagnitude = body.velocity.length();
      const angularVelocityMagnitude = body.angularVelocity.length();
      
      if (velocityMagnitude < body.sleepThreshold && angularVelocityMagnitude < body.sleepThreshold) {
        body.sleepTime += deltaTime;
        
        if (body.sleepTime > 1.0) { // 1 segundo de inactividad
          body.isSleeping = true;
        }
      } else {
        body.sleepTime = 0;
        body.isSleeping = false;
      }
    }
  }

  updateComponents() {
    // Actualizar componentes de transform en el ECS
    for (const [entityId, body] of this.rigidBodies) {
      const transformComponent = this.engine.getComponent(entityId, 'transform');
      if (transformComponent) {
        transformComponent.data.position.copy(body.position);
        transformComponent.data.rotation.copy(body.rotation);
      }
    }
  }

  // ========================================
  // PARTICIONADO ESPACIAL
  // ========================================

  setupSpatialPartitioning() {
    if (!this.config.enableSpatialPartitioning) return;
    
    this.spatialGrid = new Map();
    console.log('🗂️ Particionado espacial habilitado');
  }

  updateSpatialGrid(bodies) {
    this.spatialGrid.clear();
    
    for (const body of bodies) {
      const cellKey = this.getSpatialCellKey(body.position);
      
      if (!this.spatialGrid.has(cellKey)) {
        this.spatialGrid.set(cellKey, []);
      }
      
      this.spatialGrid.get(cellKey).push(body);
    }
  }

  getSpatialCellKey(position) {
    const x = Math.floor(position.x / this.gridSize);
    const y = Math.floor(position.y / this.gridSize);
    const z = Math.floor(position.z / this.gridSize);
    return `${x},${y},${z}`;
  }

  getNearbyBodies(cellKey) {
    const [x, y, z] = cellKey.split(',').map(Number);
    const nearbyBodies = [];
    
    // Verificar celdas adyacentes (27 celdas en total)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nearbyKey = `${x + dx},${y + dy},${z + dz}`;
          const bodies = this.spatialGrid.get(nearbyKey);
          
          if (bodies) {
            nearbyBodies.push(...bodies);
          }
        }
      }
    }
    
    return nearbyBodies;
  }

  // ========================================
  // POOLS DE OBJETOS
  // ========================================

  setupObjectPools() {
    // Pool de vectores
    for (let i = 0; i < 100; i++) {
      this.vectorPool.push(new THREE.Vector3());
    }
    
    // Pool de contactos
    for (let i = 0; i < 50; i++) {
      this.contactPool.push({
        pointA: new THREE.Vector3(),
        pointB: new THREE.Vector3(),
        normal: new THREE.Vector3(),
        penetration: 0
      });
    }
  }

  getVector() {
    return this.vectorPool.pop() || new THREE.Vector3();
  }

  returnVector(vector) {
    vector.set(0, 0, 0);
    this.vectorPool.push(vector);
  }

  // ========================================
  // API PÚBLICA
  // ========================================

  addForce(entityId, force, point = null) {
    const body = this.rigidBodies.get(entityId);
    if (body && !body.isStatic) {
      body.forces.add(force);
      
      if (point) {
        const torque = point.clone().sub(body.position).cross(force);
        body.torques.add(torque);
      }
    }
  }

  addImpulse(entityId, impulse) {
    const body = this.rigidBodies.get(entityId);
    if (body && !body.isStatic) {
      body.velocity.add(impulse.clone().multiplyScalar(body.inverseMass));
      body.isSleeping = false;
    }
  }

  setVelocity(entityId, velocity) {
    const body = this.rigidBodies.get(entityId);
    if (body && !body.isStatic) {
      body.velocity.copy(velocity);
      body.isSleeping = false;
    }
  }

  getVelocity(entityId) {
    const body = this.rigidBodies.get(entityId);
    return body ? body.velocity.clone() : new THREE.Vector3();
  }

  setPosition(entityId, position) {
    const body = this.rigidBodies.get(entityId);
    if (body) {
      body.position.copy(position);
      body.isSleeping = false;
    }
  }

  getPosition(entityId) {
    const body = this.rigidBodies.get(entityId);
    return body ? body.position.clone() : new THREE.Vector3();
  }

  // ========================================
  // CONSTRAINTS Y JOINTS
  // ========================================

  applyConstraints() {
    // Implementar constraints como springs, joints, etc.
    for (const constraint of this.constraints) {
      if (constraint.type === 'spring') {
        this.applySpringConstraint(constraint);
      } else if (constraint.type === 'distance') {
        this.applyDistanceConstraint(constraint);
      }
    }
  }

  applySpringConstraint(constraint) {
    const bodyA = this.rigidBodies.get(constraint.entityA);
    const bodyB = this.rigidBodies.get(constraint.entityB);
    
    if (!bodyA || !bodyB) return;
    
    const distance = bodyA.position.distanceTo(bodyB.position);
    const displacement = distance - constraint.restLength;
    
    if (Math.abs(displacement) > 0.001) {
      const direction = bodyB.position.clone().sub(bodyA.position).normalize();
      const force = direction.multiplyScalar(displacement * constraint.stiffness);
      
      this.addForce(constraint.entityA, force);
      this.addForce(constraint.entityB, force.clone().negate());
    }
  }

  // ========================================
  // MÉTRICS Y DEBUGGING
  // ========================================

  getMetrics() {
    return {
      ...this.metrics,
      spatialGridCells: this.spatialGrid ? this.spatialGrid.size : 0,
      sleepingBodies: Array.from(this.rigidBodies.values()).filter(body => body.isSleeping).length
    };
  }

  // ========================================
  // LIMPIEZA
  // ========================================

  destroy() {
    this.rigidBodies.clear();
    this.colliders.clear();
    this.constraints.length = 0;
    this.forces.length = 0;
    
    if (this.spatialGrid) {
      this.spatialGrid.clear();
    }
    
    this.vectorPool.length = 0;
    this.contactPool.length = 0;
    
    console.log('🧹 Motor de física destruido');
  }
}

export default PhysicsEngine;