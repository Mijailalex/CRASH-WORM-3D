
// ========================================
// HOOKS PERSONALIZADOS COMPLETOS
// useGameEngine, useAudioManager, useNetworkSync
// ========================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameEngine } from '../core/GameEngine';
import { useGame } from '../context/GameContext';
import * as Tone from 'tone';

// ========================================
// HOOK useNetworkSync
// Ubicación: src/hooks/useNetworkSync.js
// ========================================

export function useNetworkSync(gameState) {
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState(new Map());
  const [room, setRoom] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Conectar al servidor
  useEffect(() => {
    connectToServer();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectToServer = useCallback(() => {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('🔗 Conectado al servidor');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('🔌 Desconectado del servidor');
        // Reintento de conexión
        reconnectTimeoutRef.current = setTimeout(connectToServer, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('Error WebSocket:', error);
      };

    } catch (error) {
      console.error('Error conectando:', error);
    }
  }, []);

  const handleServerMessage = useCallback((data) => {
    switch (data.type) {
      case 'player_joined':
        setPlayers(prev => new Map(prev.set(data.playerId, data.player)));
        break;
      case 'player_left':
        setPlayers(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.playerId);
          return newMap;
        });
        break;
      case 'player_position':
        setPlayers(prev => {
          const newMap = new Map(prev);
          const player = newMap.get(data.playerId);
          if (player) {
            player.position = data.position;
            newMap.set(data.playerId, player);
          }
          return newMap;
        });
        break;
      case 'room_joined':
        setRoom(data.room);
        break;
      case 'game_state':
        // Sincronizar estado del juego
        break;
    }
  }, []);

  // Enviar posición del jugador
  const sendPlayerPosition = useCallback((position) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'player_position',
        position
      }));
    }
  }, [isConnected]);

  // Unirse a una sala
  const joinRoom = useCallback((roomId) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'join_room',
        roomId
      }));
    }
  }, [isConnected]);

  // Salir de una sala
  const leaveRoom = useCallback(() => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_room'
      }));
    }
    setRoom(null);
  }, [isConnected]);

  // Sincronizar estado del juego
  const syncGameState = useCallback((state) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'game_state',
        state
      }));
    }
  }, [isConnected]);

  return {
    isConnected,
    players,
    room,
    sendPlayerPosition,
    joinRoom,
    leaveRoom,
    syncGameState
  };
}