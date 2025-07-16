import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { Howl } from 'howler';
import { useGame } from '../context/GameContext';

// Configuración de audio
const AUDIO_CONFIG = {
  volume: {
    master: 0.7,
    music: 0.5,
    sfx: 0.8,
    ambient: 0.3
  },
  fadeTime: 1.0,
  crossfadeTime: 2.0
};

// Definición de escalas musicales para música procedural
const SCALES = {
  cosmic: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'],
  adventure: ['C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5'],
  danger: ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5', 'F5'],
  victory: ['C4', 'E4', 'G4', 'B4', 'C5', 'E5', 'G5', 'B5']
};

class ToneAudioEngine {
  constructor() {
    this.isInitialized = false;
    this.currentMusic = null;
    this.synthLayers = {};
    this.effects = {};
    this.patterns = {};
    this.masterVolume = new Tone.Volume(-10).toDestination();
    
    this.setupInstruments();
    this.setupEffects();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await Tone.start();
      console.log('Tone.js audio context started');
      this.isInitialized = true;
      
      // Configurar el contexto de audio
      Tone.Transport.bpm.value = 120;
      Tone.Transport.start();
      
    } catch (error) {
      console.error('Error initializing Tone.js:', error);
    }
  }

  setupInstruments() {
    // Sintetizador principal para melodías
    this.synthLayers.lead = new Tone.Synth({
      oscillator: {
        type: 'sine',
        modulationType: 'square',
        modulationIndex: 2
      },
      envelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.3,
        release: 1
      }
    }).connect(this.masterVolume);

    // Pad atmosférico
    this.synthLayers.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sawtooth',
        volume: -20
      },
      envelope: {
        attack: 1,
        decay: 0.5,
        sustain: 0.8,
        release: 2
      }
    }).connect(this.masterVolume);

    // Bass sintético
    this.synthLayers.bass = new Tone.MonoSynth({
      oscillator: {
        type: 'square'
      },
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.1,
        release: 0.8
      },
      filter: {
        Q: 2,
        frequency: 300,
        type: 'lowpass',
        rolloff: -12
      }
    }).connect(this.masterVolume);

    // Drums sintéticos
    this.synthLayers.drum = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 6,
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4
      }
    }).connect(this.masterVolume);
  }

  setupEffects() {
    // Reverb espacial
    this.effects.reverb = new Tone.Reverb({
      decay: 3,
      wet: 0.3
    }).connect(this.masterVolume);

    // Delay
    this.effects.delay = new Tone.PingPongDelay({
      delayTime: '8n',
      feedback: 0.3,
      wet: 0.2
    }).connect(this.effects.reverb);

    // Filtro para efectos dinámicos
    this.effects.filter = new Tone.AutoFilter({
      frequency: '4n',
      type: 'sine',
      depth: 0.5,
      baseFrequency: 300,
      octaves: 2
    }).connect(this.effects.delay);

    // Conectar instrumentos a efectos
    this.synthLayers.lead.connect(this.effects.filter);
    this.synthLayers.pad.connect(this.effects.reverb);
  }

  playMusic(type = 'cosmic', intensity = 0.5) {
    this.stopMusic();
    
    const scale = SCALES[type] || SCALES.cosmic;
    const baseNote = scale[0];
    
    // Crear patrones musicales procedurales
    this.createMelodyPattern(scale, intensity);
    this.createBassPattern(baseNote, intensity);
    this.createPadPattern(scale, intensity);
    
    if (intensity > 0.7) {
      this.createDrumPattern(intensity);
    }

    this.currentMusic = type;
  }

  createMelodyPattern(scale, intensity) {
    const notePattern = this.generateMelodySequence(scale, intensity);
    
    this.patterns.melody = new Tone.Pattern((time, note) => {
      this.synthLayers.lead.triggerAttackRelease(note, '8n', time);
    }, notePattern, 'up');
    
    this.patterns.melody.start(0);
  }

  createBassPattern(baseNote, intensity) {
    const bassNotes = [baseNote, baseNote, baseNote, Tone.Frequency(baseNote).transpose(-7)];
    
    this.patterns.bass = new Tone.Sequence((time, note) => {
      this.synthLayers.bass.triggerAttackRelease(note, '4n', time);
    }, bassNotes, '2n');
    
    this.patterns.bass.start(0);
  }

  createPadPattern(scale, intensity) {
    const chordNotes = [
      [scale[0], scale[2], scale[4]],
      [scale[1], scale[3], scale[5]],
      [scale[2], scale[4], scale[6]],
      [scale[0], scale[2], scale[4]]
    ];
    
    this.patterns.pad = new Tone.Sequence((time, chord) => {
      this.synthLayers.pad.triggerAttackRelease(chord, '1n', time);
    }, chordNotes, '1n');
    
    this.patterns.pad.start(0);
  }

  createDrumPattern(intensity) {
    const kickPattern = ['C1', null, null, 'C1', null, null, 'C1', null];
    
    this.patterns.drum = new Tone.Sequence((time, note) => {
      if (note) {
        this.synthLayers.drum.triggerAttackRelease(note, '16n', time);
      }
    }, kickPattern, '8n');
    
    this.patterns.drum.start(0);
  }

  generateMelodySequence(scale, intensity) {
    const length = Math.floor(4 + intensity * 8);
    const sequence = [];
    
    for (let i = 0; i < length; i++) {
      const noteIndex = Math.floor(Math.random() * scale.length);
      sequence.push(scale[noteIndex]);
    }
    
    return sequence;
  }

  stopMusic() {
    Object.keys(this.patterns).forEach(key => {
      if (this.patterns[key]) {
        this.patterns[key].stop();
        this.patterns[key].dispose();
        delete this.patterns[key];
      }
    });
    this.currentMusic = null;
  }

  setVolume(volume) {
    this.masterVolume.volume.value = Tone.gainToDb(volume);
  }

  // Efectos de sonido procedurales
  playJumpSound() {
    const freq = 440;
    this.synthLayers.lead.triggerAttackRelease(
      Tone.Frequency(freq).transpose(12), 
      '16n'
    );
  }

  playCollectSound(type = 'gem') {
    const frequencies = {
      gem: [523.25, 659.25, 783.99], // C5, E5, G5
      powerup: [440, 554.37, 659.25, 880], // A4, C#5, E5, A5
      enemy: [220, 185, 146.83] // A3, F#3, D3
    };
    
    const notes = frequencies[type] || frequencies.gem;
    
    notes.forEach((freq, index) => {
      Tone.Transport.scheduleOnce((time) => {
        this.synthLayers.lead.triggerAttackRelease(freq, '32n', time);
      }, `+${index * 0.05}`);
    });
  }

  playHitSound() {
    // Sonido de golpe usando ruido filtrado
    const noise = new Tone.Noise('pink').start();
    const filter = new Tone.Filter(400, 'lowpass').toDestination();
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.01,
      decay: 0.2,
      sustain: 0,
      release: 0.3
    }).toDestination();
    
    noise.connect(filter);
    filter.connect(env);
    env.triggerAttackRelease('16n');
    
    setTimeout(() => {
      noise.dispose();
      filter.dispose();
      env.dispose();
    }, 500);
  }

  updateMusicIntensity(intensity) {
    if (this.currentMusic) {
      // Ajustar efectos según intensidad
      this.effects.filter.wet.value = intensity * 0.5;
      this.effects.delay.wet.value = intensity * 0.3;
      
      // Ajustar tempo dinámicamente
      Tone.Transport.bpm.value = 120 + (intensity * 60);
    }
  }

  dispose() {
    this.stopMusic();
    Object.values(this.synthLayers).forEach(synth => synth.dispose());
    Object.values(this.effects).forEach(effect => effect.dispose());
    this.masterVolume.dispose();
  }
}

// Manager de efectos de sonido con Howler.js
class SFXManager {
  constructor() {
    this.sounds = {};
    this.loadSounds();
  }

  loadSounds() {
    // Como no tenemos archivos de audio, generamos sonidos sintéticos
    // En un proyecto real, cargarías archivos .mp3/.wav aquí
    
    this.sounds = {
      // Placeholder - en producción cargarías archivos reales
      jump: null,
      collect: null,
      damage: null,
      victory: null,
      gameOver: null
    };
  }

  play(soundName, options = {}) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.volume(options.volume || 0.8);
      sound.rate(options.rate || 1.0);
      sound.play();
    }
  }

  setVolume(volume) {
    Object.values(this.sounds).forEach(sound => {
      if (sound) sound.volume(volume);
    });
  }

  stop(soundName) {
    const sound = this.sounds[soundName];
    if (sound) sound.stop();
  }

  stopAll() {
    Object.values(this.sounds).forEach(sound => {
      if (sound) sound.stop();
    });
  }
}

function AudioManager({ enabled, gameState }) {
  const { state, actions } = useGame();
  const toneEngineRef = useRef(null);
  const sfxManagerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentMusicType, setCurrentMusicType] = useState(null);

  // Inicializar sistemas de audio
  useEffect(() => {
    if (enabled && !isInitialized) {
      initializeAudio();
    } else if (!enabled && isInitialized) {
      stopAllAudio();
    }
  }, [enabled, isInitialized]);

  const initializeAudio = useCallback(async () => {
    try {
      // Inicializar Tone.js
      toneEngineRef.current = new ToneAudioEngine();
      await toneEngineRef.current.initialize();
      
      // Inicializar Howler.js
      sfxManagerRef.current = new SFXManager();
      
      setIsInitialized(true);
      console.log('Audio systems initialized successfully');
      
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    if (toneEngineRef.current) {
      toneEngineRef.current.stopMusic();
    }
    if (sfxManagerRef.current) {
      sfxManagerRef.current.stopAll();
    }
  }, []);

  // Cambiar música según el estado del juego
  useEffect(() => {
    if (!isInitialized || !enabled || !toneEngineRef.current) return;

    let musicType = null;
    let intensity = 0.5;

    switch (gameState) {
      case 'menu':
        musicType = 'cosmic';
        intensity = 0.3;
        break;
      case 'loading':
        musicType = 'cosmic';
        intensity = 0.4;
        break;
      case 'playing':
        musicType = 'adventure';
        intensity = 0.6;
        break;
      case 'paused':
        // Reducir volumen pero no parar
        if (toneEngineRef.current) {
          toneEngineRef.current.setVolume(AUDIO_CONFIG.volume.music * 0.3);
        }
        return;
      case 'gameOver':
        musicType = 'danger';
        intensity = 0.8;
        break;
      case 'victory':
        musicType = 'victory';
        intensity = 0.9;
        break;
      default:
        musicType = 'cosmic';
        intensity = 0.5;
    }

    if (musicType !== currentMusicType) {
      toneEngineRef.current.playMusic(musicType, intensity);
      setCurrentMusicType(musicType);
    }

    // Restaurar volumen normal
    if (gameState !== 'paused') {
      toneEngineRef.current.setVolume(AUDIO_CONFIG.volume.music);
    }

  }, [gameState, isInitialized, enabled, currentMusicType]);

  // Efectos de sonido basados en eventos del juego
  useEffect(() => {
    if (!isInitialized || !enabled || !toneEngineRef.current) return;

    // Escuchar eventos del estado del juego
    const handleGameEvents = () => {
      // Aquí detectarías cambios específicos en el estado
      // Por ejemplo, si el jugador salta, recolecta items, etc.
      
      // Ejemplo de detección de salto (necesitarías implementar la lógica específica)
      if (state.input.keys.jump) {
        toneEngineRef.current.playJumpSound();
      }
    };

    handleGameEvents();
  }, [state, isInitialized, enabled]);

  // Actualizar intensidad musical según la situación del juego
  useEffect(() => {
    if (!isInitialized || !enabled || !toneEngineRef.current) return;

    // Calcular intensidad basada en el estado del juego
    let intensity = 0.5;
    
    if (state.player.health < 30) {
      intensity += 0.3; // Música más intensa cuando la salud es baja
    }
    
    if (state.world.enemies.length > 5) {
      intensity += 0.2; // Más intensa con muchos enemigos
    }
    
    if (state.game.objectives.enemiesKilled > state.game.objectives.enemiesTarget * 0.8) {
      intensity += 0.3; // Más intensa cerca del objetivo
    }

    toneEngineRef.current.updateMusicIntensity(Math.min(intensity, 1.0));
  }, [state.player.health, state.world.enemies.length, state.game.objectives, isInitialized, enabled]);

  // Funciones de audio expuestas para ser usadas por otros componentes
  const playSound = useCallback((soundType, options = {}) => {
    if (!isInitialized || !enabled || !toneEngineRef.current) return;

    switch (soundType) {
      case 'jump':
        toneEngineRef.current.playJumpSound();
        break;
      case 'collect-gem':
        toneEngineRef.current.playCollectSound('gem');
        break;
      case 'collect-powerup':
        toneEngineRef.current.playCollectSound('powerup');
        break;
      case 'hit-enemy':
        toneEngineRef.current.playCollectSound('enemy');
        break;
      case 'player-damage':
        toneEngineRef.current.playHitSound();
        break;
      default:
        console.warn(`Unknown sound type: ${soundType}`);
    }
  }, [isInitialized, enabled]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (toneEngineRef.current) {
        toneEngineRef.current.dispose();
      }
    };
  }, []);

  // Exponer funciones de audio al contexto del juego
  useEffect(() => {
    if (actions && playSound) {
      // Aquí podrías agregar el playSound al contexto global
      // actions.setAudioPlayFunction(playSound);
    }
  }, [actions, playSound]);

  // Control de volumen maestro
  useEffect(() => {
    if (!isInitialized) return;

    const masterVolume = state.settings?.audio?.masterVolume || AUDIO_CONFIG.volume.master;
    
    if (toneEngineRef.current) {
      toneEngineRef.current.setVolume(masterVolume);
    }
    
    if (sfxManagerRef.current) {
      sfxManagerRef.current.setVolume(masterVolume);
    }
  }, [state.settings?.audio?.masterVolume, isInitialized]);

  // No renderiza nada visible
  return null;
}

// Hook personalizado para usar audio en componentes
export function useAudio() {
  const playJump = useCallback(() => {
    // Función para reproducir sonido de salto
    window.audioManager?.playSound('jump');
  }, []);

  const playCollect = useCallback((type = 'gem') => {
    window.audioManager?.playSound(`collect-${type}`);
  }, []);

  const playHit = useCallback((type = 'enemy') => {
    window.audioManager?.playSound(`hit-${type}`);
  }, []);

  const playDamage = useCallback(() => {
    window.audioManager?.playSound('player-damage');
  }, []);

  return {
    playJump,
    playCollect,
    playHit,
    playDamage
  };
}

export default AudioManager;