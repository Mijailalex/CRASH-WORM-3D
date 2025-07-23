/* ============================================================================ */
/* 🎮 CRASH WORM 3D - HOOK DE SINCRONIZACIÓN DE RED */
/* ============================================================================ */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGame } from '@/context/GameContext';

// ========================================
// 🌐 HOOK DE NETWORK SYNC
// ========================================

export function useNetworkSync() {
  const { state, actions } = useGame();
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [latency, setLatency] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);

  const messageQueueRef = useRef([]);
  const lastPingRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // ========================================
  // 🔌 GESTIÓN DE CONEXIÓN
  // ========================================

  const connect = useCallback((serverUrl = 'ws://localhost:3001') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.warn('Already connected to server');
      return;
    }

    try {
      wsRef.current = new WebSocket(serverUrl);

      wsRef.current.onopen = handleConnectionOpen;
      wsRef.current.onmessage = handleMessage;
      wsRef.current.onclose = handleConnectionClose;
      wsRef.current.onerror = handleConnectionError;

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError(error.message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setPlayers([]);
    setRoomCode('');
    actions.setMultiplayerState({ isConnected: false });
  }, [actions]);

  const handleConnectionOpen = useCallback(() => {
    console.log('🌐 Connected to game server');
    setIsConnected(true);
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;

    // Enviar datos de autenticación
    sendMessage({
      type: 'auth',
      data: {
        playerName: state.playerName,
        version: '1.0.0'
      }
    });

    // Iniciar ping para medir latencia
    startPing();

    actions.setMultiplayerState({ isConnected: true });
  }, [state.playerName, actions]);

  const handleConnectionClose = useCallback((event) => {
    console.log('🔌 Disconnected from server:', event.reason);
    setIsConnected(false);
    actions.setMultiplayerState({ isConnected: false });

    // Intentar reconexión si no fue intencional
    if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
      setTimeout(() => {
        reconnectAttemptsRef.current++;
        console.log(`Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        connect();
      }, 2000 * reconnectAttemptsRef.current);
    }
  }, [actions, connect]);

  const handleConnectionError = useCallback((error) => {
    console.error('🚨 WebSocket error:', error);
    setConnectionError('Connection failed');
  }, []);

  // ========================================
  // 📨 MANEJO DE MENSAJES
  // ========================================

  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'pong':
          handlePong(message.data);
          break;

        case 'room_created':
          handleRoomCreated(message.data);
          break;

        case 'room_joined':
          handleRoomJoined(message.data);
          break;

        case 'player_joined':
          handlePlayerJoined(message.data);
          break;

        case 'player_left':
          handlePlayerLeft(message.data);
          break;

        case 'game_state':
          handleGameState(message.data);
          break;

        case 'player_update':
          handlePlayerUpdate(message.data);
          break;

        case 'game_event':
          handleGameEvent(message.data);
          break;

        case 'error':
          handleServerError(message.data);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(message);
    }
  }, []);

  // ========================================
  // 🏠 GESTIÓN DE SALAS
  // ========================================

  const createRoom = useCallback((options = {}) => {
    sendMessage({
      type: 'create_room',
      data: {
        maxPlayers: options.maxPlayers || 4,
        gameMode: options.gameMode || 'cooperative',
        isPrivate: options.isPrivate || false,
        password: options.password
      }
    });
  }, [sendMessage]);

  const joinRoom = useCallback((roomCode, password = null) => {
    sendMessage({
      type: 'join_room',
      data: {
        roomCode,
        password
      }
    });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    sendMessage({
      type: 'leave_room'
    });
  }, [sendMessage]);

  const handleRoomCreated = useCallback((data) => {
    setRoomCode(data.roomCode);
    setPlayers([data.host]);
    actions.setRoomCode(data.roomCode);
    actions.setMultiplayerState({
      isHost: true,
      roomCode: data.roomCode
    });
    console.log('🏠 Room created:', data.roomCode);
  }, [actions]);

  const handleRoomJoined = useCallback((data) => {
    setRoomCode(data.roomCode);
    setPlayers(data.players);
    actions.setRoomCode(data.roomCode);
    actions.updatePlayerList(data.players);
    actions.setMultiplayerState({
      isHost: false,
      roomCode: data.roomCode
    });
    console.log('🚪 Joined room:', data.roomCode);
  }, [actions]);

  // ========================================
  // 👥 GESTIÓN DE JUGADORES
  // ========================================

  const handlePlayerJoined = useCallback((data) => {
    setPlayers(prev => [...prev, data.player]);
    actions.updatePlayerList([...players, data.player]);
    console.log('👤 Player joined:', data.player.name);
  }, [actions, players]);

  const handlePlayerLeft = useCallback((data) => {
    setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    actions.updatePlayerList(players.filter(p => p.id !== data.playerId));
    console.log('👋 Player left:', data.playerId);
  }, [actions, players]);

  const handlePlayerUpdate = useCallback((data) => {
    // Actualizar estado del jugador remoto
    setPlayers(prev => prev.map(p =>
      p.id === data.playerId
        ? { ...p, ...data.state }
        : p
    ));
  }, []);

  // ========================================
  // 🎮 SINCRONIZACIÓN DEL JUEGO
  // ========================================

  const syncPlayerState = useCallback((playerState) => {
    sendMessage({
      type: 'player_update',
      data: {
        position: playerState.position,
        rotation: playerState.rotation,
        animation: playerState.animation,
        health: playerState.health,
        timestamp: Date.now()
      }
    });
  }, [sendMessage]);

  const sendGameEvent = useCallback((eventType, eventData) => {
    sendMessage({
      type: 'game_event',
      data: {
        eventType,
        eventData,
        timestamp: Date.now()
      }
    });
  }, [sendMessage]);

  const handleGameState = useCallback((data) => {
    // Sincronizar estado del juego completo
    if (data.gameState) {
      // Aplicar estado del juego sin sobrescribir datos locales importantes
      actions.updateScore(data.gameState.score);
      actions.updateLevel(data.gameState.level);
    }
  }, [actions]);

  const handleGameEvent = useCallback((data) => {
    const { eventType, eventData, playerId } = data;

    switch (eventType) {
      case 'player_damaged':
        console.log(`Player ${playerId} took damage:`, eventData.damage);
        break;

      case 'collectible_picked':
        console.log(`Player ${playerId} collected:`, eventData.type);
        break;

      case 'enemy_defeated':
        console.log(`Player ${playerId} defeated enemy:`, eventData.enemyId);
        break;

      case 'level_completed':
        console.log(`Player ${playerId} completed level:`, eventData.level);
        break;

      default:
        console.log('Unknown game event:', eventType, eventData);
    }
  }, []);

  // ========================================
  // 📊 LATENCIA Y PING
  // ========================================

  const startPing = useCallback(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        lastPingRef.current = Date.now();
        sendMessage({
          type: 'ping',
          data: { timestamp: lastPingRef.current }
        });
      } else {
        clearInterval(pingInterval);
      }
    }, 5000); // Ping cada 5 segundos

    return () => clearInterval(pingInterval);
  }, [sendMessage]);

  const handlePong = useCallback((data) => {
    const currentTime = Date.now();
    const pingTime = currentTime - data.timestamp;
    setLatency(pingTime);
  }, []);

  // ========================================
  // 🔐 MANEJO DE ERRORES
  // ========================================

  const handleServerError = useCallback((error) => {
    console.error('Server error:', error);
    setConnectionError(error.message);

    switch (error.code) {
      case 'ROOM_FULL':
        alert('Room is full');
        break;
      case 'ROOM_NOT_FOUND':
        alert('Room not found');
        break;
      case 'INVALID_PASSWORD':
        alert('Invalid password');
        break;
      case 'PLAYER_LIMIT_REACHED':
        alert('Too many players connected');
        break;
      default:
        alert(`Server error: ${error.message}`);
    }
  }, []);

  // ========================================
  // 🧹 CLEANUP
  // ========================================

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-sync cuando hay cambios en el estado local
  useEffect(() => {
    if (isConnected && state.isPlaying) {
      // Sync player state every frame would be too much
      // Instead, sync on significant changes or at intervals
      const syncInterval = setInterval(() => {
        if (state.isPlaying) {
          syncPlayerState({
            position: state.playerPosition,
            health: state.health,
            score: state.score
          });
        }
      }, 100); // 10 FPS sync rate

      return () => clearInterval(syncInterval);
    }
  }, [isConnected, state.isPlaying, syncPlayerState, state]);

  // ========================================
  // 📤 API PÚBLICA
  // ========================================

  return {
    // Connection state
    isConnected,
    connectionError,
    latency,

    // Room management
    roomCode,
    players,
    createRoom,
    joinRoom,
    leaveRoom,

    // Network functions
    connect,
    disconnect,
    sendMessage,
    syncPlayerState,
    sendGameEvent,

    // Utilities
    getPlayerCount: () => players.length,
    isHost: () => state.multiplayer.isHost,
    getPlayer: (id) => players.find(p => p.id === id),
    getRoomInfo: () => ({
      code: roomCode,
      playerCount: players.length,
      maxPlayers: state.multiplayer.maxPlayers,
      gameMode: state.multiplayer.gameMode
    })
  };
}

export default useNetworkSync;
