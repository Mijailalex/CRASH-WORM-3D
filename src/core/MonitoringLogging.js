// ========================================
// SISTEMAS DE MONITOREO, LOGGING Y ALERTAS
// Real-time Monitoring, Structured Logging, Alert System
// ========================================

// ========================================
// MONITORING SYSTEM
// ========================================

export class MonitoringSystem {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      metricsEndpoint: config.metricsEndpoint || '/api/metrics',
      alertsEndpoint: config.alertsEndpoint || '/api/alerts',
      flushInterval: config.flushInterval || 30000, // 30 segundos
      retentionPeriod: config.retentionPeriod || 3600000, // 1 hora
      alertThresholds: config.alertThresholds || {},
      ...config
    };

    this.metrics = new Map();
    this.alerts = new Map();
    this.timeSeries = new Map();
    this.watchers = new Map();
    this.metricQueue = [];
    this.alertQueue = [];
    this.flushTimer = null;
    this.startTime = Date.now();
    
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    this.setupDefaultMetrics();
    this.setupDefaultThresholds();
    this.startMetricsCollection();
    this.startPeriodicFlush();
    
    console.log('📊 Monitoring System inicializado');
  }

  setupDefaultMetrics() {
    // Métricas de rendimiento
    this.registerMetric('fps', 'gauge', 'Frames per second');
    this.registerMetric('memory_usage', 'gauge', 'Memory usage in MB');
    this.registerMetric('cpu_usage', 'gauge', 'CPU usage percentage');
    this.registerMetric('network_latency', 'gauge', 'Network latency in ms');
    
    // Métricas de juego
    this.registerMetric('active_players', 'gauge', 'Number of active players');
    this.registerMetric('game_sessions', 'counter', 'Total game sessions');
    this.registerMetric('level_completions', 'counter', 'Level completions');
    this.registerMetric('player_deaths', 'counter', 'Player deaths');
    this.registerMetric('items_collected', 'counter', 'Items collected');
    
    // Métricas de sistema
    this.registerMetric('errors_total', 'counter', 'Total errors');
    this.registerMetric('warnings_total', 'counter', 'Total warnings');
    this.registerMetric('api_requests', 'counter', 'API requests');
    this.registerMetric('cache_hits', 'counter', 'Cache hits');
    this.registerMetric('cache_misses', 'counter', 'Cache misses');
    
    // Métricas de negocio
    this.registerMetric('user_retention', 'gauge', 'User retention rate');
    this.registerMetric('session_duration', 'histogram', 'Session duration');
    this.registerMetric('score_distribution', 'histogram', 'Score distribution');
  }

  setupDefaultThresholds() {
    this.config.alertThresholds = {
      fps: { min: 30, max: null, severity: 'warning' },
      memory_usage: { min: null, max: 500, severity: 'critical' },
      cpu_usage: { min: null, max: 80, severity: 'warning' },
      network_latency: { min: null, max: 1000, severity: 'warning' },
      errors_total: { min: null, max: 100, severity: 'critical', window: 300000 },
      ...this.config.alertThresholds
    };
  }

  registerMetric(name, type, description) {
    this.metrics.set(name, {
      name,
      type, // gauge, counter, histogram, summary
      description,
      value: type === 'counter' ? 0 : null,
      samples: [],
      lastUpdated: null
    });
    
    this.timeSeries.set(name, []);
  }

  setGauge(name, value, labels = {}) {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Metric ${name} not found`);
      return;
    }
    
    if (metric.type !== 'gauge') {
      console.warn(`Metric ${name} is not a gauge`);
      return;
    }
    
    metric.value = value;
    metric.lastUpdated = Date.now();
    
    this.addToTimeSeries(name, value, labels);
    this.checkThresholds(name, value);
    this.notifyWatchers(name, value, labels);
  }

  incrementCounter(name, amount = 1, labels = {}) {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Metric ${name} not found`);
      return;
    }
    
    if (metric.type !== 'counter') {
      console.warn(`Metric ${name} is not a counter`);
      return;
    }
    
    metric.value += amount;
    metric.lastUpdated = Date.now();
    
    this.addToTimeSeries(name, metric.value, labels);
    this.checkThresholds(name, metric.value);
    this.notifyWatchers(name, metric.value, labels);
  }

  recordHistogram(name, value, labels = {}) {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Metric ${name} not found`);
      return;
    }
    
    if (metric.type !== 'histogram') {
      console.warn(`Metric ${name} is not a histogram`);
      return;
    }
    
    metric.samples.push({
      value,
      timestamp: Date.now(),
      labels
    });
    
    // Mantener solo las últimas 1000 muestras
    if (metric.samples.length > 1000) {
      metric.samples = metric.samples.slice(-800);
    }
    
    metric.lastUpdated = Date.now();
    this.addToTimeSeries(name, value, labels);
    this.notifyWatchers(name, value, labels);
  }

  addToTimeSeries(name, value, labels = {}) {
    const series = this.timeSeries.get(name);
    if (!series) return;
    
    series.push({
      value,
      timestamp: Date.now(),
      labels
    });
    
    // Limpiar datos antiguos
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.timeSeries.set(name, series.filter(point => point.timestamp > cutoff));
  }

  checkThresholds(name, value) {
    const threshold = this.config.alertThresholds[name];
    if (!threshold) return;
    
    let shouldAlert = false;
    let alertType = '';
    
    if (threshold.min !== null && value < threshold.min) {
      shouldAlert = true;
      alertType = 'below_threshold';
    } else if (threshold.max !== null && value > threshold.max) {
      shouldAlert = true;
      alertType = 'above_threshold';
    }
    
    if (shouldAlert) {
      this.triggerAlert(name, {
        type: alertType,
        currentValue: value,
        threshold,
        severity: threshold.severity || 'warning'
      });
    }
  }

  triggerAlert(metricName, alertData) {
    const alertId = `${metricName}_${alertData.type}_${Date.now()}`;
    
    const alert = {
      id: alertId,
      metricName,
      type: alertData.type,
      severity: alertData.severity,
      currentValue: alertData.currentValue,
      threshold: alertData.threshold,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    };
    
    this.alerts.set(alertId, alert);
    this.alertQueue.push(alert);
    
    console.warn(`🚨 Alert triggered: ${metricName} - ${alertData.type}`, alert);
    
    // Notificar a watchers
    this.notifyWatchers('alert', alert);
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      console.log(`✅ Alert acknowledged: ${alertId}`);
    }
  }

  resolveAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      console.log(`✅ Alert resolved: ${alertId}`);
    }
  }

  getMetric(name) {
    return this.metrics.get(name);
  }

  getMetricValue(name) {
    const metric = this.metrics.get(name);
    return metric ? metric.value : null;
  }

  getTimeSeries(name, duration = 300000) { // 5 minutos por defecto
    const series = this.timeSeries.get(name);
    if (!series) return [];
    
    const cutoff = Date.now() - duration;
    return series.filter(point => point.timestamp > cutoff);
  }

  getHistogramStats(name) {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') return null;
    
    const values = metric.samples.map(s => s.value).sort((a, b) => a - b);
    const count = values.length;
    
    if (count === 0) return null;
    
    return {
      count,
      min: values[0],
      max: values[count - 1],
      mean: values.reduce((sum, val) => sum + val, 0) / count,
      median: values[Math.floor(count / 2)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)]
    };
  }

  getActiveAlerts() {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getAllMetrics() {
    const result = {};
    
    for (const [name, metric] of this.metrics) {
      result[name] = {
        ...metric,
        timeSeries: this.getTimeSeries(name),
        stats: metric.type === 'histogram' ? this.getHistogramStats(name) : null
      };
    }
    
    return result;
  }

  startMetricsCollection() {
    setInterval(() => {
      this.collectSystemMetrics();
      this.collectGameMetrics();
      this.collectPerformanceMetrics();
    }, 5000); // Cada 5 segundos
  }

  collectSystemMetrics() {
    // Memoria
    if (performance.memory) {
      const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
      this.setGauge('memory_usage', memoryMB);
    }
    
    // Navegador info
    if (navigator.deviceMemory) {
      this.setGauge('device_memory', navigator.deviceMemory * 1024);
    }
    
    if (navigator.hardwareConcurrency) {
      this.setGauge('cpu_cores', navigator.hardwareConcurrency);
    }
  }

  collectGameMetrics() {
    if (typeof window !== 'undefined' && window.gameState) {
      const gameState = window.gameState;
      
      // Jugadores activos
      this.setGauge('active_players', gameState.activePlayers || 1);
      
      // Nivel actual
      this.setGauge('current_level', gameState.currentLevel || 1);
      
      // Puntuación
      this.setGauge('current_score', gameState.score || 0);
      
      // Salud del jugador
      this.setGauge('player_health', gameState.player?.health || 100);
      
      // Tiempo de sesión
      const sessionTime = (Date.now() - this.startTime) / 1000;
      this.setGauge('session_duration', sessionTime);
    }
  }

  collectPerformanceMetrics() {
    // FPS (si está disponible)
    if (window.performanceStats) {
      this.setGauge('fps', window.performanceStats.fps || 0);
      this.setGauge('frame_time', window.performanceStats.frameTime || 0);
    }
    
    // Latencia de red (si está disponible)
    if (window.networkStats) {
      this.setGauge('network_latency', window.networkStats.latency || 0);
    }
  }

  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  async flush() {
    if (this.metricQueue.length === 0 && this.alertQueue.length === 0) return;
    
    const payload = {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      alerts: [...this.alertQueue],
      system: {
        uptime: Date.now() - this.startTime,
        environment: process.env.NODE_ENV || 'production',
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
    
    try {
      await this.sendToEndpoint(this.config.metricsEndpoint, payload);
      this.alertQueue = [];
      console.log('📊 Metrics flushed successfully');
    } catch (error) {
      console.error('Error flushing metrics:', error);
    }
  }

  async sendToEndpoint(endpoint, data) {
    if (endpoint === '/api/metrics') {
      // Modo desarrollo - almacenar localmente
      this.storeMetricsLocally(data);
    } else {
      // Enviar a endpoint real
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Metrics endpoint failed: ${response.status}`);
      }
    }
  }

  storeMetricsLocally(data) {
    try {
      const stored = JSON.parse(localStorage.getItem('crashworm_metrics') || '[]');
      stored.push(data);
      
      // Mantener solo las últimas 50 entradas
      if (stored.length > 50) {
        stored.splice(0, stored.length - 50);
      }
      
      localStorage.setItem('crashworm_metrics', JSON.stringify(stored));
    } catch (error) {
      console.error('Error storing metrics locally:', error);
    }
  }

  watch(metric, callback) {
    if (!this.watchers.has(metric)) {
      this.watchers.set(metric, new Set());
    }
    
    this.watchers.get(metric).add(callback);
    
    return () => {
      this.watchers.get(metric)?.delete(callback);
    };
  }

  notifyWatchers(metric, value, labels = {}) {
    const watchers = this.watchers.get(metric);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(value, labels, metric);
        } catch (error) {
          console.error('Error in metric watcher:', error);
        }
      });
    }
  }

  getSystemHealth() {
    const alerts = this.getActiveAlerts();
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');
    
    let status = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (warningAlerts.length > 0) {
      status = 'warning';
    }
    
    return {
      status,
      uptime: Date.now() - this.startTime,
      alerts: {
        total: alerts.length,
        critical: criticalAlerts.length,
        warning: warningAlerts.length
      },
      metrics: {
        fps: this.getMetricValue('fps'),
        memory: this.getMetricValue('memory_usage'),
        errors: this.getMetricValue('errors_total')
      }
    };
  }

  dispose() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.metrics.clear();
    this.alerts.clear();
    this.timeSeries.clear();
    this.watchers.clear();
    this.metricQueue = [];
    this.alertQueue = [];
  }
}

// ========================================
// STRUCTURED LOGGING SYSTEM
// ========================================

export class Logger {
  constructor(config = {}) {
    this.config = {
      level: config.level || 'info',
      enableConsole: config.enableConsole !== false,
      enableStorage: config.enableStorage !== false,
      enableRemote: config.enableRemote || false,
      remoteEndpoint: config.remoteEndpoint || '/api/logs',
      maxStorageSize: config.maxStorageSize || 1000,
      bufferSize: config.bufferSize || 100,
      flushInterval: config.flushInterval || 10000,
      ...config
    };

    this.levels = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
      fatal: 5
    };

    this.buffer = [];
    this.storage = [];
    this.flushTimer = null;
    this.context = {};
    
    this.initializeLogger();
  }

  initializeLogger() {
    this.loadStoredLogs();
    this.startPeriodicFlush();
    this.setupUnhandledErrorLogging();
    
    this.info('Logger initialized', {
      level: this.config.level,
      enableConsole: this.config.enableConsole,
      enableStorage: this.config.enableStorage,
      enableRemote: this.config.enableRemote
    });
  }

  loadStoredLogs() {
    if (!this.config.enableStorage) return;
    
    try {
      const stored = localStorage.getItem('crashworm_logs');
      if (stored) {
        this.storage = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading stored logs:', error);
    }
  }

  startPeriodicFlush() {
    if (!this.config.enableRemote) return;
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  setupUnhandledErrorLogging() {
    window.addEventListener('error', (event) => {
      this.error('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.config.level];
  }

  log(level, message, data = {}, error = null) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      data,
      context: { ...this.context },
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null,
      session: {
        id: this.getSessionId(),
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      performance: {
        memory: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
        } : null,
        timing: performance.now()
      }
    };

    this.processLogEntry(logEntry);
  }

  processLogEntry(logEntry) {
    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.logToStorage(logEntry);
    }

    // Remote logging
    if (this.config.enableRemote) {
      this.logToBuffer(logEntry);
    }
  }

  logToConsole(logEntry) {
    const consoleMethod = this.getConsoleMethod(logEntry.level);
    const prefix = `[${logEntry.timestamp}] [${logEntry.level}]`;
    
    if (logEntry.error) {
      console[consoleMethod](prefix, logEntry.message, logEntry.data, logEntry.error);
    } else {
      console[consoleMethod](prefix, logEntry.message, logEntry.data);
    }
  }

  getConsoleMethod(level) {
    const methods = {
      TRACE: 'trace',
      DEBUG: 'debug',
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
      FATAL: 'error'
    };
    return methods[level] || 'log';
  }

  logToStorage(logEntry) {
    this.storage.push(logEntry);
    
    if (this.storage.length > this.config.maxStorageSize) {
      this.storage = this.storage.slice(-Math.floor(this.config.maxStorageSize * 0.8));
    }
    
    try {
      localStorage.setItem('crashworm_logs', JSON.stringify(this.storage));
    } catch (error) {
      console.error('Error storing logs:', error);
    }
  }

  logToBuffer(logEntry) {
    this.buffer.push(logEntry);
    
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.sendLogsToRemote(logs);
    } catch (error) {
      console.error('Error sending logs to remote:', error);
      // Re-add to buffer for retry
      this.buffer.unshift(...logs);
    }
  }

  async sendLogsToRemote(logs) {
    if (this.config.remoteEndpoint === '/api/logs') {
      // Modo desarrollo - almacenar localmente
      this.storeLogsLocally(logs);
    } else {
      // Enviar a endpoint real
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logs })
      });
      
      if (!response.ok) {
        throw new Error(`Log endpoint failed: ${response.status}`);
      }
    }
  }

  storeLogsLocally(logs) {
    try {
      const stored = JSON.parse(localStorage.getItem('crashworm_remote_logs') || '[]');
      stored.push(...logs);
      
      // Mantener solo los últimos 500 logs
      if (stored.length > 500) {
        stored.splice(0, stored.length - 500);
      }
      
      localStorage.setItem('crashworm_remote_logs', JSON.stringify(stored));
    } catch (error) {
      console.error('Error storing logs locally:', error);
    }
  }

  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return this.sessionId;
  }

  // Convenience methods
  trace(message, data = {}) {
    this.log('trace', message, data);
  }

  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  info(message, data = {}) {
    this.log('info', message, data);
  }

  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  error(message, data = {}, error = null) {
    this.log('error', message, data, error);
  }

  fatal(message, data = {}, error = null) {
    this.log('fatal', message, data, error);
  }

  // Utility methods
  time(label) {
    this.debug(`Timer started: ${label}`, { timer: label, action: 'start' });
    return {
      end: () => {
        this.debug(`Timer ended: ${label}`, { timer: label, action: 'end' });
      }
    };
  }

  performance(label, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.debug(`Performance: ${label}`, {
      duration: end - start,
      label
    });
    
    return result;
  }

  getLogs(level = null, limit = 100) {
    let logs = [...this.storage];
    
    if (level) {
      logs = logs.filter(log => log.level === level.toUpperCase());
    }
    
    return logs.slice(-limit);
  }

  getLogSummary(timeRange = 3600000) { // 1 hora por defecto
    const cutoff = Date.now() - timeRange;
    const recentLogs = this.storage.filter(log => 
      new Date(log.timestamp).getTime() > cutoff
    );
    
    const summary = {
      total: recentLogs.length,
      byLevel: {},
      errorRate: 0,
      topErrors: []
    };
    
    // Contar por nivel
    recentLogs.forEach(log => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
    });
    
    // Calcular tasa de error
    const errorLogs = recentLogs.filter(log => 
      log.level === 'ERROR' || log.level === 'FATAL'
    );
    summary.errorRate = recentLogs.length > 0 ? 
      (errorLogs.length / recentLogs.length) * 100 : 0;
    
    // Top errores
    const errorMessages = {};
    errorLogs.forEach(log => {
      const key = log.message;
      errorMessages[key] = (errorMessages[key] || 0) + 1;
    });
    
    summary.topErrors = Object.entries(errorMessages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
    
    return summary;
  }

  clearLogs() {
    this.storage = [];
    this.buffer = [];
    
    if (this.config.enableStorage) {
      localStorage.removeItem('crashworm_logs');
    }
  }

  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.config.level = level;
      this.info(`Log level changed to: ${level}`);
    }
  }

  dispose() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush final
    if (this.buffer.length > 0) {
      this.flush();
    }
    
    this.clearLogs();
  }
}

// ========================================
// ALERT SYSTEM
// ========================================

export class AlertSystem {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      channels: config.channels || ['console', 'ui', 'storage'],
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      alertHistory: config.alertHistory || 100,
      ...config
    };

    this.alerts = new Map();
    this.history = [];
    this.channels = new Map();
    this.rules = new Map();
    this.subscribers = new Map();
    
    this.initializeAlertSystem();
  }

  initializeAlertSystem() {
    this.setupDefaultChannels();
    this.setupDefaultRules();
    this.loadAlertHistory();
    
    console.log('🚨 Alert System inicializado');
  }

  setupDefaultChannels() {
    // Canal de consola
    this.registerChannel('console', {
      send: (alert) => {
        const severity = alert.severity.toUpperCase();
        const prefix = `[${alert.timestamp}] [${severity}]`;
        
        if (severity === 'CRITICAL' || severity === 'ERROR') {
          console.error(prefix, alert.message, alert.data);
        } else if (severity === 'WARNING') {
          console.warn(prefix, alert.message, alert.data);
        } else {
          console.log(prefix, alert.message, alert.data);
        }
      }
    });

    // Canal de UI
    this.registerChannel('ui', {
      send: (alert) => {
        this.showUIAlert(alert);
      }
    });

    // Canal de almacenamiento
    this.registerChannel('storage', {
      send: (alert) => {
        this.storeAlert(alert);
      }
    });

    // Canal de email (simulado)
    this.registerChannel('email', {
      send: (alert) => {
        console.log('📧 Email alert sent:', alert.message);
      }
    });
  }

  setupDefaultRules() {
    this.addRule('performance', {
      condition: (alert) => alert.category === 'performance',
      channels: ['console', 'ui'],
      throttle: 30000, // 30 segundos
      severity: 'warning'
    });

    this.addRule('security', {
      condition: (alert) => alert.category === 'security',
      channels: ['console', 'ui', 'storage'],
      throttle: 0, // Sin throttle para seguridad
      severity: 'critical'
    });

    this.addRule('error', {
      condition: (alert) => alert.severity === 'error' || alert.severity === 'critical',
      channels: ['console', 'ui', 'storage'],
      throttle: 5000, // 5 segundos
      severity: 'error'
    });
  }

  registerChannel(name, channel) {
    this.channels.set(name, {
      name,
      send: channel.send,
      enabled: true,
      lastSent: 0,
      errorCount: 0
    });
  }

  addRule(name, rule) {
    this.rules.set(name, {
      name,
      condition: rule.condition,
      channels: rule.channels || ['console'],
      throttle: rule.throttle || 0,
      severity: rule.severity || 'info',
      lastTriggered: 0
    });
  }

  alert(message, data = {}, options = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message,
      data,
      severity: options.severity || 'info',
      category: options.category || 'general',
      source: options.source || 'unknown',
      acknowledged: false,
      resolved: false,
      ...options
    };

    this.processAlert(alert);
    return alert.id;
  }

  processAlert(alert) {
    // Almacenar alert
    this.alerts.set(alert.id, alert);
    this.history.push(alert);
    
    // Limitar historial
    if (this.history.length > this.config.alertHistory) {
      this.history = this.history.slice(-this.config.alertHistory);
    }

    // Aplicar reglas
    this.applyRules(alert);
    
    // Notificar subscribers
    this.notifySubscribers(alert);
  }

  applyRules(alert) {
    for (const [ruleName, rule] of this.rules) {
      if (rule.condition(alert)) {
        const now = Date.now();
        
        // Verificar throttle
        if (rule.throttle > 0 && (now - rule.lastTriggered) < rule.throttle) {
          continue;
        }
        
        rule.lastTriggered = now;
        
        // Enviar a canales
        this.sendToChannels(alert, rule.channels);
      }
    }
  }

  sendToChannels(alert, channelNames) {
    channelNames.forEach(channelName => {
      const channel = this.channels.get(channelName);
      if (channel && channel.enabled) {
        this.sendToChannel(alert, channel);
      }
    });
  }

  async sendToChannel(alert, channel) {
    try {
      await channel.send(alert);
      channel.lastSent = Date.now();
      channel.errorCount = 0;
    } catch (error) {
      channel.errorCount++;
      console.error(`Error sending alert to channel ${channel.name}:`, error);
      
      // Desactivar canal si hay demasiados errores
      if (channel.errorCount >= this.config.retryAttempts) {
        channel.enabled = false;
        console.warn(`Channel ${channel.name} disabled due to repeated errors`);
      }
    }
  }

  showUIAlert(alert) {
    // Crear notificación visual
    const notification = document.createElement('div');
    notification.className = `alert alert-${alert.severity}`;
    notification.innerHTML = `
      <div class="alert-content">
        <div class="alert-header">
          <span class="alert-severity">${alert.severity.toUpperCase()}</span>
          <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="alert-message">${alert.message}</div>
        <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // Estilos inline para la notificación
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: ${this.getAlertColor(alert.severity)};
      color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      margin-bottom: 10px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  getAlertColor(severity) {
    const colors = {
      info: '#3498db',
      warning: '#f39c12',
      error: '#e74c3c',
      critical: '#c0392b'
    };
    return colors[severity] || colors.info;
  }

  storeAlert(alert) {
    try {
      const stored = JSON.parse(localStorage.getItem('crashworm_alerts') || '[]');
      stored.push(alert);
      
      // Mantener solo las últimas 200 alertas
      if (stored.length > 200) {
        stored.splice(0, stored.length - 200);
      }
      
      localStorage.setItem('crashworm_alerts', JSON.stringify(stored));
    } catch (error) {
      console.error('Error storing alert:', error);
    }
  }

  loadAlertHistory() {
    try {
      const stored = localStorage.getItem('crashworm_alerts');
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading alert history:', error);
    }
  }

  // Métodos de conveniencia
  info(message, data = {}) {
    return this.alert(message, data, { severity: 'info' });
  }

  warning(message, data = {}) {
    return this.alert(message, data, { severity: 'warning' });
  }

  error(message, data = {}) {
    return this.alert(message, data, { severity: 'error' });
  }

  critical(message, data = {}) {
    return this.alert(message, data, { severity: 'critical' });
  }

  acknowledge(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      this.notifySubscribers(alert, 'acknowledged');
    }
  }

  resolve(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.notifySubscribers(alert, 'resolved');
    }
  }

  getAlert(alertId) {
    return this.alerts.get(alertId);
  }

  getActiveAlerts() {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getAlertHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  getAlertStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentAlerts = this.history.filter(alert => 
      new Date(alert.timestamp).getTime() > (now - oneHour)
    );
    
    const stats = {
      total: this.history.length,
      recent: recentAlerts.length,
      active: this.getActiveAlerts().length,
      bySeverity: {},
      byCategory: {}
    };
    
    recentAlerts.forEach(alert => {
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;
    });
    
    return stats;
  }

  subscribe(callback) {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscribers.set(id, callback);
    
    return () => {
      this.subscribers.delete(id);
    };
  }

  notifySubscribers(alert, action = 'created') {
    this.subscribers.forEach(callback => {
      try {
        callback(alert, action);
      } catch (error) {
        console.error('Error in alert subscriber:', error);
      }
    });
  }

  clearHistory() {
    this.history = [];
    localStorage.removeItem('crashworm_alerts');
  }

  dispose() {
    this.alerts.clear();
    this.subscribers.clear();
    this.clearHistory();
  }
}

// ========================================
// EXPORTACIONES
// ========================================

export { MonitoringSystem, Logger, AlertSystem };

// Inicializar sistemas globales en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.monitoringSystem = new MonitoringSystem();
  window.logger = new Logger();
  window.alertSystem = new AlertSystem();
}