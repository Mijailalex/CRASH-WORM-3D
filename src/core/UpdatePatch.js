// ========================================
// SISTEMA DE ACTUALIZACIONES Y PARCHES
// Update Manager, Patch System, Version Control
// ========================================

import { Logger } from './MonitoringSystem';

// ========================================
// UPDATE MANAGER
// ========================================

export class UpdateManager {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      updateCheckInterval: config.updateCheckInterval || 300000, // 5 minutos
      updateEndpoint: config.updateEndpoint || '/api/updates',
      autoUpdate: config.autoUpdate || false,
      forceUpdateThreshold: config.forceUpdateThreshold || 3, // Versiones
      downloadTimeout: config.downloadTimeout || 30000,
      ...config
    };

    this.currentVersion = this.getCurrentVersion();
    this.updateHistory = [];
    this.pendingUpdates = new Map();
    this.updateCheckTimer = null;
    this.downloadCache = new Map();
    this.logger = new Logger({ context: 'UpdateManager' });
    
    this.initializeUpdateManager();
  }

  initializeUpdateManager() {
    this.loadUpdateHistory();
    this.setupServiceWorker();
    this.startUpdateChecking();
    
    this.logger.info('Update Manager inicializado', {
      currentVersion: this.currentVersion,
      autoUpdate: this.config.autoUpdate
    });
  }

  getCurrentVersion() {
    return window.BUILD_INFO?.version || '1.0.0';
  }

  loadUpdateHistory() {
    try {
      const stored = localStorage.getItem('crashworm_update_history');
      if (stored) {
        this.updateHistory = JSON.parse(stored);
      }
    } catch (error) {
      this.logger.error('Error loading update history', {}, error);
    }
  }

  saveUpdateHistory() {
    try {
      localStorage.setItem('crashworm_update_history', JSON.stringify(this.updateHistory));
    } catch (error) {
      this.logger.error('Error saving update history', {}, error);
    }
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          this.logger.info('Service Worker registrado', {
            scope: registration.scope
          });
          
          // Escuchar actualizaciones del service worker
          registration.addEventListener('updatefound', () => {
            this.handleServiceWorkerUpdate(registration);
          });
        })
        .catch(error => {
          this.logger.error('Error registrando Service Worker', {}, error);
        });
    }
  }

  handleServiceWorkerUpdate(registration) {
    const newWorker = registration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // Nueva versión disponible
          this.notifyUpdateAvailable('service-worker', {
            type: 'service-worker',
            version: 'latest',
            description: 'Nueva versión del juego disponible'
          });
        }
      }
    });
  }

  startUpdateChecking() {
    if (!this.config.enabled) return;
    
    // Verificar inmediatamente
    this.checkForUpdates();
    
    // Verificar periódicamente
    this.updateCheckTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.config.updateCheckInterval);
  }

  async checkForUpdates() {
    try {
      this.logger.debug('Verificando actualizaciones...');
      
      const response = await fetch(this.config.updateEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Current-Version': this.currentVersion
        }
      });

      if (!response.ok) {
        throw new Error(`Update check failed: ${response.status}`);
      }

      const updateInfo = await response.json();
      this.processUpdateInfo(updateInfo);
      
    } catch (error) {
      this.logger.error('Error checking for updates', {}, error);
      
      // Fallback a verificación mock en desarrollo
      if (process.env.NODE_ENV === 'development') {
        this.simulateUpdateCheck();
      }
    }
  }

  simulateUpdateCheck() {
    // Simular diferentes tipos de actualizaciones
    const updateTypes = [
      {
        type: 'patch',
        version: '1.0.1',
        size: 5.2, // MB
        description: 'Corrección de bugs menores',
        critical: false,
        changes: [
          'Corregido problema con salto doble',
          'Mejorado rendimiento en nivel 3',
          'Corregidos errores de audio'
        ]
      },
      {
        type: 'minor',
        version: '1.1.0',
        size: 25.8,
        description: 'Nuevas características y mejoras',
        critical: false,
        changes: [
          'Nuevo bioma: Mundo Cyberpunk',
          'Sistema de logros mejorado',
          'Nuevos power-ups disponibles',
          'Mejoras en la IA de enemigos'
        ]
      },
      {
        type: 'major',
        version: '2.0.0',
        size: 150.5,
        description: 'Actualización mayor con nuevas funcionalidades',
        critical: true,
        changes: [
          'Modo multijugador cooperativo',
          'Editor de niveles integrado',
          'Nuevo motor de física',
          'Soporte para VR'
        ]
      }
    ];

    // Seleccionar aleatoriamente si hay actualización
    if (Math.random() > 0.7) {
      const randomUpdate = updateTypes[Math.floor(Math.random() * updateTypes.length)];
      this.processUpdateInfo({
        available: true,
        updates: [randomUpdate]
      });
    } else {
      this.processUpdateInfo({ available: false });
    }
  }

  processUpdateInfo(updateInfo) {
    if (!updateInfo.available) {
      this.logger.debug('No hay actualizaciones disponibles');
      return;
    }

    for (const update of updateInfo.updates) {
      const updateId = `${update.type}_${update.version}`;
      
      if (!this.pendingUpdates.has(updateId)) {
        this.pendingUpdates.set(updateId, {
          ...update,
          id: updateId,
          discoveredAt: Date.now(),
          status: 'available'
        });
        
        this.logger.info('Nueva actualización disponible', {
          type: update.type,
          version: update.version,
          size: update.size,
          critical: update.critical
        });
        
        this.notifyUpdateAvailable(updateId, update);
        
        // Auto-actualizar si está habilitado y no es crítica
        if (this.config.autoUpdate && !update.critical) {
          this.scheduleUpdate(updateId);
        }
      }
    }
  }

  notifyUpdateAvailable(updateId, update) {
    // Notificar a través del sistema de alertas
    if (window.alertSystem) {
      const severity = update.critical ? 'critical' : 'info';
      window.alertSystem.alert(
        `Actualización disponible: ${update.version}`,
        {
          updateId,
          type: update.type,
          size: update.size,
          description: update.description
        },
        {
          severity,
          category: 'update',
          source: 'UpdateManager'
        }
      );
    }
    
    // Mostrar notificación visual
    this.showUpdateNotification(update);
    
    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('updateAvailable', {
      detail: { updateId, update }
    }));
  }

  showUpdateNotification(update) {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-notification-content">
        <div class="update-header">
          <h3>🔄 Actualización Disponible</h3>
          <span class="update-version">${update.version}</span>
        </div>
        <p class="update-description">${update.description}</p>
        <div class="update-details">
          <span class="update-size">Tamaño: ${update.size}MB</span>
          <span class="update-type">${update.type.toUpperCase()}</span>
        </div>
        <div class="update-actions">
          <button class="update-btn update-now" onclick="window.updateManager.installUpdate('${update.id}')">
            Actualizar Ahora
          </button>
          <button class="update-btn update-later" onclick="window.updateManager.postponeUpdate('${update.id}')">
            Más Tarde
          </button>
          ${!update.critical ? '<button class="update-btn update-skip" onclick="window.updateManager.skipUpdate(\'' + update.id + '\')">Omitir</button>' : ''}
        </div>
      </div>
    `;
    
    // Estilos
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 10001;
      min-width: 400px;
      max-width: 500px;
      font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    // Exponer método para cerrar
    window.updateManager = this;
  }

  async installUpdate(updateId) {
    const update = this.pendingUpdates.get(updateId);
    if (!update) {
      this.logger.error('Update not found', { updateId });
      return;
    }

    try {
      this.logger.info('Iniciando instalación de actualización', {
        updateId,
        version: update.version
      });
      
      update.status = 'downloading';
      await this.downloadUpdate(update);
      
      update.status = 'installing';
      await this.applyUpdate(update);
      
      update.status = 'completed';
      this.recordUpdateHistory(update);
      
      this.logger.info('Actualización instalada exitosamente', {
        updateId,
        version: update.version
      });
      
      // Cerrar notificación
      this.closeUpdateNotification();
      
      // Mostrar mensaje de éxito
      this.showUpdateSuccess(update);
      
    } catch (error) {
      update.status = 'failed';
      this.logger.error('Error installing update', { updateId }, error);
      this.showUpdateError(update, error);
    }
  }

  async downloadUpdate(update) {
    this.logger.info('Descargando actualización...', {
      version: update.version,
      size: update.size
    });
    
    // Simular descarga con progress
    const totalSize = update.size * 1024 * 1024; // Convert to bytes
    let downloaded = 0;
    
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const increment = Math.random() * 0.1 * totalSize;
        downloaded += increment;
        
        const progress = Math.min(downloaded / totalSize, 1);
        this.updateDownloadProgress(update.id, progress);
        
        if (progress >= 1) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      
      // Timeout
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Download timeout'));
      }, this.config.downloadTimeout);
    });
  }

  updateDownloadProgress(updateId, progress) {
    const percentage = Math.round(progress * 100);
    this.logger.debug(`Download progress: ${percentage}%`, { updateId });
    
    // Actualizar UI si existe
    const notification = document.querySelector('.update-notification');
    if (notification) {
      let progressBar = notification.querySelector('.progress-bar');
      if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = `
          <div class="progress-fill" style="width: 0%; background: #4CAF50; height: 20px; transition: width 0.3s;"></div>
          <span class="progress-text">Descargando... 0%</span>
        `;
        notification.appendChild(progressBar);
      }
      
      const fill = progressBar.querySelector('.progress-fill');
      const text = progressBar.querySelector('.progress-text');
      
      fill.style.width = percentage + '%';
      text.textContent = `Descargando... ${percentage}%`;
    }
  }

  async applyUpdate(update) {
    this.logger.info('Aplicando actualización...', { version: update.version });
    
    // Simular aplicación de actualización
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // En una aplicación real, aquí se aplicarían los cambios
    // Por ahora, simulamos la aplicación
    
    // Actualizar versión actual
    this.currentVersion = update.version;
    
    // Actualizar BUILD_INFO si existe
    if (window.BUILD_INFO) {
      window.BUILD_INFO.version = update.version;
      window.BUILD_INFO.timestamp = Date.now();
    }
  }

  recordUpdateHistory(update) {
    const historyEntry = {
      id: update.id,
      version: update.version,
      type: update.type,
      installedAt: Date.now(),
      size: update.size,
      description: update.description,
      changes: update.changes || [],
      success: update.status === 'completed'
    };
    
    this.updateHistory.push(historyEntry);
    this.saveUpdateHistory();
    
    // Limpiar update pendiente
    this.pendingUpdates.delete(update.id);
  }

  postponeUpdate(updateId) {
    const update = this.pendingUpdates.get(updateId);
    if (update) {
      update.postponedUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
      this.logger.info('Actualización pospuesta', { updateId, version: update.version });
    }
    
    this.closeUpdateNotification();
  }

  skipUpdate(updateId) {
    const update = this.pendingUpdates.get(updateId);
    if (update && !update.critical) {
      this.pendingUpdates.delete(updateId);
      this.logger.info('Actualización omitida', { updateId, version: update.version });
    }
    
    this.closeUpdateNotification();
  }

  scheduleUpdate(updateId) {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;
    
    // Programar para instalar en el próximo reinicio del juego
    update.scheduled = true;
    this.logger.info('Actualización programada', { updateId, version: update.version });
  }

  closeUpdateNotification() {
    const notification = document.querySelector('.update-notification');
    if (notification) {
      notification.remove();
    }
  }

  showUpdateSuccess(update) {
    const notification = document.createElement('div');
    notification.className = 'update-success';
    notification.innerHTML = `
      <div class="success-content">
        <h3>✅ Actualización Completada</h3>
        <p>El juego se ha actualizado a la versión ${update.version}</p>
        <button onclick="this.parentElement.parentElement.remove()">OK</button>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #4CAF50;
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 10001;
      text-align: center;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  showUpdateError(update, error) {
    const notification = document.createElement('div');
    notification.className = 'update-error';
    notification.innerHTML = `
      <div class="error-content">
        <h3>❌ Error en Actualización</h3>
        <p>No se pudo instalar la actualización ${update.version}</p>
        <p class="error-message">${error.message}</p>
        <button onclick="this.parentElement.parentElement.remove()">OK</button>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f44336;
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 10001;
      text-align: center;
    `;
    
    document.body.appendChild(notification);
  }

  // Métodos públicos
  getPendingUpdates() {
    return Array.from(this.pendingUpdates.values());
  }

  getUpdateHistory() {
    return [...this.updateHistory];
  }

  getCurrentVersion() {
    return this.currentVersion;
  }

  getUpdateStats() {
    const history = this.getUpdateHistory();
    const pending = this.getPendingUpdates();
    
    return {
      currentVersion: this.currentVersion,
      totalUpdates: history.length,
      pendingUpdates: pending.length,
      lastUpdate: history[history.length - 1]?.installedAt || null,
      criticalUpdates: pending.filter(u => u.critical).length,
      autoUpdateEnabled: this.config.autoUpdate
    };
  }

  dispose() {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
    }
    
    this.pendingUpdates.clear();
    this.downloadCache.clear();
  }
}

// ========================================
// PATCH SYSTEM
// ========================================

export class PatchSystem {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      patchEndpoint: config.patchEndpoint || '/api/patches',
      hotPatchEnabled: config.hotPatchEnabled !== false,
      maxPatchSize: config.maxPatchSize || 10 * 1024 * 1024, // 10MB
      ...config
    };

    this.appliedPatches = new Map();
    this.patchQueue = [];
    this.patchHistory = [];
    this.logger = new Logger({ context: 'PatchSystem' });
    
    this.initializePatchSystem();
  }

  initializePatchSystem() {
    this.loadPatchHistory();
    this.setupHotPatchListener();
    
    this.logger.info('Patch System inicializado', {
      hotPatchEnabled: this.config.hotPatchEnabled
    });
  }

  loadPatchHistory() {
    try {
      const stored = localStorage.getItem('crashworm_patch_history');
      if (stored) {
        this.patchHistory = JSON.parse(stored);
        
        // Reconstruir mapa de patches aplicados
        this.patchHistory.forEach(patch => {
          if (patch.applied) {
            this.appliedPatches.set(patch.id, patch);
          }
        });
      }
    } catch (error) {
      this.logger.error('Error loading patch history', {}, error);
    }
  }

  savePatchHistory() {
    try {
      localStorage.setItem('crashworm_patch_history', JSON.stringify(this.patchHistory));
    } catch (error) {
      this.logger.error('Error saving patch history', {}, error);
    }
  }

  setupHotPatchListener() {
    if (!this.config.hotPatchEnabled) return;
    
    // Escuchar mensajes de patches en tiempo real
    if (typeof WebSocket !== 'undefined') {
      this.setupWebSocketListener();
    }
    
    // Escuchar eventos de server-sent events
    if (typeof EventSource !== 'undefined') {
      this.setupEventSourceListener();
    }
  }

  setupWebSocketListener() {
    // En una aplicación real, esto se conectaría a un WebSocket
    // Para esta demo, simular recepción de patches
    this.logger.debug('WebSocket patch listener configurado');
  }

  setupEventSourceListener() {
    // En una aplicación real, esto usaría Server-Sent Events
    this.logger.debug('EventSource patch listener configurado');
  }

  async applyPatch(patchData) {
    const patch = {
      id: patchData.id || this.generatePatchId(),
      version: patchData.version,
      type: patchData.type, // 'hotfix', 'feature', 'security'
      target: patchData.target, // 'client', 'server', 'both'
      priority: patchData.priority || 'normal', // 'low', 'normal', 'high', 'critical'
      size: patchData.size || 0,
      checksum: patchData.checksum,
      code: patchData.code,
      description: patchData.description,
      receivedAt: Date.now(),
      applied: false,
      rollbackData: null
    };

    try {
      this.logger.info('Aplicando patch', {
        id: patch.id,
        type: patch.type,
        priority: patch.priority
      });
      
      // Validar patch
      this.validatePatch(patch);
      
      // Crear backup para rollback
      patch.rollbackData = await this.createRollbackData(patch);
      
      // Aplicar patch
      await this.executePatch(patch);
      
      // Marcar como aplicado
      patch.applied = true;
      patch.appliedAt = Date.now();
      
      this.appliedPatches.set(patch.id, patch);
      this.patchHistory.push(patch);
      this.savePatchHistory();
      
      this.logger.info('Patch aplicado exitosamente', {
        id: patch.id,
        version: patch.version
      });
      
      // Notificar éxito
      this.notifyPatchSuccess(patch);
      
      return patch;
      
    } catch (error) {
      patch.applied = false;
      patch.error = error.message;
      patch.failedAt = Date.now();
      
      this.patchHistory.push(patch);
      this.savePatchHistory();
      
      this.logger.error('Error applying patch', {
        id: patch.id,
        error: error.message
      }, error);
      
      this.notifyPatchError(patch, error);
      throw error;
    }
  }

  validatePatch(patch) {
    // Validar tamaño
    if (patch.size > this.config.maxPatchSize) {
      throw new Error(`Patch size ${patch.size} exceeds maximum ${this.config.maxPatchSize}`);
    }
    
    // Validar checksum
    if (patch.checksum && !this.validateChecksum(patch)) {
      throw new Error('Patch checksum validation failed');
    }
    
    // Validar que no esté ya aplicado
    if (this.appliedPatches.has(patch.id)) {
      throw new Error(`Patch ${patch.id} already applied`);
    }
    
    // Validar código del patch
    if (patch.code && !this.validatePatchCode(patch.code)) {
      throw new Error('Patch code validation failed');
    }
  }

  validateChecksum(patch) {
    // En una aplicación real, esto validaría el checksum del patch
    // Para esta demo, asumir que es válido
    return true;
  }

  validatePatchCode(code) {
    // Validar que el código del patch sea seguro
    const dangerousPatterns = [
      /eval\(/,
      /Function\(/,
      /document\.write/,
      /innerHTML\s*=/,
      /outerHTML\s*=/,
      /execScript/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(code));
  }

  async createRollbackData(patch) {
    // Crear datos de rollback específicos para el tipo de patch
    const rollbackData = {
      type: patch.type,
      timestamp: Date.now(),
      affectedFiles: [],
      originalValues: {}
    };
    
    switch (patch.type) {
      case 'config':
        rollbackData.originalValues = this.getCurrentConfig();
        break;
      case 'code':
        rollbackData.originalValues = this.getCurrentCodeState();
        break;
      case 'asset':
        rollbackData.affectedFiles = this.getAffectedAssets(patch);
        break;
    }
    
    return rollbackData;
  }

  getCurrentConfig() {
    // Obtener configuración actual para rollback
    return {
      gameConfig: window.gameConfig || {},
      buildInfo: window.BUILD_INFO || {}
    };
  }

  getCurrentCodeState() {
    // Obtener estado actual del código para rollback
    return {
      functions: this.getOverriddenFunctions(),
      modules: this.getLoadedModules()
    };
  }

  getOverriddenFunctions() {
    // Obtener funciones que pueden ser overridden por patches
    return {};
  }

  getLoadedModules() {
    // Obtener módulos cargados
    return [];
  }

  getAffectedAssets(patch) {
    // Obtener assets afectados por el patch
    return patch.affectedFiles || [];
  }

  async executePatch(patch) {
    this.logger.debug('Ejecutando patch', { id: patch.id, type: patch.type });
    
    switch (patch.type) {
      case 'hotfix':
        await this.applyHotfix(patch);
        break;
      case 'feature':
        await this.applyFeaturePatch(patch);
        break;
      case 'security':
        await this.applySecurityPatch(patch);
        break;
      case 'config':
        await this.applyConfigPatch(patch);
        break;
      case 'asset':
        await this.applyAssetPatch(patch);
        break;
      default:
        throw new Error(`Unknown patch type: ${patch.type}`);
    }
  }

  async applyHotfix(patch) {
    // Aplicar hotfix (generalmente cambios de código pequeños)
    if (patch.code) {
      try {
        // Ejecutar código del patch en un contexto seguro
        const patchFunction = new Function('game', 'window', 'console', patch.code);
        patchFunction(window.gameInstance, window, console);
      } catch (error) {
        throw new Error(`Hotfix execution failed: ${error.message}`);
      }
    }
  }

  async applyFeaturePatch(patch) {
    // Aplicar patch de feature (nuevas funcionalidades)
    this.logger.info('Aplicando feature patch', { id: patch.id });
    
    // Simular aplicación de feature
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async applySecurityPatch(patch) {
    // Aplicar patch de seguridad (alta prioridad)
    this.logger.info('Aplicando security patch', { id: patch.id });
    
    // Los patches de seguridad tienen prioridad máxima
    if (patch.code) {
      try {
        const patchFunction = new Function('security', 'config', patch.code);
        patchFunction(window.securityManager, window.gameConfig);
      } catch (error) {
        throw new Error(`Security patch execution failed: ${error.message}`);
      }
    }
  }

  async applyConfigPatch(patch) {
    // Aplicar patch de configuración
    if (patch.configChanges) {
      this.applyConfigChanges(patch.configChanges);
    }
  }

  async applyAssetPatch(patch) {
    // Aplicar patch de assets
    if (patch.assets) {
      await this.updateAssets(patch.assets);
    }
  }

  applyConfigChanges(changes) {
    // Aplicar cambios de configuración
    for (const [path, value] of Object.entries(changes)) {
      this.setConfigValue(path, value);
    }
  }

  setConfigValue(path, value) {
    // Establecer valor de configuración usando path notation
    const keys = path.split('.');
    let current = window.gameConfig || {};
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  async updateAssets(assets) {
    // Actualizar assets
    for (const asset of assets) {
      await this.updateAsset(asset);
    }
  }

  async updateAsset(asset) {
    // Actualizar un asset específico
    this.logger.debug('Actualizando asset', { path: asset.path });
    
    // En una aplicación real, esto descargaría y reemplazaría assets
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async rollbackPatch(patchId) {
    const patch = this.appliedPatches.get(patchId);
    if (!patch) {
      throw new Error(`Patch ${patchId} not found or not applied`);
    }
    
    if (!patch.rollbackData) {
      throw new Error(`No rollback data available for patch ${patchId}`);
    }
    
    try {
      this.logger.info('Realizando rollback de patch', { id: patchId });
      
      await this.executeRollback(patch);
      
      // Marcar como revertido
      patch.applied = false;
      patch.rolledBackAt = Date.now();
      
      this.appliedPatches.delete(patchId);
      this.savePatchHistory();
      
      this.logger.info('Rollback completado', { id: patchId });
      
    } catch (error) {
      this.logger.error('Error during rollback', { id: patchId }, error);
      throw error;
    }
  }

  async executeRollback(patch) {
    const rollbackData = patch.rollbackData;
    
    switch (patch.type) {
      case 'config':
        this.restoreConfig(rollbackData.originalValues);
        break;
      case 'code':
        this.restoreCode(rollbackData.originalValues);
        break;
      case 'asset':
        await this.restoreAssets(rollbackData.affectedFiles);
        break;
    }
  }

  restoreConfig(originalConfig) {
    // Restaurar configuración original
    if (originalConfig.gameConfig) {
      window.gameConfig = originalConfig.gameConfig;
    }
    if (originalConfig.buildInfo) {
      window.BUILD_INFO = originalConfig.buildInfo;
    }
  }

  restoreCode(originalCode) {
    // Restaurar código original
    // En una aplicación real, esto restauraría funciones overridden
    this.logger.debug('Restoring original code');
  }

  async restoreAssets(affectedFiles) {
    // Restaurar assets originales
    for (const file of affectedFiles) {
      await this.restoreAsset(file);
    }
  }

  async restoreAsset(file) {
    // Restaurar un asset específico
    this.logger.debug('Restaurando asset', { path: file.path });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  generatePatchId() {
    return `patch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  notifyPatchSuccess(patch) {
    if (window.alertSystem) {
      window.alertSystem.info(
        `Patch aplicado: ${patch.id}`,
        {
          type: patch.type,
          version: patch.version,
          description: patch.description
        }
      );
    }
  }

  notifyPatchError(patch, error) {
    if (window.alertSystem) {
      window.alertSystem.error(
        `Error aplicando patch: ${patch.id}`,
        {
          type: patch.type,
          error: error.message
        }
      );
    }
  }

  // Métodos públicos
  getAppliedPatches() {
    return Array.from(this.appliedPatches.values());
  }

  getPatchHistory() {
    return [...this.patchHistory];
  }

  getPatchStats() {
    const applied = this.getAppliedPatches();
    const history = this.getPatchHistory();
    
    return {
      totalPatches: history.length,
      appliedPatches: applied.length,
      failedPatches: history.filter(p => !p.applied).length,
      patchesByType: this.groupPatchesByType(history),
      lastPatch: history[history.length - 1] || null
    };
  }

  groupPatchesByType(patches) {
    const grouped = {};
    patches.forEach(patch => {
      grouped[patch.type] = (grouped[patch.type] || 0) + 1;
    });
    return grouped;
  }

  dispose() {
    this.appliedPatches.clear();
    this.patchQueue = [];
  }
}

// ========================================
// VERSION CONTROL SYSTEM
// ========================================

export class VersionControl {
  constructor(config = {}) {
    this.config = {
      trackChanges: config.trackChanges !== false,
      maxVersionHistory: config.maxVersionHistory || 50,
      compareEndpoint: config.compareEndpoint || '/api/versions',
      ...config
    };

    this.versionHistory = [];
    this.currentVersion = this.getCurrentVersion();
    this.changeLog = [];
    this.logger = new Logger({ context: 'VersionControl' });
    
    this.initializeVersionControl();
  }

  initializeVersionControl() {
    this.loadVersionHistory();
    this.trackCurrentVersion();
    
    this.logger.info('Version Control inicializado', {
      currentVersion: this.currentVersion,
      historyEntries: this.versionHistory.length
    });
  }

  getCurrentVersion() {
    return window.BUILD_INFO?.version || '1.0.0';
  }

  loadVersionHistory() {
    try {
      const stored = localStorage.getItem('crashworm_version_history');
      if (stored) {
        this.versionHistory = JSON.parse(stored);
      }
    } catch (error) {
      this.logger.error('Error loading version history', {}, error);
    }
  }

  saveVersionHistory() {
    try {
      localStorage.setItem('crashworm_version_history', JSON.stringify(this.versionHistory));
    } catch (error) {
      this.logger.error('Error saving version history', {}, error);
    }
  }

  trackCurrentVersion() {
    const versionInfo = {
      version: this.currentVersion,
      timestamp: Date.now(),
      buildInfo: window.BUILD_INFO || {},
      environment: process.env.NODE_ENV || 'production',
      features: this.getEnabledFeatures(),
      patches: this.getAppliedPatches(),
      configuration: this.getRelevantConfig()
    };
    
    this.versionHistory.push(versionInfo);
    
    // Limitar historial
    if (this.versionHistory.length > this.config.maxVersionHistory) {
      this.versionHistory = this.versionHistory.slice(-this.config.maxVersionHistory);
    }
    
    this.saveVersionHistory();
  }

  getEnabledFeatures() {
    // Obtener features habilitadas
    return {
      multiplayer: window.gameConfig?.network?.enabled || false,
      analytics: window.gameConfig?.analytics?.enabled || false,
      devTools: window.gameConfig?.development?.devTools || false,
      antiCheat: window.gameConfig?.security?.antiCheat || false
    };
  }

  getAppliedPatches() {
    // Obtener patches aplicados
    if (window.patchSystem) {
      return window.patchSystem.getAppliedPatches().map(p => ({
        id: p.id,
        version: p.version,
        type: p.type,
        appliedAt: p.appliedAt
      }));
    }
    return [];
  }

  getRelevantConfig() {
    // Obtener configuración relevante para el versionado
    return {
      graphics: window.gameConfig?.graphics?.quality || 'auto',
      audio: window.gameConfig?.audio?.enabled || true,
      language: navigator.language || 'en'
    };
  }

  compareVersions(version1, version2) {
    // Comparar dos versiones
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  getVersionDiff(fromVersion, toVersion) {
    // Obtener diferencias entre versiones
    const fromInfo = this.versionHistory.find(v => v.version === fromVersion);
    const toInfo = this.versionHistory.find(v => v.version === toVersion);
    
    if (!fromInfo || !toInfo) {
      return null;
    }
    
    return {
      version: {
        from: fromVersion,
        to: toVersion,
        type: this.getVersionChangeType(fromVersion, toVersion)
      },
      features: this.getFeatureDiff(fromInfo.features, toInfo.features),
      patches: this.getPatchDiff(fromInfo.patches, toInfo.patches),
      configuration: this.getConfigDiff(fromInfo.configuration, toInfo.configuration)
    };
  }

  getVersionChangeType(from, to) {
    const fromParts = from.split('.').map(Number);
    const toParts = to.split('.').map(Number);
    
    if (fromParts[0] !== toParts[0]) return 'major';
    if (fromParts[1] !== toParts[1]) return 'minor';
    if (fromParts[2] !== toParts[2]) return 'patch';
    
    return 'build';
  }

  getFeatureDiff(fromFeatures, toFeatures) {
    const diff = {
      added: [],
      removed: [],
      changed: []
    };
    
    for (const [feature, toValue] of Object.entries(toFeatures)) {
      const fromValue = fromFeatures[feature];
      
      if (fromValue === undefined) {
        diff.added.push(feature);
      } else if (fromValue !== toValue) {
        diff.changed.push({ feature, from: fromValue, to: toValue });
      }
    }
    
    for (const feature of Object.keys(fromFeatures)) {
      if (!(feature in toFeatures)) {
        diff.removed.push(feature);
      }
    }
    
    return diff;
  }

  getPatchDiff(fromPatches, toPatches) {
    const fromIds = new Set(fromPatches.map(p => p.id));
    const toIds = new Set(toPatches.map(p => p.id));
    
    return {
      added: toPatches.filter(p => !fromIds.has(p.id)),
      removed: fromPatches.filter(p => !toIds.has(p.id))
    };
  }

  getConfigDiff(fromConfig, toConfig) {
    const diff = {};
    
    for (const [key, toValue] of Object.entries(toConfig)) {
      const fromValue = fromConfig[key];
      if (fromValue !== toValue) {
        diff[key] = { from: fromValue, to: toValue };
      }
    }
    
    return diff;
  }

  getVersionHistory() {
    return [...this.versionHistory];
  }

  getVersionStats() {
    const history = this.getVersionHistory();
    const versions = history.map(v => v.version);
    const uniqueVersions = [...new Set(versions)];
    
    return {
      currentVersion: this.currentVersion,
      totalVersions: uniqueVersions.length,
      totalEntries: history.length,
      firstVersion: history[0]?.version || null,
      lastUpdate: history[history.length - 1]?.timestamp || null,
      versionTypes: this.getVersionTypeStats(uniqueVersions)
    };
  }

  getVersionTypeStats(versions) {
    const stats = {
      major: 0,
      minor: 0,
      patch: 0
    };
    
    for (let i = 1; i < versions.length; i++) {
      const type = this.getVersionChangeType(versions[i-1], versions[i]);
      stats[type] = (stats[type] || 0) + 1;
    }
    
    return stats;
  }

  dispose() {
    this.saveVersionHistory();
  }
}

// ========================================
// EXPORTACIONES
// ========================================

export { UpdateManager, PatchSystem, VersionControl };

// Inicializar sistemas globalmente en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.updateManager = new UpdateManager();
  window.patchSystem = new PatchSystem();
  window.versionControl = new VersionControl();
}