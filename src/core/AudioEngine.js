// ========================================
// MOTOR DE AUDIO ESPACIAL AVANZADO
// Sistema de audio 3D con efectos procedurales
// ========================================

import * as Tone from 'tone';
import { BaseSystem } from './GameEngine.js';

export class AudioEngine extends BaseSystem {
  constructor(config = {}) {
    super('audio', 5);
    
    this.config = {
      masterVolume: config.masterVolume || 0.8,
      musicVolume: config.musicVolume || 0.6,
      sfxVolume: config.sfxVolume || 0.7,
      enable3D: config.enable3D !== false,
      enableReverb: config.enableReverb !== false,
      enableDynamicMusic: config.enableDynamicMusic !== false,
      listenerPosition: config.listenerPosition || { x: 0, y: 0, z: 0 },
      maxDistance: config.maxDistance || 1000,
      rolloffFactor: config.rolloffFactor || 1,
      ...config
    };

    // Contexto de audio
    this.audioContext = null;
    this.isInitialized = false;
    this.isEnabled = true;
    
    // Gestión de sonidos
    this.sounds = new Map();
    this.activeSources = new Map();
    this.audioBuffers = new Map();
    this.spatialSources = new Map();
    
    // Sistema de música procedural
    this.musicSystem = {
      currentTrack: null,
      crossfadeTime: 2000,
      layers: new Map(),
      intensity: 0.5,
      tempo: 120,
      isPlaying: false
    };
    
    // Efectos y procesamiento
    this.effects = {
      masterGain: null,
      musicGain: null,
      sfxGain: null,
      reverb: null,
      compressor: null,
      eq: null,
      spatialProcessor: null
    };
    
    // Listener 3D
    this.listener = {
      position: { x: 0, y: 0, z: 0 },
      orientation: { forward: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } },
      velocity: { x: 0, y: 0, z: 0 }
    };
    
    // Métricas
    this.metrics = {
      activeSounds: 0,
      spatialSounds: 0,
      memoryUsage: 0,
      processingTime: 0
    };

    this.init();
  }

  async init() {
    try {
      await this.initializeAudioContext();
      this.setupEffectChain();
      this.setupSpatialAudio();
      this.setupProceduralMusic();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('🎵 Motor de audio inicializado');
    } catch (error) {
      console.error('❌ Error inicializando motor de audio:', error);
      this.isEnabled = false;
    }
  }

  async initializeAudioContext() {
    // Inicializar Tone.js
    await Tone.start();
    this.audioContext = Tone.context;
    
    // Configurar destino principal
    Tone.Destination.volume.value = Tone.gainToDb(this.config.masterVolume);
    
    console.log('🎧 Contexto de audio creado');
  }

  setupEffectChain() {
    // Gain nodes principales
    this.effects.masterGain = new Tone.Gain(this.config.masterVolume);
    this.effects.musicGain = new Tone.Gain(this.config.musicVolume);
    this.effects.sfxGain = new Tone.Gain(this.config.sfxVolume);
    
    // Compresor maestro
    this.effects.compressor = new Tone.Compressor(-30, 3);
    
    // EQ de 3 bandas
    this.effects.eq = {
      low: new Tone.Filter(200, 'lowpass'),
      mid: new Tone.Filter(2000, 'bandpass'),
      high: new Tone.Filter(5000, 'highpass')
    };
    
    // Reverb ambiental
    if (this.config.enableReverb) {
      this.effects.reverb = new Tone.Reverb({
        decay: 2.0,
        preDelay: 0.01,
        wet: 0.3
      });
    }
    
    // Conectar cadena de efectos
    this.effects.masterGain.connect(this.effects.compressor);
    
    if (this.effects.reverb) {
      this.effects.compressor.connect(this.effects.reverb);
      this.effects.reverb.toDestination();
    } else {
      this.effects.compressor.toDestination();
    }
    
    // Conectar buses
    this.effects.musicGain.connect(this.effects.masterGain);
    this.effects.sfxGain.connect(this.effects.masterGain);
  }

  setupSpatialAudio() {
    if (!this.config.enable3D) return;
    
    // Crear procesador espacial personalizado
    this.effects.spatialProcessor = {
      panners: new Map(),
      
      createPanner: (sourceId) => {
        const panner = new Tone.Panner3D({
          positionX: 0,
          positionY: 0,
          positionZ: 0,
          orientationX: 0,
          orientationY: 0,
          orientationZ: -1,
          refDistance: 1,
          maxDistance: this.config.maxDistance,
          rolloffFactor: this.config.rolloffFactor,
          coneInnerAngle: 360,
          coneOuterAngle: 0,
          coneOuterGain: 0
        });
        
        this.effects.spatialProcessor.panners.set(sourceId, panner);
        return panner;
      },
      
      updateListener: (position, orientation) => {
        // Actualizar posición del listener
        Tone.Listener.positionX.value = position.x;
        Tone.Listener.positionY.value = position.y;
        Tone.Listener.positionZ.value = position.z;
        
        // Actualizar orientación
        Tone.Listener.forwardX.value = orientation.forward.x;
        Tone.Listener.forwardY.value = orientation.forward.y;
        Tone.Listener.forwardZ.value = orientation.forward.z;
        Tone.Listener.upX.value = orientation.up.x;
        Tone.Listener.upY.value = orientation.up.y;
        Tone.Listener.upZ.value = orientation.up.z;
      }
    };
    
    console.log('🌐 Audio espacial configurado');
  }

  setupProceduralMusic() {
    if (!this.config.enableDynamicMusic) return;
    
    // Sistema de música procedural por capas
    this.musicSystem.layers = new Map([
      ['ambient', {
        synth: new Tone.FMSynth({
          harmonicity: 3,
          modulationIndex: 10,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.2, decay: 0.1, sustain: 0.8, release: 0.2 },
          modulation: { type: 'square' },
          modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
        }),
        pattern: null,
        volume: new Tone.Gain(0.3),
        active: false
      }],
      
      ['rhythm', {
        synth: new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 10,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }),
        pattern: null,
        volume: new Tone.Gain(0.4),
        active: false
      }],
      
      ['melody', {
        synth: new Tone.PolySynth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
        }),
        pattern: null,
        volume: new Tone.Gain(0.5),
        active: false
      }],
      
      ['bass', {
        synth: new Tone.MonoSynth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.1, decay: 0.3, sustain: 0.9, release: 0.4 },
          filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 2 }
        }),
        pattern: null,
        volume: new Tone.Gain(0.6),
        active: false
      }]
    ]);
    
    // Conectar capas al bus de música
    for (const [name, layer] of this.musicSystem.layers) {
      layer.synth.connect(layer.volume);
      layer.volume.connect(this.effects.musicGain);
    }
    
    console.log('🎹 Sistema de música procedural configurado');
  }

  setupEventListeners() {
    // Manejar visibilidad de la página
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  // ========================================
  // GESTIÓN DE SONIDOS
  // ========================================

  async loadSound(soundId, url, config = {}) {
    try {
      const player = new Tone.Player({
        url: url,
        autostart: false,
        loop: config.loop || false,
        volume: config.volume || 0
      });
      
      await Tone.loaded();
      
      const sound = {
        id: soundId,
        player,
        config: {
          volume: config.volume || 1.0,
          loop: config.loop || false,
          pitch: config.pitch || 1.0,
          spatial: config.spatial || false,
          category: config.category || 'sfx', // 'sfx', 'music', 'voice'
          priority: config.priority || 1,
          ...config
        },
        isLoaded: true
      };
      
      // Conectar a bus apropiado
      if (sound.config.category === 'music') {
        player.connect(this.effects.musicGain);
      } else {
        player.connect(this.effects.sfxGain);
      }
      
      this.sounds.set(soundId, sound);
      console.log(`🎵 Sonido '${soundId}' cargado`);
      
      return sound;
    } catch (error) {
      console.error(`❌ Error cargando sonido '${soundId}':`, error);
      return null;
    }
  }

  playSound(soundId, config = {}) {
    if (!this.isEnabled || !this.isInitialized) return null;
    
    const sound = this.sounds.get(soundId);
    if (!sound || !sound.isLoaded) {
      console.warn(`⚠️ Sonido '${soundId}' no encontrado o no cargado`);
      return null;
    }
    
    try {
      const sourceId = `${soundId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear nueva instancia del player
      const player = sound.player.clone();
      
      // Configurar parámetros
      const volume = (config.volume !== undefined ? config.volume : sound.config.volume) * 
                    (sound.config.category === 'music' ? this.config.musicVolume : this.config.sfxVolume);
      
      player.volume.value = Tone.gainToDb(Math.max(0.001, volume));
      
      if (config.pitch || sound.config.pitch !== 1.0) {
        player.playbackRate = config.pitch || sound.config.pitch;
      }
      
      // Configurar espacialización
      if (config.spatial || sound.config.spatial) {
        this.setupSpatialSound(sourceId, player, config);
      } else {
        // Conectar directamente al bus apropiado
        if (sound.config.category === 'music') {
          player.connect(this.effects.musicGain);
        } else {
          player.connect(this.effects.sfxGain);
        }
      }
      
      // Reproducir
      player.start(config.delay || 0, config.offset || 0, config.duration);
      
      // Gestionar finalización
      player.onstop = () => {
        this.cleanupSource(sourceId);
      };
      
      // Registrar fuente activa
      this.activeSources.set(sourceId, {
        player,
        soundId,
        config: { ...sound.config, ...config },
        startTime: Tone.now()
      });
      
      this.metrics.activeSounds++;
      
      return sourceId;
    } catch (error) {
      console.error(`❌ Error reproduciendo sonido '${soundId}':`, error);
      return null;
    }
  }

  setupSpatialSound(sourceId, player, config) {
    if (!this.config.enable3D || !this.effects.spatialProcessor) return;
    
    const panner = this.effects.spatialProcessor.createPanner(sourceId);
    
    // Configurar posición
    if (config.position) {
      panner.positionX.value = config.position.x;
      panner.positionY.value = config.position.y;
      panner.positionZ.value = config.position.z;
    }
    
    // Configurar propiedades espaciales
    if (config.refDistance) panner.refDistance = config.refDistance;
    if (config.maxDistance) panner.maxDistance = config.maxDistance;
    if (config.rolloffFactor) panner.rolloffFactor = config.rolloffFactor;
    
    // Conectar cadena de audio
    player.connect(panner);
    panner.connect(this.effects.sfxGain);
    
    this.spatialSources.set(sourceId, {
      panner,
      config
    });
    
    this.metrics.spatialSounds++;
  }

  stopSound(sourceId) {
    const source = this.activeSources.get(sourceId);
    if (source) {
      source.player.stop();
      this.cleanupSource(sourceId);
      return true;
    }
    return false;
  }

  pauseSound(sourceId) {
    const source = this.activeSources.get(sourceId);
    if (source && source.player.state === 'started') {
      source.player.pause();
      return true;
    }
    return false;
  }

  resumeSound(sourceId) {
    const source = this.activeSources.get(sourceId);
    if (source && source.player.state === 'paused') {
      source.player.resume();
      return true;
    }
    return false;
  }

  setSoundVolume(sourceId, volume) {
    const source = this.activeSources.get(sourceId);
    if (source) {
      source.player.volume.value = Tone.gainToDb(Math.max(0.001, volume));
      return true;
    }
    return false;
  }

  updateSpatialSound(sourceId, position, velocity = null) {
    const spatialSource = this.spatialSources.get(sourceId);
    if (spatialSource) {
      const panner = spatialSource.panner;
      
      // Actualizar posición
      panner.positionX.value = position.x;
      panner.positionY.value = position.y;
      panner.positionZ.value = position.z;
      
      // Actualizar velocidad (efecto Doppler)
      if (velocity) {
        // Implementar efecto Doppler básico
        const listenerPos = this.listener.position;
        const distance = Math.sqrt(
          Math.pow(position.x - listenerPos.x, 2) +
          Math.pow(position.y - listenerPos.y, 2) +
          Math.pow(position.z - listenerPos.z, 2)
        );
        
        const source = this.activeSources.get(sourceId);
        if (source && distance > 0) {
          const relativeVelocity = this.calculateDopplerEffect(position, velocity, listenerPos, this.listener.velocity);
          const dopplerFactor = 1 + (relativeVelocity / 343); // 343 m/s = velocidad del sonido
          source.player.playbackRate = Math.max(0.5, Math.min(2.0, dopplerFactor));
        }
      }
      
      return true;
    }
    return false;
  }

  calculateDopplerEffect(sourcePos, sourceVel, listenerPos, listenerVel) {
    // Calcular vector de diferencia
    const dx = sourcePos.x - listenerPos.x;
    const dy = sourcePos.y - listenerPos.y;
    const dz = sourcePos.z - listenerPos.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance === 0) return 0;
    
    // Normalizar vector
    const nx = dx / distance;
    const ny = dy / distance;
    const nz = dz / distance;
    
    // Calcular velocidades relativas
    const sourceVelRadial = sourceVel.x * nx + sourceVel.y * ny + sourceVel.z * nz;
    const listenerVelRadial = listenerVel.x * nx + listenerVel.y * ny + listenerVel.z * nz;
    
    return listenerVelRadial - sourceVelRadial;
  }

  cleanupSource(sourceId) {
    const source = this.activeSources.get(sourceId);
    if (source) {
      try {
        source.player.dispose();
      } catch (error) {
        console.warn('⚠️ Error limpiando source:', error);
      }
      
      this.activeSources.delete(sourceId);
      this.metrics.activeSounds--;
    }
    
    const spatialSource = this.spatialSources.get(sourceId);
    if (spatialSource) {
      try {
        spatialSource.panner.dispose();
      } catch (error) {
        console.warn('⚠️ Error limpiando spatial source:', error);
      }
      
      this.spatialSources.delete(sourceId);
      this.metrics.spatialSounds--;
    }
  }

  // ========================================
  // SISTEMA DE MÚSICA PROCEDURAL
  // ========================================

  startProceduralMusic(intensity = 0.5, tempo = 120) {
    if (!this.config.enableDynamicMusic || this.musicSystem.isPlaying) return;
    
    this.musicSystem.intensity = Math.max(0, Math.min(1, intensity));
    this.musicSystem.tempo = tempo;
    
    // Configurar transporte
    Tone.Transport.bpm.value = tempo;
    
    // Activar capas según intensidad
    this.updateMusicLayers();
    
    // Iniciar transporte
    Tone.Transport.start();
    this.musicSystem.isPlaying = true;
    
    console.log(`🎹 Música procedural iniciada - Intensidad: ${intensity}, Tempo: ${tempo}`);
  }

  stopProceduralMusic(fadeTime = 2000) {
    if (!this.musicSystem.isPlaying) return;
    
    // Fadeout gradual
    for (const [name, layer] of this.musicSystem.layers) {
      if (layer.active) {
        layer.volume.volume.rampTo(Tone.gainToDb(0.001), fadeTime / 1000);
      }
    }
    
    // Detener después del fade
    setTimeout(() => {
      Tone.Transport.stop();
      this.musicSystem.isPlaying = false;
      
      // Resetear volúmenes
      for (const [name, layer] of this.musicSystem.layers) {
        layer.active = false;
        if (layer.pattern) {
          layer.pattern.stop();
        }
      }
    }, fadeTime);
    
    console.log('🎹 Música procedural detenida');
  }

  updateMusicIntensity(intensity, fadeTime = 1000) {
    if (!this.musicSystem.isPlaying) return;
    
    this.musicSystem.intensity = Math.max(0, Math.min(1, intensity));
    this.updateMusicLayers(fadeTime);
  }

  updateMusicLayers(fadeTime = 1000) {
    const intensity = this.musicSystem.intensity;
    
    // Configurar qué capas están activas según intensidad
    const layerConfig = [
      { name: 'ambient', minIntensity: 0.0, maxVolume: 0.3 },
      { name: 'bass', minIntensity: 0.2, maxVolume: 0.4 },
      { name: 'rhythm', minIntensity: 0.4, maxVolume: 0.5 },
      { name: 'melody', minIntensity: 0.6, maxVolume: 0.6 }
    ];
    
    for (const config of layerConfig) {
      const layer = this.musicSystem.layers.get(config.name);
      if (!layer) continue;
      
      const shouldBeActive = intensity >= config.minIntensity;
      const targetVolume = shouldBeActive ? 
        Math.min(config.maxVolume, (intensity - config.minIntensity) / (1 - config.minIntensity) * config.maxVolume) : 
        0;
      
      if (shouldBeActive && !layer.active) {
        this.activateMusicLayer(config.name);
      } else if (!shouldBeActive && layer.active) {
        this.deactivateMusicLayer(config.name, fadeTime);
      }
      
      // Ajustar volumen
      if (layer.active) {
        layer.volume.volume.rampTo(Tone.gainToDb(Math.max(0.001, targetVolume)), fadeTime / 1000);
      }
    }
  }

  activateMusicLayer(layerName) {
    const layer = this.musicSystem.layers.get(layerName);
    if (!layer || layer.active) return;
    
    layer.active = true;
    
    // Crear patrones específicos para cada capa
    switch (layerName) {
      case 'ambient':
        layer.pattern = new Tone.Pattern((time, note) => {
          layer.synth.triggerAttackRelease(note, '2n', time);
        }, ['C3', 'Eb3', 'G3', 'Bb3'], 'upDown');
        layer.pattern.interval = '2n';
        break;
        
      case 'bass':
        layer.pattern = new Tone.Pattern((time, note) => {
          layer.synth.triggerAttackRelease(note, '8n', time);
        }, ['C1', 'C1', 'F1', 'G1'], 'up');
        layer.pattern.interval = '4n';
        break;
        
      case 'rhythm':
        layer.pattern = new Tone.Pattern((time, note) => {
          layer.synth.triggerAttackRelease(note, '32n', time);
        }, ['C2'], 'up');
        layer.pattern.interval = '8n';
        break;
        
      case 'melody':
        layer.pattern = new Tone.Pattern((time, note) => {
          layer.synth.triggerAttackRelease(note, '4n', time);
        }, ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'], 'random');
        layer.pattern.interval = '4n';
        break;
    }
    
    if (layer.pattern) {
      layer.pattern.start();
    }
    
    console.log(`🎼 Capa musical '${layerName}' activada`);
  }

  deactivateMusicLayer(layerName, fadeTime = 1000) {
    const layer = this.musicSystem.layers.get(layerName);
    if (!layer || !layer.active) return;
    
    // Fadeout
    layer.volume.volume.rampTo(Tone.gainToDb(0.001), fadeTime / 1000);
    
    // Detener patrón después del fade
    setTimeout(() => {
      if (layer.pattern) {
        layer.pattern.stop();
        layer.pattern.dispose();
        layer.pattern = null;
      }
      layer.active = false;
    }, fadeTime);
    
    console.log(`🎼 Capa musical '${layerName}' desactivada`);
  }

  // ========================================
  // CONTROL DE VOLUMEN Y EFECTOS
  // ========================================

  setMasterVolume(volume) {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    this.effects.masterGain.volume.value = Tone.gainToDb(Math.max(0.001, volume));
  }

  setMusicVolume(volume) {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    this.effects.musicGain.volume.value = Tone.gainToDb(Math.max(0.001, volume));
  }

  setSFXVolume(volume) {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume));
    this.effects.sfxGain.volume.value = Tone.gainToDb(Math.max(0.001, volume));
  }

  updateListener(position, orientation, velocity = null) {
    this.listener.position = { ...position };
    this.listener.orientation = { ...orientation };
    
    if (velocity) {
      this.listener.velocity = { ...velocity };
    }
    
    if (this.effects.spatialProcessor) {
      this.effects.spatialProcessor.updateListener(position, orientation);
    }
  }

  // ========================================
  // GENERACIÓN DE SONIDOS PROCEDURALES
  // ========================================

  generateTone(frequency, duration, waveform = 'sine', config = {}) {
    if (!this.isEnabled) return null;
    
    try {
      const oscillator = new Tone.Oscillator(frequency, waveform);
      const envelope = new Tone.AmplitudeEnvelope({
        attack: config.attack || 0.01,
        decay: config.decay || 0.1,
        sustain: config.sustain || 0.3,
        release: config.release || 0.4
      });
      
      const gain = new Tone.Gain(config.volume || 0.5);
      
      oscillator.connect(envelope);
      envelope.connect(gain);
      gain.connect(this.effects.sfxGain);
      
      oscillator.start();
      envelope.triggerAttackRelease(duration);
      
      setTimeout(() => {
        oscillator.dispose();
        envelope.dispose();
        gain.dispose();
      }, (duration + (config.release || 0.4)) * 1000);
      
      return true;
    } catch (error) {
      console.error('❌ Error generando tono:', error);
      return false;
    }
  }

  generateNoiseSound(type = 'white', duration = 1.0, config = {}) {
    if (!this.isEnabled) return null;
    
    try {
      const noise = new Tone.Noise(type);
      const envelope = new Tone.AmplitudeEnvelope({
        attack: config.attack || 0.1,
        decay: config.decay || 0.2,
        sustain: config.sustain || 0.5,
        release: config.release || 0.3
      });
      
      const filter = new Tone.Filter({
        frequency: config.filterFreq || 1000,
        type: config.filterType || 'lowpass'
      });
      
      const gain = new Tone.Gain(config.volume || 0.3);
      
      noise.connect(filter);
      filter.connect(envelope);
      envelope.connect(gain);
      gain.connect(this.effects.sfxGain);
      
      noise.start();
      envelope.triggerAttackRelease(duration);
      
      setTimeout(() => {
        noise.dispose();
        envelope.dispose();
        filter.dispose();
        gain.dispose();
      }, (duration + (config.release || 0.3)) * 1000);
      
      return true;
    } catch (error) {
      console.error('❌ Error generando ruido:', error);
      return false;
    }
  }

  // ========================================
  // CONTROL GENERAL
  // ========================================

  update(deltaTime) {
    if (!this.isInitialized) return;
    
    const startTime = performance.now();
    
    // Limpiar fuentes terminadas
    this.cleanupFinishedSources();
    
    // Actualizar métricas
    this.updateMetrics();
    
    const endTime = performance.now();
    this.metrics.processingTime = endTime - startTime;
  }

  cleanupFinishedSources() {
    const currentTime = Tone.now();
    const sourcesToCleanup = [];
    
    for (const [sourceId, source] of this.activeSources) {
      if (source.player.state === 'stopped') {
        sourcesToCleanup.push(sourceId);
      }
    }
    
    sourcesToCleanup.forEach(sourceId => {
      this.cleanupSource(sourceId);
    });
  }

  updateMetrics() {
    this.metrics.memoryUsage = this.sounds.size * 1024; // Estimación básica
  }

  pause() {
    if (this.musicSystem.isPlaying) {
      Tone.Transport.pause();
    }
    
    for (const [sourceId, source] of this.activeSources) {
      if (source.player.state === 'started') {
        source.player.pause();
      }
    }
  }

  resume() {
    if (this.musicSystem.isPlaying) {
      Tone.Transport.start();
    }
    
    for (const [sourceId, source] of this.activeSources) {
      if (source.player.state === 'paused') {
        source.player.start();
      }
    }
  }

  mute() {
    this.effects.masterGain.volume.value = -Infinity;
  }

  unmute() {
    this.effects.masterGain.volume.value = Tone.gainToDb(this.config.masterVolume);
  }

  // ========================================
  // API PÚBLICA
  // ========================================

  getMetrics() {
    return { ...this.metrics };
  }

  isPlaying(sourceId) {
    const source = this.activeSources.get(sourceId);
    return source ? source.player.state === 'started' : false;
  }

  getActiveSounds() {
    return Array.from(this.activeSources.keys());
  }

  // ========================================
  // LIMPIEZA
  // ========================================

  destroy() {
    // Detener música procedural
    this.stopProceduralMusic(0);
    
    // Limpiar todas las fuentes activas
    for (const [sourceId] of this.activeSources) {
      this.cleanupSource(sourceId);
    }
    
    // Limpiar sonidos cargados
    for (const [soundId, sound] of this.sounds) {
      if (sound.player) {
        sound.player.dispose();
      }
    }
    
    // Limpiar efectos
    Object.values(this.effects).forEach(effect => {
      if (effect && typeof effect.dispose === 'function') {
        effect.dispose();
      }
    });
    
    // Limpiar capas de música
    for (const [name, layer] of this.musicSystem.layers) {
      if (layer.synth) layer.synth.dispose();
      if (layer.volume) layer.volume.dispose();
      if (layer.pattern) layer.pattern.dispose();
    }
    
    // Detener contexto
    if (this.audioContext) {
      Tone.Transport.stop();
    }
    
    this.sounds.clear();
    this.activeSources.clear();
    this.spatialSources.clear();
    
    console.log('🧹 Motor de audio destruido');
  }
}

export default AudioEngine;