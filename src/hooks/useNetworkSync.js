// ========================================
// HOOK useNetworkSync
// ========================================

export function useNetworkSync(config = {}) {
  const [networkState, setNetworkState] = useState({
    isConnected: false,
    players: new Map(),
    latency: 0,
    server: null
  });

  const playersRef = useRef(new Map());
  const wsRef = useRef(null);

  // Inicializar conexión de red (simulada para este ejemplo)
  useEffect(() => {
    // En un proyecto real, esto conectaría a un WebSocket o WebRTC
    const initializeNetwork = () => {
      setNetworkState(prev => ({
        ...prev,
        isConnected: config.enableMultiplayer || false,
        server: config.server || 'localhost:3001'
      }));

      console.log('🌐 NetworkSync inicializado (modo local)');
    };

    initializeNetwork();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [config.enableMultiplayer]);

  const sendPlayerUpdate = useCallback((playerData) => {
    if (!networkState.isConnected) return;
    
    // En un proyecto real, esto enviaría datos por WebSocket
    console.log('📡 Sending player update:', playerData);
  }, [networkState.isConnected]);

  const onPlayerJoin = useCallback((callback) => {
    // Registrar callback para cuando un jugador se une
    return () => {}; // Cleanup function
  }, []);

  const onPlayerLeave = useCallback((callback) => {
    // Registrar callback para cuando un jugador se va
    return () => {}; // Cleanup function
  }, []);

  const broadcastEvent = useCallback((eventType, data) => {
    if (!networkState.isConnected) return;
    
    console.log(`📢 Broadcasting ${eventType}:`, data);
  }, [networkState.isConnected]);

  return {
    networkState,
    sendPlayerUpdate,
    onPlayerJoin,
    onPlayerLeave,
    broadcastEvent
  };
}

// ========================================
// UTILIDADES PARA CONFIGURAR EL MOTOR
// ========================================

async function registerGameSystems(gameEngine) {
  // Sistema de Física
  const PhysicsSystem = {
    name: 'physics',
    enabled: true,
    entities: new Set(),
    
    initialize(engine) {
      this.engine = engine;
      console.log('🏃 Physics System inicializado');
    },
    
    update(deltaTime) {
      const physicsEntities = this.engine.getEntitiesWithComponent('physics');
      
      for (const entityId of physicsEntities) {
        const transform = this.engine.getComponent(entityId, 'transform');
        const physics = this.engine.getComponent(entityId, 'physics');
        
        if (transform && physics) {
          // Aplicar gravedad
          physics.velocity.y -= 9.81 * deltaTime / 1000;
          
          // Aplicar velocidad
          transform.position.x += physics.velocity.x * deltaTime / 1000;
          transform.position.y += physics.velocity.y * deltaTime / 1000;
          transform.position.z += physics.velocity.z * deltaTime / 1000;
          
          // Aplicar fricción
          physics.velocity.x *= physics.friction;
          physics.velocity.z *= physics.friction;
        }
      }
    }
  };

  // Sistema de Renderizado
  const RenderSystem = {
    name: 'render',
    enabled: true,
    
    initialize(engine) {
      this.engine = engine;
      console.log('🎨 Render System inicializado');
    },
    
    update(deltaTime) {
      // El renderizado se maneja por React Three Fiber
      // Aquí solo actualizamos datos de render si es necesario
    }
  };

  // Sistema de Input
  const InputSystem = {
    name: 'input',
    enabled: true,
    keys: {},
    
    initialize(engine) {
      this.engine = engine;
      this.setupInputHandlers();
      console.log('⌨️ Input System inicializado');
    },
    
    setupInputHandlers() {
      window.addEventListener('keydown', (e) => {
        this.keys[e.code] = true;
      });
      
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });
    },
    
    update(deltaTime) {
      // Procesar input del jugador
      this.engine.eventBus.emit('input:update', {
        keys: { ...this.keys },
        deltaTime
      });
    }
  };

  // Registrar sistemas
  gameEngine.registerSystem('physics', PhysicsSystem, 100);
  gameEngine.registerSystem('render', RenderSystem, 50);
  gameEngine.registerSystem('input', InputSystem, 200);
}

function setupEngineEvents(gameEngine, gameActions) {
  // Evento cuando una entidad es creada
  gameEngine.eventBus.subscribe('entity:created', (entity) => {
    console.log(`✨ Entidad creada: ${entity.name}`);
  });

  // Evento cuando una entidad es destruida
  gameEngine.eventBus.subscribe('entity:destroyed', ({ entityId }) => {
    console.log(`💥 Entidad destruida: ${entityId}`);
  });

  // Evento de input
  gameEngine.eventBus.subscribe('input:update', ({ keys }) => {
    if (keys.Space) {
      gameActions.playerJump?.();
    }
    if (keys.KeyW || keys.ArrowUp) {
      gameActions.playerMove?.(0, 0, -1);
    }
    if (keys.KeyS || keys.ArrowDown) {
      gameActions.playerMove?.(0, 0, 1);
    }
    if (keys.KeyA || keys.ArrowLeft) {
      gameActions.playerMove?.(-1, 0, 0);
    }
    if (keys.KeyD || keys.ArrowRight) {
      gameActions.playerMove?.(1, 0, 0);
    }
  });

  // Iniciar el motor
  gameEngine.start();
}