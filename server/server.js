// ========================================
// CRASH WORM 3D - SERVIDOR PRINCIPAL
// Servidor Express + WebSocket con Seguridad Avanzada
// ========================================

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ========================================
// CONFIGURACIÓN DE SEGURIDAD
// ========================================

class SecurityManager {
  constructor() {
    this.rateLimits = new Map();
    this.suspiciousIPs = new Set();
    this.bannedIPs = new Set();
    this.failedAttempts = new Map();
    this.sessionTokens = new Map();
    this.antiCheatFlags = new Map();
    
    this.setupSecurityPolicies();
  }

  setupSecurityPolicies() {
    this.securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  // Validación y sanitización de entrada
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>'"&]/g, (match) => {
        const escapeMap = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return escapeMap[match];
      });
  }

  // Validación de datos de juego
  validateGameData(data) {
    const errors = [];
    
    if (!data || typeof data !== 'object') {
      errors.push('Datos inválidos');
      return { valid: false, errors };
    }

    // Validar posición del jugador
    if (data.position) {
      const { x, y, z } = data.position;
      if (Math.abs(x) > 1000 || Math.abs(y) > 1000 || Math.abs(z) > 1000) {
        errors.push('Posición del jugador fuera de límites');
      }
    }

    // Validar velocidad del jugador
    if (data.velocity) {
      const { x, y, z } = data.velocity;
      const maxSpeed = 50;
      if (Math.abs(x) > maxSpeed || Math.abs(y) > maxSpeed || Math.abs(z) > maxSpeed) {
        errors.push('Velocidad del jugador sospechosa');
      }
    }

    // Validar puntuación
    if (data.score && typeof data.score === 'number') {
      if (data.score < 0 || data.score > 1000000) {
        errors.push('Puntuación inválida');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Sistema anti-trampa
  detectCheating(playerId, gameData) {
    if (!this.antiCheatFlags.has(playerId)) {
      this.antiCheatFlags.set(playerId, {
        speedViolations: 0,
        positionJumps: 0,
        scoreAnomalies: 0,
        lastPosition: null,
        lastTimestamp: Date.now()
      });
    }

    const flags = this.antiCheatFlags.get(playerId);
    const now = Date.now();
    const deltaTime = now - flags.lastTimestamp;

    // Detectar velocidad imposible
    if (flags.lastPosition && gameData.position && deltaTime > 0) {
      const distance = Math.sqrt(
        Math.pow(gameData.position.x - flags.lastPosition.x, 2) +
        Math.pow(gameData.position.y - flags.lastPosition.y, 2) +
        Math.pow(gameData.position.z - flags.lastPosition.z, 2)
      );
      
      const speed = distance / (deltaTime / 1000);
      if (speed > 100) { // 100 unidades por segundo máximo
        flags.speedViolations++;
        console.warn(`⚠️ Velocidad sospechosa detectada: ${playerId} - ${speed} u/s`);
      }
    }

    // Actualizar datos del jugador
    flags.lastPosition = gameData.position;
    flags.lastTimestamp = now;

    // Banear si hay demasiadas violaciones
    if (flags.speedViolations > 5 || flags.positionJumps > 3 || flags.scoreAnomalies > 2) {
      console.error(`🚨 Jugador baneado por trampa: ${playerId}`);
      return { banned: true, reason: 'Anti-cheat violation' };
    }

    return { banned: false };
  }

  // Rate limiting avanzado
  checkRateLimit(ip, endpoint = 'default') {
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minuto
    const maxRequests = endpoint === 'game' ? 1000 : 100; // Más permisivo para datos de juego

    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, { requests: [], blocked: false });
    }

    const limit = this.rateLimits.get(key);
    
    // Limpiar requests antiguos
    limit.requests = limit.requests.filter(time => now - time < windowMs);
    
    if (limit.requests.length >= maxRequests) {
      if (!limit.blocked) {
        console.warn(`⚠️ Rate limit excedido: ${ip} en ${endpoint}`);
        this.suspiciousIPs.add(ip);
        limit.blocked = true;
        
        setTimeout(() => {
          limit.blocked = false;
        }, windowMs);
      }
      return false;
    }

    limit.requests.push(now);
    return true;
  }

  // Generar token de sesión seguro
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validar token de sesión
  validateSessionToken(token, playerId) {
    const sessionData = this.sessionTokens.get(token);
    return sessionData && sessionData.playerId === playerId && 
           Date.now() - sessionData.created < 3600000; // 1 hora
  }
}

// ========================================
// SERVIDOR DE JUEGO PRINCIPAL
// ========================================

class GameServer {
  constructor(port = 8080) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.security = new SecurityManager();
    
    // Estado del juego
    this.rooms = new Map();
    this.players = new Map();
    this.gameState = new Map();
    this.serverStats = {
      startTime: Date.now(),
      totalConnections: 0,
      currentConnections: 0,
      messagesProcessed: 0,
      errorsCount: 0
    };

    this.setupServer();
    this.setupWebSocket();
    this.setupRoutes();
    this.setupHealthChecks();
  }

  setupServer() {
    // Middlewares de seguridad
    this.app.use((req, res, next) => {
      // Aplicar headers de seguridad
      Object.entries(this.security.securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Rate limiting
      if (!this.security.checkRateLimit(req.ip, 'api')) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      // Verificar IPs baneadas
      if (this.security.bannedIPs.has(req.ip)) {
        return res.status(403).json({ error: 'IP banned' });
      }

      next();
    });

    // CORS configurado de forma segura
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://crashworm3d.com', 'https://www.crashworm3d.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
    }));

    // Rate limiting global
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 1000, // máximo 1000 requests por IP por ventana
      message: 'Demasiadas peticiones desde esta IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(globalLimiter);

    // Parseo de JSON con límite de tamaño
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // Verificar que el JSON no contenga código malicioso
        const body = buf.toString();
        if (body.includes('<script') || body.includes('javascript:')) {
          throw new Error('Contenido malicioso detectado');
        }
      }
    }));

    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  setupRoutes() {
    // Ruta de health check
    this.app.get('/health', (req, res) => {
      const uptime = Date.now() - this.serverStats.startTime;
      res.json({
        status: 'ok',
        uptime: uptime,
        version: '1.0.0',
        connections: this.serverStats.currentConnections,
        rooms: this.rooms.size,
        players: this.players.size
      });
    });

    // Ruta de estadísticas (solo para administradores)
    this.app.get('/admin/stats', (req, res) => {
      // En producción, aquí validarías un token de admin
      res.json({
        ...this.serverStats,
        uptime: Date.now() - this.serverStats.startTime,
        rooms: Array.from(this.rooms.entries()).map(([id, room]) => ({
          id,
          players: room.players.size,
          created: room.created,
          lastActivity: room.lastActivity
        })),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      });
    });

    // Ruta para crear salas
    this.app.post('/api/rooms', (req, res) => {
      try {
        const { name, maxPlayers = 4, gameMode = 'classic' } = req.body;
        
        // Validar entrada
        if (!name || typeof name !== 'string') {
          return res.status(400).json({ error: 'Nombre de sala inválido' });
        }

        const sanitizedName = this.security.sanitizeInput(name);
        const roomId = this.createRoom(sanitizedName, maxPlayers, gameMode);
        
        res.json({ roomId, name: sanitizedName, maxPlayers, gameMode });
      } catch (error) {
        console.error('Error creando sala:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });

    // Ruta para listar salas
    this.app.get('/api/rooms', (req, res) => {
      try {
        const rooms = Array.from(this.rooms.entries()).map(([id, room]) => ({
          id,
          name: room.name,
          players: room.players.size,
          maxPlayers: room.maxPlayers,
          gameMode: room.gameMode,
          status: room.status
        }));
        
        res.json({ rooms });
      } catch (error) {
        console.error('Error listando salas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });

    // Manejo de errores 404
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint no encontrado' });
    });

    // Manejo global de errores
    this.app.use((error, req, res, next) => {
      console.error('Error no manejado:', error);
      this.serverStats.errorsCount++;
      
      if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'JSON inválido' });
      }
      
      res.status(500).json({ error: 'Error interno del servidor' });
    });
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ 
      port: this.port + 1,
      verifyClient: (info) => {
        // Verificar origen del WebSocket
        const origin = info.origin;
        const allowedOrigins = process.env.NODE_ENV === 'production'
          ? ['https://crashworm3d.com', 'https://www.crashworm3d.com']
          : ['http://localhost:3000', 'http://127.0.0.1:3000'];
        
        return allowedOrigins.includes(origin);
      }
    });

    this.wss.on('connection', (ws, req) => {
      const clientIP = req.socket.remoteAddress;
      console.log(`🔌 Nueva conexión WebSocket desde ${clientIP}`);
      
      // Verificar rate limiting para WebSocket
      if (!this.security.checkRateLimit(clientIP, 'websocket')) {
        ws.close(1008, 'Rate limit exceeded');
        return;
      }

      this.serverStats.totalConnections++;
      this.serverStats.currentConnections++;

      const playerId = this.security.generateSessionToken();
      const sessionToken = this.security.generateSessionToken();
      
      // Guardar información del jugador
      this.players.set(playerId, {
        ws,
        ip: clientIP,
        sessionToken,
        connected: Date.now(),
        lastActivity: Date.now(),
        roomId: null,
        gameData: {
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          health: 100,
          score: 0,
          level: 1
        }
      });

      this.security.sessionTokens.set(sessionToken, {
        playerId,
        created: Date.now()
      });

      // Enviar datos de conexión
      ws.send(JSON.stringify({
        type: 'connection',
        playerId,
        sessionToken,
        serverTime: Date.now()
      }));

      // Manejo de mensajes
      ws.on('message', (data) => {
        try {
          this.handleMessage(playerId, data);
        } catch (error) {
          console.error(`Error procesando mensaje de ${playerId}:`, error);
          this.serverStats.errorsCount++;
        }
      });

      // Manejo de desconexión
      ws.on('close', () => {
        console.log(`🔌 Jugador desconectado: ${playerId}`);
        this.handleDisconnection(playerId);
        this.serverStats.currentConnections--;
      });

      // Manejo de errores de WebSocket
      ws.on('error', (error) => {
        console.error(`Error WebSocket para ${playerId}:`, error);
        this.serverStats.errorsCount++;
      });
    });
  }

  handleMessage(playerId, data) {
    try {
      const player = this.players.get(playerId);
      if (!player) return;

      // Verificar rate limiting para mensajes de juego
      if (!this.security.checkRateLimit(player.ip, 'game')) {
        player.ws.send(JSON.stringify({
          type: 'error',
          message: 'Rate limit exceeded'
        }));
        return;
      }

      const message = JSON.parse(data);
      
      // Validar estructura del mensaje
      if (!message.type || typeof message.type !== 'string') {
        throw new Error('Tipo de mensaje inválido');
      }

      // Sanitizar datos del mensaje
      if (message.data) {
        message.data = this.sanitizeMessageData(message.data);
      }

      player.lastActivity = Date.now();
      this.serverStats.messagesProcessed++;

      // Procesar según tipo de mensaje
      switch (message.type) {
        case 'join_room':
          this.handleJoinRoom(playerId, message.data);
          break;
        case 'leave_room':
          this.handleLeaveRoom(playerId);
          break;
        case 'game_update':
          this.handleGameUpdate(playerId, message.data);
          break;
        case 'chat_message':
          this.handleChatMessage(playerId, message.data);
          break;
        case 'ping':
          this.handlePing(playerId, message.data);
          break;
        default:
          console.warn(`Tipo de mensaje desconocido: ${message.type}`);
      }

    } catch (error) {
      console.error(`Error procesando mensaje de ${playerId}:`, error);
      const player = this.players.get(playerId);
      if (player) {
        player.ws.send(JSON.stringify({
          type: 'error',
          message: 'Error procesando mensaje'
        }));
      }
    }
  }

  sanitizeMessageData(data) {
    if (typeof data === 'string') {
      return this.security.sanitizeInput(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeMessageData(value);
      }
      return sanitized;
    }
    
    return data;
  }

  handleJoinRoom(playerId, data) {
    const { roomId } = data;
    const player = this.players.get(playerId);
    
    if (!player || !roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) {
      player.ws.send(JSON.stringify({
        type: 'error',
        message: 'Sala no encontrada'
      }));
      return;
    }

    if (room.players.size >= room.maxPlayers) {
      player.ws.send(JSON.stringify({
        type: 'error',
        message: 'Sala llena'
      }));
      return;
    }

    // Unirse a la sala
    room.players.set(playerId, player);
    player.roomId = roomId;
    room.lastActivity = Date.now();

    // Notificar al jugador
    player.ws.send(JSON.stringify({
      type: 'room_joined',
      roomId,
      players: Array.from(room.players.keys())
    }));

    // Notificar a otros jugadores
    this.broadcastToRoom(roomId, {
      type: 'player_joined',
      playerId,
      playerCount: room.players.size
    }, playerId);

    console.log(`🎮 Jugador ${playerId} se unió a sala ${roomId}`);
  }

  handleLeaveRoom(playerId) {
    const player = this.players.get(playerId);
    if (!player || !player.roomId) return;

    const room = this.rooms.get(player.roomId);
    if (room) {
      room.players.delete(playerId);
      
      // Notificar a otros jugadores
      this.broadcastToRoom(player.roomId, {
        type: 'player_left',
        playerId,
        playerCount: room.players.size
      }, playerId);

      // Eliminar sala si está vacía
      if (room.players.size === 0) {
        this.rooms.delete(player.roomId);
        console.log(`🗑️ Sala ${player.roomId} eliminada (vacía)`);
      }
    }

    player.roomId = null;
    console.log(`🚪 Jugador ${playerId} salió de la sala`);
  }

  handleGameUpdate(playerId, data) {
    const player = this.players.get(playerId);
    if (!player || !player.roomId) return;

    // Validar datos de juego
    const validation = this.security.validateGameData(data);
    if (!validation.valid) {
      console.warn(`⚠️ Datos de juego inválidos de ${playerId}:`, validation.errors);
      return;
    }

    // Verificar anti-cheat
    const cheatCheck = this.security.detectCheating(playerId, data);
    if (cheatCheck.banned) {
      this.banPlayer(playerId, cheatCheck.reason);
      return;
    }

    // Actualizar datos del jugador
    Object.assign(player.gameData, data);

    // Broadcast a otros jugadores en la sala
    this.broadcastToRoom(player.roomId, {
      type: 'player_update',
      playerId,
      data: player.gameData,
      timestamp: Date.now()
    }, playerId);
  }

  handleChatMessage(playerId, data) {
    const { message } = data;
    const player = this.players.get(playerId);
    
    if (!player || !player.roomId || !message) return;

    // Sanitizar mensaje de chat
    const sanitizedMessage = this.security.sanitizeInput(message);
    
    // Verificar longitud del mensaje
    if (sanitizedMessage.length > 200) {
      player.ws.send(JSON.stringify({
        type: 'error',
        message: 'Mensaje demasiado largo'
      }));
      return;
    }

    // Broadcast mensaje a la sala
    this.broadcastToRoom(player.roomId, {
      type: 'chat_message',
      playerId,
      message: sanitizedMessage,
      timestamp: Date.now()
    });
  }

  handlePing(playerId, data) {
    const player = this.players.get(playerId);
    if (!player) return;

    player.ws.send(JSON.stringify({
      type: 'pong',
      clientTimestamp: data.timestamp,
      serverTimestamp: Date.now()
    }));
  }

  createRoom(name, maxPlayers, gameMode) {
    const roomId = crypto.randomBytes(16).toString('hex');
    
    this.rooms.set(roomId, {
      id: roomId,
      name,
      maxPlayers,
      gameMode,
      players: new Map(),
      created: Date.now(),
      lastActivity: Date.now(),
      status: 'waiting'
    });

    console.log(`🏠 Nueva sala creada: ${roomId} - ${name}`);
    return roomId;
  }

  broadcastToRoom(roomId, message, excludePlayerId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    
    for (const [playerId, player] of room.players) {
      if (playerId !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
        try {
          player.ws.send(messageStr);
        } catch (error) {
          console.error(`Error enviando mensaje a ${playerId}:`, error);
        }
      }
    }
  }

  banPlayer(playerId, reason) {
    const player = this.players.get(playerId);
    if (!player) return;

    console.log(`🚨 Jugador baneado: ${playerId} - Razón: ${reason}`);
    
    // Agregar IP a lista de baneados
    this.security.bannedIPs.add(player.ip);
    
    // Desconectar jugador
    player.ws.send(JSON.stringify({
      type: 'banned',
      reason
    }));
    
    player.ws.close(1008, reason);
    this.handleDisconnection(playerId);
  }

  handleDisconnection(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Salir de la sala si estaba en una
    if (player.roomId) {
      this.handleLeaveRoom(playerId);
    }

    // Limpiar datos del jugador
    this.players.delete(playerId);
    this.security.sessionTokens.delete(player.sessionToken);
    this.security.antiCheatFlags.delete(playerId);
  }

  setupHealthChecks() {
    // Limpiar salas inactivas cada 5 minutos
    setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000);

    // Limpiar datos de rate limiting cada hora
    setInterval(() => {
      this.cleanupRateLimits();
    }, 60 * 60 * 1000);

    // Ping a jugadores cada 30 segundos
    setInterval(() => {
      this.pingAllPlayers();
    }, 30 * 1000);
  }

  cleanupInactiveRooms() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutos

    for (const [roomId, room] of this.rooms) {
      if (now - room.lastActivity > inactiveThreshold && room.players.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🧹 Sala inactiva eliminada: ${roomId}`);
      }
    }
  }

  cleanupRateLimits() {
    const now = Date.now();
    const cleanupThreshold = 60 * 60 * 1000; // 1 hora

    for (const [key, data] of this.security.rateLimits) {
      if (data.requests.every(time => now - time > cleanupThreshold)) {
        this.security.rateLimits.delete(key);
      }
    }
  }

  pingAllPlayers() {
    const pingMessage = JSON.stringify({
      type: 'ping',
      timestamp: Date.now()
    });

    for (const [playerId, player] of this.players) {
      if (player.ws.readyState === WebSocket.OPEN) {
        try {
          player.ws.send(pingMessage);
        } catch (error) {
          console.error(`Error enviando ping a ${playerId}:`, error);
          this.handleDisconnection(playerId);
        }
      } else {
        this.handleDisconnection(playerId);
      }
    }
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🚀 Servidor HTTP iniciado en puerto ${this.port}`);
      console.log(`🔌 Servidor WebSocket iniciado en puerto ${this.port + 1}`);
      console.log(`🛡️ Sistema de seguridad activado`);
      console.log(`📊 Health check disponible en: http://localhost:${this.port}/health`);
    });

    this.server.on('error', (error) => {
      console.error('Error del servidor:', error);
      this.serverStats.errorsCount++;
    });

    return this.server;
  }

  stop() {
    console.log('🛑 Deteniendo servidor...');
    
    // Cerrar todas las conexiones WebSocket
    this.wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });
    
    // Cerrar servidor WebSocket
    this.wss.close();
    
    // Cerrar servidor HTTP
    if (this.server) {
      this.server.close();
    }
    
    console.log('✅ Servidor detenido');
  }
}

// ========================================
// INICIALIZACIÓN DEL SERVIDOR
// ========================================

const port = process.env.PORT || 8080;
const gameServer = new GameServer(port);

// Manejo de señales del sistema
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT, cerrando servidor...');
  gameServer.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM, cerrando servidor...');
  gameServer.stop();
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Error no capturado:', error);
  gameServer.serverStats.errorsCount++;
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesa rechazada no manejada:', reason);
  gameServer.serverStats.errorsCount++;
});

// Iniciar servidor
gameServer.start();

module.exports = GameServer;