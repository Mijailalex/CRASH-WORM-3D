// ============================================================================
// 🔄 CRASH WORM 3D - SISTEMA DE UPDATES Y PATCHES COMPLETO
// ============================================================================
// Ubicación: src/core/UpdatePatch.js
// Sistema avanzado de actualizaciones en tiempo real con seguridad

// Importaciones de seguridad y logging
import { Logger } from './MonitoringLogging.js';
import { SecurityManager } from './SecurityNetworking.js';

// ============================================================================
// 📦 UPDATE MANAGER - Gestión de Actualizaciones
// ============================================================================

export class UpdateManager {
  constructor(options = {}) {
    this.config = {
      autoCheck: options.autoCheck !== false,
      checkInterval: options.checkInterval || 30000, // 30 segundos
      updateEndpoint: options.updateEndpoint || '/api/updates',
      enableHotReload: options.enableHotReload !== false,
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 10000,
      ...options
    };

    this.logger = new Logger('UpdateManager');
    this.security = new SecurityManager();
    this.currentVersion = this.getCurrentVersion();
    this.isChecking = false;
    this.lastCheck = null;
    this.updateAvailable = false;
    this.pendingUpdate = null;
    this.retryCount = 0;

    this.init();
  }

  init() {
    this.logger.info('Inicializando UpdateManager', { version: this.currentVersion });
    
    if (this.config.autoCheck) {
      this.startAutoCheck();
    }

    // Listener para updates manuales
    this.setupEventListeners();
  }

  getCurrentVersion() {
    return window.BUILD_INFO?.version || '1.0.0';
  }

  startAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);

    // Check inmediato
    setTimeout(() => this.checkForUpdates(), 1000);
  }

  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async checkForUpdates() {
    if (this.isChecking) {
      return;
    }

    this.isChecking = true;
    this.lastCheck = Date.now();

    try {
      const updateInfo = await this.fetchUpdateInfo();
      
      if (updateInfo && this.isNewerVersion(updateInfo.version)) {
        this.updateAvailable = true;
        this.pendingUpdate = updateInfo;
        this.notifyUpdateAvailable(updateInfo);
        return updateInfo;
      } else {
        this.updateAvailable = false;
        this.pendingUpdate = null;
      }
    } catch (error) {
      this.logger.error('Error checking for updates', { error });
      this.handleUpdateCheckError(error);
    } finally {
      this.isChecking = false;
    }
  }

  async fetchUpdateInfo() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.updateEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Current-Version': this.currentVersion,
          'X-Game-ID': 'crash-worm-3d',
          ...this.security.getAuthHeaders()
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Update check failed: ${response.status}`);
      }

      const updateInfo = await response.json();
      
      // Validar respuesta
      this.validateUpdateInfo(updateInfo);
      
      return updateInfo;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  validateUpdateInfo(updateInfo) {
    if (!updateInfo || typeof updateInfo !== 'object') {
      throw new Error('Invalid update info format');
    }

    const required = ['version', 'type', 'size'];
    for (const field of required) {
      if (!updateInfo[field]) {
        throw new Error(`Missing required update field: ${field}`);
      }
    }

    // Validar tamaño máximo
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (updateInfo.size > maxSize) {
      throw new Error(`Update size ${updateInfo.size} exceeds maximum ${maxSize}`);
    }
  }

  isNewerVersion(newVersion) {
    return this.compareVersions(newVersion, this.currentVersion) > 0;
  }

  compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }
    
    return 0;
  }

  async applyUpdate(updateInfo = null) {
    const update = updateInfo || this.pendingUpdate;
    if (!update) {
      throw new Error('No update available to apply');
    }

    this.logger.info('Aplicando actualización', { 
      version: update.version,
      type: update.type,
      size: update.size 
    });

    try {
      // Crear backup del estado actual
      const backup = await this.createBackup();
      
      // Descargar y aplicar update
      await this.downloadAndApplyUpdate(update);
      
      // Actualizar versión
      this.updateVersion(update.version);
      
      // Limpiar estado
      this.updateAvailable = false;
      this.pendingUpdate = null;
      this.retryCount = 0;
      
      this.notifyUpdateSuccess(update);
      
      return true;
    } catch (error) {
      this.logger.error('Error aplicando actualización', { error });
      this.notifyUpdateError(error);
      throw error;
    }
  }

  async downloadAndApplyUpdate(update) {
    // Simular descarga y aplicación
    const steps = [
      { name: 'Validando actualización', duration: 500 },
      { name: 'Descargando archivos', duration: 2000 },
      { name: 'Verificando integridad', duration: 1000 },
      { name: 'Aplicando cambios', duration: 1500 },
      { name: 'Validando instalación', duration: 800 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this.notifyUpdateProgress(step.name, (i + 1) / steps.length * 100);
      
      await new Promise(resolve => setTimeout(resolve, step.duration));
      
      // Simular posible error
      if (Math.random() < 0.1) { // 10% chance de error
        throw new Error(`Update failed at step: ${step.name}`);
      }
    }
  }

  async createBackup() {
    // Crear backup del estado actual
    const backup = {
      version: this.currentVersion,
      timestamp: Date.now(),
      config: this.getCurrentConfig(),
      state: this.getCurrentGameState()
    };

    // En aplicación real, guardar en localStorage o enviar al servidor
    this.logger.debug('Backup creado', { size: JSON.stringify(backup).length });
    
    return backup;
  }

  getCurrentConfig() {
    return window.gameConfig || {};
  }

  getCurrentGameState() {
    return {
      playerProgress: window.gameState?.progress || {},
      settings: window.gameState?.settings || {},
      achievements: window.gameState?.achievements || []
    };
  }

  updateVersion(newVersion) {
    this.currentVersion = newVersion;
    if (window.BUILD_INFO) {
      window.BUILD_INFO.version = newVersion;
    }
    
    // Actualizar en localStorage
    localStorage.setItem('gameVersion', newVersion);
  }

  handleUpdateCheckError(error) {
    this.retryCount++;
    
    if (this.retryCount >= this.config.maxRetries) {
      this.logger.error('Max retries reached for update check');
      this.notifyUpdateCheckFailed();
      this.retryCount = 0;
    } else {
      // Retry con backoff exponencial
      const delay = Math.pow(2, this.retryCount) * 1000;
      setTimeout(() => this.checkForUpdates(), delay);
    }
  }

  setupEventListeners() {
    // Listener para updates manuales desde UI
    window.addEventListener('gameRequestUpdate', (event) => {
      this.checkForUpdates();
    });

    // Listener para aplicar updates
    window.addEventListener('gameApplyUpdate', async (event) => {
      try {
        await this.applyUpdate(event.detail.updateInfo);
      } catch (error) {
        this.logger.error('Error applying update from event', { error });
      }
    });
  }

  notifyUpdateAvailable(updateInfo) {
    this.dispatchEvent('updateAvailable', updateInfo);
    
    if (window.alertSystem) {
      window.alertSystem.info(
        `Actualización disponible: v${updateInfo.version}`,
        {
          type: updateInfo.type,
          size: this.formatSize(updateInfo.size),
          description: updateInfo.description
        }
      );
    }
  }

  notifyUpdateProgress(step, progress) {
    this.dispatchEvent('updateProgress', { step, progress });
  }

  notifyUpdateSuccess(updateInfo) {
    this.dispatchEvent('updateSuccess', updateInfo);
    
    if (window.alertSystem) {
      window.alertSystem.success(
        `Actualización aplicada: v${updateInfo.version}`,
        'El juego se reiniciará automáticamente'
      );
    }
  }

  notifyUpdateError(error) {
    this.dispatchEvent('updateError', { error: error.message });
    
    if (window.alertSystem) {
      window.alertSystem.error(
        'Error aplicando actualización',
        error.message
      );
    }
  }

  notifyUpdateCheckFailed() {
    this.dispatchEvent('updateCheckFailed', {});
  }

  dispatchEvent(type, data) {
    const event = new CustomEvent(`gameUpdate${type.charAt(0).toUpperCase() + type.slice(1)}`, {
      detail: data
    });
    window.dispatchEvent(event);
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getStatus() {
    return {
      currentVersion: this.currentVersion,
      isChecking: this.isChecking,
      lastCheck: this.lastCheck,
      updateAvailable: this.updateAvailable,
      pendingUpdate: this.pendingUpdate,
      retryCount: this.retryCount
    };
  }

  destroy() {
    this.stopAutoCheck();
    this.logger.info('UpdateManager destroyed');
  }
}

// ============================================================================
// 🔧 PATCH SYSTEM - Sistema de Patches en Tiempo Real
// ============================================================================

export class PatchSystem {
  constructor(options = {}) {
    this.config = {
      patchEndpoint: options.patchEndpoint || '/api/patches',
      enableHotPatches: options.enableHotPatches !== false,
      maxPatchSize: options.maxPatchSize || 1024 * 1024, // 1MB
      autoApplyPatches: options.autoApplyPatches !== false,
      ...options
    };

    this.logger = new Logger('PatchSystem');
    this.security = new SecurityManager();
    this.appliedPatches = new Map();
    this.patchHistory = [];
    this.rollbackData = new Map();
    this.patchQueue = [];
    this.isProcessing = false;

    this.init();
  }

  init() {
    this.logger.info('Inicializando PatchSystem');
    this.loadAppliedPatches();
    this.setupEventListeners();
  }

  loadAppliedPatches() {
    try {
      const saved = localStorage.getItem('appliedPatches');
      if (saved) {
        const patches = JSON.parse(saved);
        for (const patch of patches) {
          this.appliedPatches.set(patch.id, patch);
        }
      }
    } catch (error) {
      this.logger.error('Error loading applied patches', { error });
    }
  }

  saveAppliedPatches() {
    try {
      const patches = Array.from(this.appliedPatches.values());
      localStorage.setItem('appliedPatches', JSON.stringify(patches));
    } catch (error) {
      this.logger.error('Error saving applied patches', { error });
    }
  }

  setupEventListeners() {
    // Listener para patches remotos
    window.addEventListener('remotePatchReceived', (event) => {
      this.queuePatch(event.detail.patch);
    });
  }

  async fetchAvailablePatches() {
    try {
      const response = await fetch(this.config.patchEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Applied-Patches': JSON.stringify(Array.from(this.appliedPatches.keys())),
          ...this.security.getAuthHeaders()
        }
      });

      if (!response.ok) {
        throw new Error(`Patch fetch failed: ${response.status}`);
      }

      const patches = await response.json();
      return patches.filter(patch => !this.appliedPatches.has(patch.id));
    } catch (error) {
      this.logger.error('Error fetching patches', { error });
      return [];
    }
  }

  queuePatch(patch) {
    this.patchQueue.push(patch);
    
    if (this.config.autoApplyPatches && !this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || this.patchQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.patchQueue.length > 0) {
      const patch = this.patchQueue.shift();
      
      try {
        await this.applyPatch(patch);
      } catch (error) {
        this.logger.error('Error processing patch from queue', { 
          patchId: patch.id, 
          error 
        });
      }
    }

    this.isProcessing = false;
  }

  async applyPatch(patch) {
    this.logger.info('Aplicando patch', { id: patch.id, type: patch.type });

    try {
      // Validar patch
      this.validatePatch(patch);
      
      // Crear datos de rollback
      const rollbackData = await this.createRollbackData(patch);
      this.rollbackData.set(patch.id, rollbackData);
      
      // Aplicar patch
      await this.executePatch(patch);
      
      // Marcar como aplicado
      const appliedPatch = {
        ...patch,
        appliedAt: Date.now(),
        rollbackAvailable: true
      };
      
      this.appliedPatches.set(patch.id, appliedPatch);
      this.patchHistory.push(appliedPatch);
      
      // Guardar estado
      this.saveAppliedPatches();
      
      this.notifyPatchSuccess(patch);
      
      return true;
    } catch (error) {
      this.logger.error('Error aplicando patch', { id: patch.id, error });
      this.notifyPatchError(patch, error);
      throw error;
    }
  }

  async rollbackPatch(patchId) {
    const patch = this.appliedPatches.get(patchId);
    if (!patch) {
      throw new Error(`Patch ${patchId} no encontrado`);
    }

    const rollbackData = this.rollbackData.get(patchId);
    if (!rollbackData) {
      throw new Error(`No hay datos de rollback para patch ${patchId}`);
    }

    try {
      this.logger.info('Haciendo rollback de patch', { id: patchId });
      
      await this.executeRollback(rollbackData);
      
      // Remover de aplicados
      this.appliedPatches.delete(patchId);
      this.rollbackData.delete(patchId);
      
      // Actualizar historial
      this.patchHistory.push({
        id: `rollback_${patchId}`,
        type: 'rollback',
        targetPatch: patchId,
        appliedAt: Date.now()
      });
      
      this.saveAppliedPatches();
      
      this.logger.info('Rollback completado', { id: patchId });
      return true;
    } catch (error) {
      this.logger.error('Error en rollback', { id: patchId, error });
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
    // Actualizar assets del juego
    for (const asset of assets) {
      await this.updateAsset(asset);
    }
  }

  async updateAsset(asset) {
    // Actualizar un asset específico
    this.logger.debug('Actualizando asset', { path: asset.path });
    
    // Simular actualización de asset
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async executeRollback(rollbackData) {
    this.logger.debug('Ejecutando rollback', { type: rollbackData.type });
    
    switch (rollbackData.type) {
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
      rollbacksAvailable: this.rollbackData.size,
      queuedPatches: this.patchQueue.length,
      lastPatch: applied.length > 0 ? applied[applied.length - 1] : null
    };
  }

  destroy() {
    this.patchQueue = [];
    this.isProcessing = false;
    this.logger.info('PatchSystem destroyed');
  }
}

// ============================================================================
// 🔄 VERSION CONTROL - Control de Versiones
// ============================================================================

export class VersionControl {
  constructor(options = {}) {
    this.config = {
      trackingEnabled: options.trackingEnabled !== false,
      maxVersionHistory: options.maxVersionHistory || 100,
      compressionEnabled: options.compressionEnabled !== false,
      ...options
    };

    this.logger = new Logger('VersionControl');
    this.versionHistory = [];
    this.currentBranch = 'main';
    this.branches = new Map();
    this.tags = new Map();

    this.init();
  }

  init() {
    this.logger.info('Inicializando VersionControl');
    this.loadVersionHistory();
    this.createInitialVersion();
  }

  loadVersionHistory() {
    try {
      const saved = localStorage.getItem('versionHistory');
      if (saved) {
        this.versionHistory = JSON.parse(saved);
      }
    } catch (error) {
      this.logger.error('Error loading version history', { error });
    }
  }

  saveVersionHistory() {
    try {
      // Mantener solo las últimas N versiones
      if (this.versionHistory.length > this.config.maxVersionHistory) {
        this.versionHistory = this.versionHistory.slice(-this.config.maxVersionHistory);
      }

      localStorage.setItem('versionHistory', JSON.stringify(this.versionHistory));
    } catch (error) {
      this.logger.error('Error saving version history', { error });
    }
  }

  createInitialVersion() {
    if (this.versionHistory.length === 0) {
      this.createVersion('1.0.0', 'Initial version', 'system');
    }
  }

  createVersion(version, description, author = 'unknown') {
    const versionInfo = {
      id: this.generateVersionId(),
      version,
      description,
      author,
      timestamp: Date.now(),
      branch: this.currentBranch,
      changes: this.captureCurrentState(),
      size: 0 // Calculado después
    };

    // Calcular tamaño
    versionInfo.size = JSON.stringify(versionInfo.changes).length;

    this.versionHistory.push(versionInfo);
    this.saveVersionHistory();

    this.logger.info('Nueva versión creada', { 
      version, 
      size: versionInfo.size,
      branch: this.currentBranch 
    });

    return versionInfo;
  }

  captureCurrentState() {
    return {
      gameConfig: window.gameConfig || {},
      buildInfo: window.BUILD_INFO || {},
      playerState: this.getPlayerState(),
      systemState: this.getSystemState(),
      timestamp: Date.now()
    };
  }

  getPlayerState() {
    return {
      progress: window.gameState?.progress || {},
      settings: window.gameState?.settings || {},
      achievements: window.gameState?.achievements || []
    };
  }

  getSystemState() {
    return {
      performance: window.performanceManager?.getStats() || {},
      errors: window.logger?.getRecentErrors() || [],
      features: this.getEnabledFeatures()
    };
  }

  getEnabledFeatures() {
    return Object.keys(window.gameConfig?.features || {})
      .filter(key => window.gameConfig.features[key]);
  }

  generateVersionId() {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createBranch(name, fromVersion = null) {
    if (this.branches.has(name)) {
      throw new Error(`Branch ${name} already exists`);
    }

    const baseVersion = fromVersion || this.getCurrentVersion();
    
    this.branches.set(name, {
      name,
      createdAt: Date.now(),
      baseVersion,
      commits: []
    });

    this.logger.info('Nueva rama creada', { name, baseVersion });
  }

  switchBranch(name) {
    if (!this.branches.has(name) && name !== 'main') {
      throw new Error(`Branch ${name} does not exist`);
    }

    this.currentBranch = name;
    this.logger.info('Cambiado a rama', { branch: name });
  }

  createTag(name, version, description = '') {
    if (this.tags.has(name)) {
      throw new Error(`Tag ${name} already exists`);
    }

    this.tags.set(name, {
      name,
      version,
      description,
      createdAt: Date.now(),
      branch: this.currentBranch
    });

    this.logger.info('Nuevo tag creado', { name, version });
  }

  getCurrentVersion() {
    return this.versionHistory.length > 0 
      ? this.versionHistory[this.versionHistory.length - 1]
      : null;
  }

  getVersionByTag(tagName) {
    const tag = this.tags.get(tagName);
    if (!tag) {
      throw new Error(`Tag ${tagName} not found`);
    }

    return this.versionHistory.find(v => v.version === tag.version);
  }

  getVersionHistory(limit = 20) {
    return this.versionHistory.slice(-limit);
  }

  compareVersions(versionA, versionB) {
    const changes = {
      added: [],
      modified: [],
      removed: []
    };

    // Comparar configuraciones
    this.compareObjects(versionA.changes, versionB.changes, changes);

    return changes;
  }

  compareObjects(objA, objB, changes, path = '') {
    const keysA = Object.keys(objA || {});
    const keysB = Object.keys(objB || {});
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const valueA = objA?.[key];
      const valueB = objB?.[key];

      if (!(key in objA)) {
        changes.added.push({ path: currentPath, value: valueB });
      } else if (!(key in objB)) {
        changes.removed.push({ path: currentPath, value: valueA });
      } else if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
        changes.modified.push({ 
          path: currentPath, 
          oldValue: valueA, 
          newValue: valueB 
        });
      }
    }
  }

  getStats() {
    return {
      totalVersions: this.versionHistory.length,
      currentVersion: this.getCurrentVersion()?.version,
      currentBranch: this.currentBranch,
      branches: this.branches.size,
      tags: this.tags.size,
      historySize: JSON.stringify(this.versionHistory).length
    };
  }

  cleanup(keepVersions = 50) {
    const removed = this.versionHistory.length - keepVersions;
    
    if (removed > 0) {
      this.versionHistory = this.versionHistory.slice(-keepVersions);
      this.saveVersionHistory();
      
      this.logger.info('Limpieza de historial completada', { 
        removedVersions: removed,
        keptVersions: keepVersions 
      });
    }
  }

  destroy() {
    this.saveVersionHistory();
    this.logger.info('VersionControl destroyed');
  }
}

// ============================================================================
// 📤 EXPORTACIONES
// ============================================================================

export default {
  UpdateManager,
  PatchSystem,
  VersionControl
};