/* ============================================================================ */
/* 🎮 CRASH WORM 3D - HOOK DEL AUDIO MANAGER */
/* ============================================================================ */

import { useEffect, useRef, useCallback, useState } from 'react';
import * as Tone from 'tone';
import { Howl, Howler } from 'howler';
import { useGame } from '@/context/GameContext';

// ========================================
// 🔊 HOOK DEL AUDIO MANAGER
// ========================================

export function useAudioManager() {
  const { state } = useGame();
  const audioContextRef = useRef(null);
  const soundsRef = useRef(new Map());
  const musicRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAudioSupported, setIsAudioSupported] = useState(true);

  // Inicializar sistema de audio
  useEffect(() => {
    initializeAudioSystem();

    return () => {
      cleanup();
    };
  }, []);

  // Actualizar volúmenes cuando cambian en el estado
  useEffect(() => {
    if (isInitialized) {
      Howler.volume(state.masterVolume * (state.soundEnabled ? 1 : 0));

      if (musicRef.current) {
        musicRef.current.volume(state.musicVolume * (state.musicEnabled ? 1 : 0));
      }
    }
  }, [state.masterVolume, state.musicVolume, state.soundEnabled, state.musicEnabled, isInitialized]);

  const initializeAudioSystem = async () => {
    try {
      // Inicializar Tone.js
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      audioContextRef.current = Tone.context;

      // Configurar Howler
      Howler.autoUnlock = true;
      Howler.html5PoolSize = 10;

      // Cargar sonidos básicos
      await loadBasicSounds();

      setIsInitialized(true);
      console.log('🔊 Audio system initialized');

    } catch (error) {
      console.error('Audio initialization failed:', error);
      setIsAudioSupported(false);
    }
  };

  const loadBasicSounds = async () => {
    const basicSounds = {
      jump: createJumpSound(),
      collect: createCollectSound(),
      damage: createDamageSound(),
      victory: createVictorySound(),
      click: createClickSound()
    };

    for (const [name, sound] of Object.entries(basicSounds)) {
      soundsRef.current.set(name, sound);
    }
  };

  const cleanup = () => {
    // Detener todos los sonidos
    soundsRef.current.forEach(sound => {
      if (sound.stop) sound.stop();
      if (sound.unload) sound.unload();
    });

    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current.unload();
    }

    soundsRef.current.clear();

    // Cleanup Tone.js
    if (audioContextRef.current) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    }
  };

  // ========================================
  // 🎵 GENERADORES DE SONIDO PROCEDURAL
  // ========================================

  const createJumpSound = () => {
    return new Howl({
      src: [generateJumpSound()],
      volume: 0.5,
      rate: 1,
      sprite: {
        jump: [0, 200]
      }
    });
  };

  const createCollectSound = () => {
    return new Howl({
      src: [generateCollectSound()],
      volume: 0.6,
      rate: 1,
      sprite: {
        collect: [0, 300]
      }
    });
  };

  const createDamageSound = () => {
    return new Howl({
      src: [generateDamageSound()],
      volume: 0.7,
      rate: 1,
      sprite: {
        damage: [0, 400]
      }
    });
  };

  const createVictorySound = () => {
    return new Howl({
      src: [generateVictorySound()],
      volume: 0.8,
      rate: 1,
      sprite: {
        victory: [0, 1000]
      }
    });
  };

  const createClickSound = () => {
    return new Howl({
      src: [generateClickSound()],
      volume: 0.3,
      rate: 1,
      sprite: {
        click: [0, 100]
      }
    });
  };

  // ========================================
  // 🎼 GENERACIÓN PROCEDURAL DE AUDIO
  // ========================================

  const generateJumpSound = () => {
    const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.2;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = 200 + (1 - t / duration) * 300; // Frecuencia descendente
      const envelope = Math.exp(-t * 8); // Envelope exponencial
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    }

    return bufferToWavBlob(buffer);
  };

  const generateCollectSound = () => {
    const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.3;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq1 = 440 + Math.sin(t * 20) * 100; // Vibrato
      const freq2 = 660 + Math.sin(t * 30) * 50;
      const envelope = Math.exp(-t * 5);
      data[i] = (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)) * envelope * 0.2;
    }

    return bufferToWavBlob(buffer);
  };

  const generateDamageSound = () => {
    const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.4;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() - 0.5) * 2;
      const freq = 100 + Math.sin(t * 50) * 50;
      const envelope = Math.exp(-t * 3);
      data[i] = (Math.sin(2 * Math.PI * freq * t) + noise * 0.3) * envelope * 0.4;
    }

    return bufferToWavBlob(buffer);
  };

  const generateVictorySound = () => {
    const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 1.0;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noteIndex = Math.floor(t * 4) % notes.length;
      const freq = notes[noteIndex];
      const envelope = Math.max(0, 1 - t / duration);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    }

    return bufferToWavBlob(buffer);
  };

  const generateClickSound = () => {
    const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.1;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = 800;
      const envelope = Math.exp(-t * 50);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
    }

    return bufferToWavBlob(buffer);
  };

  // ========================================
  // 🛠️ UTILIDADES DE AUDIO
  // ========================================

  const bufferToWavBlob = (buffer) => {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    const data = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return URL.createObjectURL(new Blob([arrayBuffer], { type: 'audio/wav' }));
  };

  // ========================================
  // 🎮 API PÚBLICA
  // ========================================

  const playSound = useCallback((soundName, options = {}) => {
    if (!isInitialized || !isAudioSupported || !state.soundEnabled) return;

    const sound = soundsRef.current.get(soundName);
    if (sound) {
      const volume = (options.volume || 1) * state.sfxVolume * state.masterVolume;
      const rate = options.rate || 1;

      sound.volume(volume);
      sound.rate(rate);
      sound.play();
    }
  }, [isInitialized, isAudioSupported, state.soundEnabled, state.sfxVolume, state.masterVolume]);

  const playMusic = useCallback((musicUrl, options = {}) => {
    if (!isInitialized || !isAudioSupported || !state.musicEnabled) return;

    // Stop current music
    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current.unload();
    }

    // Create new music
    musicRef.current = new Howl({
      src: [musicUrl],
      loop: options.loop !== false,
      volume: state.musicVolume * state.masterVolume,
      autoplay: true,
      onend: options.onEnd,
      onload: options.onLoad,
      onerror: options.onError
    });
  }, [isInitialized, isAudioSupported, state.musicEnabled, state.musicVolume, state.masterVolume]);

  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.stop();
    }
  }, []);

  const pauseMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.pause();
    }
  }, []);

  const resumeMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.play();
    }
  }, []);

  const setMasterVolume = useCallback((volume) => {
    if (isInitialized) {
      Howler.volume(volume * (state.soundEnabled ? 1 : 0));
    }
  }, [isInitialized, state.soundEnabled]);

  const loadSound = useCallback((name, url, options = {}) => {
    const sound = new Howl({
      src: [url],
      volume: options.volume || 1,
      loop: options.loop || false,
      ...options
    });

    soundsRef.current.set(name, sound);
    return sound;
  }, []);

  const unloadSound = useCallback((name) => {
    const sound = soundsRef.current.get(name);
    if (sound) {
      sound.unload();
      soundsRef.current.delete(name);
    }
  }, []);

  const createSpatialAudio = useCallback((position, options = {}) => {
    if (!isInitialized || !audioContextRef.current) return null;

    const panner = audioContextRef.current.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = options.refDistance || 1;
    panner.maxDistance = options.maxDistance || 50;
    panner.rolloffFactor = options.rolloffFactor || 1;

    panner.positionX.setValueAtTime(position.x, audioContextRef.current.currentTime);
    panner.positionY.setValueAtTime(position.y, audioContextRef.current.currentTime);
    panner.positionZ.setValueAtTime(position.z, audioContextRef.current.currentTime);

    return panner;
  }, [isInitialized]);

  return {
    isInitialized,
    isAudioSupported,
    playSound,
    playMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    setMasterVolume,
    loadSound,
    unloadSound,
    createSpatialAudio,
    sounds: soundsRef.current,
    audioContext: audioContextRef.current
  };
}

export default useAudioManager;
