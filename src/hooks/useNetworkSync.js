/* ============================================================================ */
/* 🌐 CRASH WORM 3D - NETWORK SYNC HOOK */
/* ============================================================================ */
/* Ubicación: src/hooks/useNetworkSync.js */

import { useEffect, useRef, useCallback, useState } from 'react';
import { gameConfig } from '../data/gameConfig';

export function useNetworkSync(gameEngine, options = {}) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const messageQueueRef = useRef([]);
  const lastSyncTimeRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [playersData, setPlayersData] = useState(new Map());
  const [roomData, setRoomData] = useState(null);
  const [latency, setLatency] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const config = {
    ...gameConfig.network,
    ...options
  };

  // ========================================
  // 🔌 CONNECTION MANAGEMENT
  // ========================================

  const connect = useCallback((endpoint = config.endpoints.game) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        setConnectionState('connecting');
        wsRef.current = new WebSocket(endpoint);

        wsRef.current.onopen = () => {
          setIsConnected(true);
          setConnectionState('connected');
          setReconnectAttempts(0);

          // Start heartbeat
          startHeartbeat();

          // Send queued messages
          flushMessageQueue();

          resolve();
        };

        wsRef.current.onmessage = handleMessage;
        wsRef.current.onerror = handleError;
        wsRef.current.onclose = handleClose;

        // Connection timeout
        setTimeout(() => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) {
            wsRef.current?.close();
            reject(new Error('Connection timeout'));
          }
        }, config.connection.timeout);

      } catch (error) {
        setConnectionState('error');
        reject(error);
      }
    });
  }, [config]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
    }
    stopHeartbeat();
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const reconnect = useCallback(async () => {
    if (reconnectAttempts >= config.connection.maxReconnectAttempts) {
      setConnectionState('failed');
      return;
    }

    setReconnectAttempts(prev => prev + 1);
    setConnectionState('reconnecting');

    try {
      await new Promise(resolve =>
        setTimeout(resolve, config.connection.reconnectInterval * reconnectAttempts)
      );
      await connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      reconnect(); // Try again
    }
  }, [reconnectAttempts, config, connect]);

  // ========================================
  // 📨 MESSAGE HANDLING
  // ========================================

  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'player_update':
          handlePlayerUpdate(message.data);
          break;

        case 'room_update':
          handleRoomUpdate(message.data);
          break;

        case 'game_state':
          handleGameStateUpdate(message.data);
          break;

        case 'ping':
          handlePing(message.data);
          break;

        case 'pong':
          handlePong(message.data);
          break;

        case 'error':
          handleServerError(message.data);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }, []);

  const handlePlayerUpdate = useCallback((data) => {
    setPlayersData(prev => {
      const newMap = new Map(prev);
      data.players.forEach(player => {
        newMap.set(player.id, {
          ...newMap.get(player.id),
          ...player,
          lastUpdate: Date.now()
        });
      });
      return newMap;
    });

    // Update game engine entities
    if (gameEngine) {
      data.players.forEach(playerData => {
        const entity = gameEngine.getEntityByNetId(playerData.id);
        if (entity) {
          // Apply interpolation for smooth movement
          interpolatePlayerPosition(entity, playerData);
        }
      });
    }
  }, [gameEngine]);

  const handleRoomUpdate = useCallback((data) => {
    setRoomData(data);
  }, []);

  const handleGameStateUpdate = useCallback((data) => {
    if (gameEngine) {
      // Sync game state with server
      gameEngine.syncFromNetwork(data);
    }
  }, [gameEngine]);

  const handlePing = useCallback((data) => {
    sendMessage('pong', { timestamp: data.timestamp });
  }, []);

  const handlePong = useCallback((data) => {
    const now = Date.now();
    const roundTripTime = now - data.timestamp;
    setLatency(roundTripTime / 2);
  }, []);

  const handleServerError = useCallback((data) => {
    console.error('Server error:', data);
  }, []);

  const handleError = useCallback((error) => {
    console.error('WebSocket error:', error);
    setConnectionState('error');
  }, []);

  const handleClose = useCallback((event) => {
    setIsConnected(false);
    stopHeartbeat();

    if (event.code !== 1000 && event.code !== 1001) {
      // Unexpected close, attempt reconnect
      setConnectionState('reconnecting');
      reconnectTimeoutRef.current = setTimeout(reconnect, config.connection.reconnectInterval);
    } else {
      setConnectionState('disconnected');
    }
  }, [reconnect, config]);

  // ========================================
  // 💌 MESSAGE SENDING
  // ========================================

  const sendMessage = useCallback((type, data = {}) => {
    const message = {
      type,
      data,
      timestamp: Date.now()
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for later
      messageQueueRef.current.push(message);
    }
  }, []);

  const flushMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0) {
      const message = messageQueueRef.current.shift();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    }
  }, []);

  // ========================================
  // 💓 HEARTBEAT SYSTEM
  // ========================================

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      sendMessage('ping', { timestamp: Date.now() });
    }, config.connection.heartbeatInterval);
  }, [config, sendMessage]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ========================================
  // 🔄 INTERPOLATION SYSTEM
  // ========================================

  const interpolatePlayerPosition = useCallback((entity, targetData) => {
    if (!entity || !targetData.position) return;

    const currentPos = entity.position;
    const targetPos = targetData.position;

    // Calculate interpolation factor based on latency
    const lerpFactor = Math.min(latency / 100, 1); // Max 100ms interpolation

    // Smooth interpolation
    entity.position.x += (targetPos.x - currentPos.x) * lerpFactor;
    entity.position.y += (targetPos.y - currentPos.y) * lerpFactor;
    entity.position.z += (targetPos.z - currentPos.z) * lerpFactor;

    // Update rotation if available
    if (targetData.rotation) {
      entity.rotation.y += (targetData.rotation.y - entity.rotation.y) * lerpFactor;
    }
  }, [latency]);

  // ========================================
  // 🎮 GAME SYNC METHODS
  // ========================================

  const syncPlayerState = useCallback((playerData) => {
    sendMessage('player_update', playerData);
  }, [sendMessage]);

  const syncGameAction = useCallback((action) => {
    sendMessage('game_action', action);
  }, [sendMessage]);

  const joinRoom = useCallback((roomId, playerData) => {
    sendMessage('join_room', { roomId, player: playerData });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    sendMessage('leave_room');
  }, [sendMessage]);

  const createRoom = useCallback((roomConfig) => {
    sendMessage('create_room', roomConfig);
  }, [sendMessage]);

  // ========================================
  // 🧹 CLEANUP
  // ========================================

  useEffect(() => {
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected,
    connectionState,
    latency,
    reconnectAttempts,

    // Data
    playersData,
    roomData,

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Communication
    sendMessage,

    // Game sync
    syncPlayerState,
    syncGameAction,

    // Room management
    joinRoom,
    leaveRoom,
    createRoom
  };
}

export default useNetworkSync;
