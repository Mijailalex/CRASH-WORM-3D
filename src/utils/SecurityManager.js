// ========================================
// SISTEMA DE SEGURIDAD AVANZADO
// Protección contra ataques y vulnerabilidades
// ========================================

import CryptoJS from 'crypto-js';

export class SecurityManager {
  constructor(config = {}) {
    this.config = {
      encryptionKey: config.encryptionKey || this.generateSecureKey(),
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hora
      maxFailedAttempts: config.maxFailedAttempts || 5,
      bruteForceWindow: config.bruteForceWindow || 900000, // 15 minutos
      enableCSRFProtection: config.enableCSRFProtection || true,
      enableXSSProtection: config.enableXSSProtection || true,
      enableRateLimiting: config.enableRateLimiting || true,
      ...config
    };

    // Almacenes seguros
    this.sessions = new Map();
    this.failedAttempts = new Map();
    this.rateLimits = new Map();
    this.csrfTokens = new Map();
    this.encryptedStorage = new Map();

    // Inicialization
    this.init();
  }

  init() {
    this.setupCSRFProtection();
    this.setupXSSProtection();
    this.setupRateLimiting();
    this.setupSecureStorage();
    this.startSessionMonitoring();
    
    console.log('🔒 Sistema de seguridad inicializado');
  }

  // ========================================
  // GESTIÓN DE SESIONES SEGURAS
  // ========================================

  createSecureSession(userId, userData = {}) {
    const sessionId = this.generateSecureToken();
    const session = {
      id: sessionId,
      userId,
      userData: this.sanitizeUserData(userData),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress: this.getClientIP(),
      userAgent: this.getClientUserAgent(),
      csrfToken: this.generateCSRFToken(),
      isValid: true
    };

    // Encriptar datos sensibles
    const encryptedSession = this.encryptData(session);
    this.sessions.set(sessionId, encryptedSession);

    // Limpiar intentos fallidos
    this.clearFailedAttempts(userId);

    console.log(`✅ Sesión segura creada para usuario ${userId}`);
    return sessionId;
  }

  validateSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      return { valid: false, error: 'Invalid session ID format' };
    }

    const encryptedSession = this.sessions.get(sessionId);
    if (!encryptedSession) {
      return { valid: false, error: 'Session not found' };
    }

    const session = this.decryptData(encryptedSession);
    const currentTime = Date.now();

    // Verificar expiración
    if (currentTime - session.createdAt > this.config.sessionTimeout) {
      this.destroySession(sessionId);
      return { valid: false, error: 'Session expired' };
    }

    // Verificar inactividad
    if (currentTime - session.lastActivity > this.config.sessionTimeout / 2) {
      return { valid: false, error: 'Session inactive' };
    }

    // Actualizar última actividad
    session.lastActivity = currentTime;
    this.sessions.set(sessionId, this.encryptData(session));

    return { valid: true, session };
  }

  destroySession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      this.csrfTokens.delete(sessionId);
      console.log(`🗑️ Sesión ${sessionId} destruida`);
      return true;
    }
    return false;
  }

  // ========================================
  // PROTECCIÓN CSRF
  // ========================================

  setupCSRFProtection() {
    if (!this.config.enableCSRFProtection) return;

    // Generar token CSRF global
    this.globalCSRFToken = this.generateCSRFToken();
    
    // Interceptar formularios
    this.interceptForms();
  }

  generateCSRFToken() {
    const timestamp = Date.now().toString();
    const randomData = Math.random().toString(36);
    return CryptoJS.SHA256(timestamp + randomData + this.config.encryptionKey).toString();
  }

  validateCSRFToken(token, sessionId) {
    if (!this.config.enableCSRFProtection) return true;

    const sessionToken = this.csrfTokens.get(sessionId);
    const isValidGlobal = token === this.globalCSRFToken;
    const isValidSession = token === sessionToken;

    if (!isValidGlobal && !isValidSession) {
      console.warn('⚠️ Token CSRF inválido detectado');
      return false;
    }

    return true;
  }

  interceptForms() {
    // Interceptar todos los formularios y agregar token CSRF
    document.addEventListener('DOMContentLoaded', () => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_csrf_token';
        csrfInput.value = this.globalCSRFToken;
        form.appendChild(csrfInput);
      });
    });
  }

  // ========================================
  // PROTECCIÓN XSS
  // ========================================

  setupXSSProtection() {
    if (!this.config.enableXSSProtection) return;

    // Configurar Content Security Policy
    this.setCSPHeaders();
    
    // Interceptar y sanitizar contenido dinámico
    this.setupContentSanitization();
  }

  setCSPHeaders() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    // Para aplicaciones SPA, añadir meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = csp;
    document.head.appendChild(meta);
  }

  sanitizeHTML(html) {
    if (!html || typeof html !== 'string') return '';

    // Lista de etiquetas permitidas
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'span', 'div'];
    const allowedAttributes = ['class', 'id'];

    // Crear un elemento temporal para parsear
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Función recursiva para limpiar nodos
    const cleanNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        if (!allowedTags.includes(tagName)) {
          return node.textContent; // Convertir a texto plano
        }

        // Limpiar atributos
        Array.from(node.attributes).forEach(attr => {
          if (!allowedAttributes.includes(attr.name)) {
            node.removeAttribute(attr.name);
          }
        });

        // Limpiar hijos recursivamente
        Array.from(node.childNodes).forEach(child => {
          cleanNode(child);
        });
      }

      return node;
    };

    Array.from(temp.childNodes).forEach(cleanNode);
    return temp.innerHTML;
  }

  sanitizeUserData(data) {
    if (typeof data === 'string') {
      return this.escapeHTML(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeUserData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        const cleanKey = this.escapeHTML(key);
        sanitized[cleanKey] = this.sanitizeUserData(value);
      }
      return sanitized;
    }

    return data;
  }

  escapeHTML(str) {
    if (typeof str !== 'string') return str;
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  setupContentSanitization() {
    // Interceptar innerHTML y similares
    const originalInnerHTML = Element.prototype.__lookupSetter__('innerHTML');
    if (originalInnerHTML) {
      Element.prototype.__defineSetter__('innerHTML', function(value) {
        const sanitized = this.sanitizeHTML(value);
        originalInnerHTML.call(this, sanitized);
      });
    }
  }

  // ========================================
  // RATE LIMITING
  // ========================================

  setupRateLimiting() {
    if (!this.config.enableRateLimiting) return;

    // Limpiar contadores cada minuto
    setInterval(() => {
      this.cleanupRateLimits();
    }, 60000);
  }

  checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    if (!this.config.enableRateLimiting) return { allowed: true };

    const now = Date.now();
    const key = `${identifier}_${Math.floor(now / windowMs)}`;

    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, { count: 0, resetTime: now + windowMs });
    }

    const limit = this.rateLimits.get(key);
    limit.count++;

    if (limit.count > maxRequests) {
      console.warn(`⚠️ Rate limit excedido para ${identifier}`);
      return {
        allowed: false,
        retryAfter: Math.ceil((limit.resetTime - now) / 1000),
        requestsRemaining: 0
      };
    }

    return {
      allowed: true,
      requestsRemaining: maxRequests - limit.count,
      resetTime: limit.resetTime
    };
  }

  cleanupRateLimits() {
    const now = Date.now();
    for (const [key, limit] of this.rateLimits) {
      if (now > limit.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }

  // ========================================
  // PROTECCIÓN CONTRA FUERZA BRUTA
  // ========================================

  recordFailedAttempt(identifier) {
    const now = Date.now();
    
    if (!this.failedAttempts.has(identifier)) {
      this.failedAttempts.set(identifier, []);
    }

    const attempts = this.failedAttempts.get(identifier);
    attempts.push(now);

    // Limpiar intentos antiguos
    const validAttempts = attempts.filter(time => 
      now - time < this.config.bruteForceWindow
    );
    
    this.failedAttempts.set(identifier, validAttempts);

    if (validAttempts.length >= this.config.maxFailedAttempts) {
      console.warn(`🚨 Posible ataque de fuerza bruta desde ${identifier}`);
      return {
        blocked: true,
        attemptsRemaining: 0,
        resetTime: now + this.config.bruteForceWindow
      };
    }

    return {
      blocked: false,
      attemptsRemaining: this.config.maxFailedAttempts - validAttempts.length,
      resetTime: null
    };
  }

  clearFailedAttempts(identifier) {
    this.failedAttempts.delete(identifier);
  }

  isBlocked(identifier) {
    const attempts = this.failedAttempts.get(identifier);
    if (!attempts) return false;

    const now = Date.now();
    const recentAttempts = attempts.filter(time => 
      now - time < this.config.bruteForceWindow
    );

    return recentAttempts.length >= this.config.maxFailedAttempts;
  }

  // ========================================
  // ENCRIPTACIÓN Y ALMACENAMIENTO SEGURO
  // ========================================

  setupSecureStorage() {
    // Verificar soporte para crypto
    if (!window.crypto || !window.crypto.subtle) {
      console.warn('⚠️ Web Crypto API no disponible, usando fallback');
    }
  }

  generateSecureKey() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  generateSecureToken() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  encryptData(data) {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.config.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('❌ Error encriptando datos:', error);
      return null;
    }
  }

  decryptData(encryptedData) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.config.encryptionKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('❌ Error desencriptando datos:', error);
      return null;
    }
  }

  secureStore(key, data) {
    const encryptedData = this.encryptData(data);
    if (encryptedData) {
      this.encryptedStorage.set(key, encryptedData);
      return true;
    }
    return false;
  }

  secureRetrieve(key) {
    const encryptedData = this.encryptedStorage.get(key);
    if (encryptedData) {
      return this.decryptData(encryptedData);
    }
    return null;
  }

  secureDelete(key) {
    return this.encryptedStorage.delete(key);
  }

  // ========================================
  // MONITOREO DE SESIONES
  // ========================================

  startSessionMonitoring() {
    // Limpiar sesiones expiradas cada 5 minutos
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 300000);

    // Monitorear actividad sospechosa
    this.setupSuspiciousActivityDetection();
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, encryptedSession] of this.sessions) {
      const session = this.decryptData(encryptedSession);
      if (session && (now - session.createdAt > this.config.sessionTimeout)) {
        this.destroySession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} sesiones expiradas limpiadas`);
    }
  }

  setupSuspiciousActivityDetection() {
    // Detectar múltiples sesiones del mismo usuario
    this.monitorMultipleSessions();
    
    // Detectar cambios de IP/User-Agent
    this.monitorSessionFingerprinting();
  }

  monitorMultipleSessions() {
    const userSessions = new Map();

    for (const [sessionId, encryptedSession] of this.sessions) {
      const session = this.decryptData(encryptedSession);
      if (!session) continue;

      if (!userSessions.has(session.userId)) {
        userSessions.set(session.userId, []);
      }
      userSessions.get(session.userId).push(sessionId);
    }

    // Alertar sobre usuarios con múltiples sesiones
    for (const [userId, sessions] of userSessions) {
      if (sessions.length > 3) {
        console.warn(`⚠️ Usuario ${userId} tiene ${sessions.length} sesiones activas`);
      }
    }
  }

  monitorSessionFingerprinting() {
    // Implementar verificación de fingerprinting aquí
    // Por simplicidad, solo logeamos la capacidad
    console.log('🔍 Monitoreo de fingerprinting de sesiones activo');
  }

  // ========================================
  // UTILIDADES DE SEGURIDAD
  // ========================================

  getClientIP() {
    // En un entorno real, esto vendría del servidor
    return 'client.ip.address';
  }

  getClientUserAgent() {
    return navigator.userAgent;
  }

  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const issues = [];
    
    if (password.length < minLength) {
      issues.push(`Mínimo ${minLength} caracteres`);
    }
    if (!hasUpperCase) {
      issues.push('Al menos una mayúscula');
    }
    if (!hasLowerCase) {
      issues.push('Al menos una minúscula');
    }
    if (!hasNumbers) {
      issues.push('Al menos un número');
    }
    if (!hasSpecialChar) {
      issues.push('Al menos un carácter especial');
    }

    return {
      valid: issues.length === 0,
      issues,
      strength: this.calculatePasswordStrength(password)
    };
  }

  calculatePasswordStrength(password) {
    let score = 0;
    
    // Longitud
    score += Math.min(password.length * 4, 25);
    
    // Variedad de caracteres
    if (/[A-Z]/.test(password)) score += 5;
    if (/[a-z]/.test(password)) score += 5;
    if (/[0-9]/.test(password)) score += 5;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;
    
    // Patrones comunes (penalización)
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repetición
    if (/123|abc|qwe/i.test(password)) score -= 10; // Secuencias
    
    if (score < 30) return 'Débil';
    if (score < 60) return 'Media';
    if (score < 90) return 'Fuerte';
    return 'Muy Fuerte';
  }

  // ========================================
  // LOGGING Y AUDITORÍA
  // ========================================

  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('🔒 Evento de seguridad:', logEntry);
    
    // En un entorno real, enviar al servidor de logs
    // this.sendToSecurityLog(logEntry);
  }

  // ========================================
  // CLEANUP Y DESTRUCCIÓN
  // ========================================

  destroy() {
    // Limpiar todas las sesiones
    this.sessions.clear();
    this.failedAttempts.clear();
    this.rateLimits.clear();
    this.csrfTokens.clear();
    this.encryptedStorage.clear();

    console.log('🧹 Sistema de seguridad destruido');
  }

  // ========================================
  // API PÚBLICA SIMPLIFICADA
  // ========================================

  // Métodos principales para usar en la aplicación
  authenticate(credentials) {
    // Implementar lógica de autenticación
    const { username, password } = credentials;
    
    // Verificar si está bloqueado
    if (this.isBlocked(username)) {
      return { success: false, error: 'Account temporarily locked' };
    }

    // Aquí iría la verificación real de credenciales
    const isValid = this.verifyCredentials(username, password);
    
    if (!isValid) {
      const bruteForceResult = this.recordFailedAttempt(username);
      return { 
        success: false, 
        error: 'Invalid credentials',
        bruteForce: bruteForceResult
      };
    }

    // Crear sesión segura
    const sessionId = this.createSecureSession(username, { role: 'player' });
    return { success: true, sessionId, csrfToken: this.globalCSRFToken };
  }

  verifyCredentials(username, password) {
    // Implementación básica - en producción usar hash seguro
    // Esta es solo para demostración
    return username && password && password.length >= 8;
  }

  logout(sessionId) {
    return this.destroySession(sessionId);
  }

  isAuthenticated(sessionId) {
    const result = this.validateSession(sessionId);
    return result.valid;
  }
}

export default SecurityManager;