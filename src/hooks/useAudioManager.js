/* ============================================================================ */
/* 🎮 CRASH WORM 3D - AUDIO MANAGER HOOK */
/* ============================================================================ */
/* Ubicación: src/hooks/useAudioManager.js */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Howl, Howler } from 'howler';
import * as Tone from 'tone';
import { gameConfig } from '../data/gameConfig';

// ========================================
// 🎵 AUDIO MANAGER HOOK
// ========================================

export function useAudioManager(settings = {}) {
  const audioContextRef = useRef(null);
  const soundsRef = useRef(new Map());
  const musicRef = useRef(null);
  const ambientRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentMusic, setCurrentMusic] = useState(null);
  const [currentAmbient, setCurrentAmbient] = useState(null);

  const config = useMemo(() => ({
    ...gameConfig.audio,
    ...settings
  }), [settings]);

  // ========================================
  // 🎯 INITIALIZATION
  // ========================================

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Initialize Tone.js
        await Tone.start();
        audioContextRef.current = Tone.context;

        // Configure Howler
        Howler.volume(config.master.volume);

        // Load audio files
        await loadAudioFiles();

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initializeAudio();

    return () => {
      // Cleanup
      soundsRef.current.forEach(sound => sound.unload());
      soundsRef.current.clear();
      if (musicRef.current) musicRef.current.unload();
      if (ambientRef.current) ambientRef.current.unload();
    };
  }, [config]);

  // ========================================
  // 📁 LOAD AUDIO FILES
  // ========================================

  const loadAudioFiles = useCallback(async () => {
    const loadPromises = [];

    // Load SFX
    Object.entries(config.files.sfx).forEach(([name, url]) => {
      const sound = new Howl({
        src: [url],
        volume: config.categories.sfx.volume,
        preload: true,
        pool: 5, // Audio pooling for performance
      });

      soundsRef.current.set(name, sound);
      loadPromises.push(new Promise(resolve => {
        sound.once('load', resolve);
        sound.once('loaderror', resolve);
      }));
    });

    await Promise.all(loadPromises);
  }, [config]);

  // ========================================
  // 🔊 SOUND EFFECTS
  // ========================================

  const playSound = useCallback((soundName, options = {}) => {
    if (!isInitialized) return null;

    const sound = soundsRef.current.get(soundName);
    if (!sound) {
      console.warn(`Sound ${soundName} not found`);
      return null;
    }

    const soundId = sound.play();

    if (options.volume !== undefined) {
      sound.volume(options.volume, soundId);
    }

    if (options.rate !== undefined) {
      sound.rate(options.rate, soundId);
    }

    if (options.loop !== undefined) {
      sound.loop(options.loop, soundId);
    }

    // 3D spatial audio
    if (options.position && config.master.spatialAudio) {
      const { x, y, z } = options.position;
      sound.pos(x, y, z, soundId);
    }

    return soundId;
  }, [isInitialized, config.master.spatialAudio]);

  const stopSound = useCallback((soundName, soundId = null) => {
    const sound = soundsRef.current.get(soundName);
    if (sound) {
      if (soundId) {
        sound.stop(soundId);
      } else {
        sound.stop();
      }
    }
  }, []);

  const fadeSound = useCallback((soundName, volume, duration = 1000, soundId = null) => {
    const sound = soundsRef.current.get(soundName);
    if (sound) {
      sound.fade(sound.volume(), volume, duration, soundId);
    }
  }, []);

  // ========================================
  // 🎵 MUSIC SYSTEM
  // ========================================

  const playMusic = useCallback((musicName, fadeInDuration = 2000) => {
    if (!isInitialized) return;

    const musicUrl = config.files.music[musicName];
    if (!musicUrl) {
      console.warn(`Music ${musicName} not found`);
      return;
    }

    // Stop current music
    if (musicRef.current) {
      musicRef.current.fade(musicRef.current.volume(), 0, 1000);
      setTimeout(() => {
        musicRef.current?.stop();
        musicRef.current?.unload();
      }, 1000);
    }

    // Load and play new music
    musicRef.current = new Howl({
      src: [musicUrl],
      volume: 0,
      loop: true,
      autoplay: true,
      onload: () => {
        musicRef.current.fade(0, config.categories.music.volume, fadeInDuration);
      }
    });

    setCurrentMusic(musicName);
  }, [isInitialized, config]);

  const stopMusic = useCallback((fadeOutDuration = 1000) => {
    if (musicRef.current) {
      musicRef.current.fade(musicRef.current.volume(), 0, fadeOutDuration);
      setTimeout(() => {
        musicRef.current?.stop();
        setCurrentMusic(null);
      }, fadeOutDuration);
    }
  }, []);

  const setMusicVolume = useCallback((volume) => {
    if (musicRef.current) {
      musicRef.current.volume(volume);
    }
  }, []);

  // ========================================
  // 🌊 AMBIENT AUDIO
  // ========================================

  const playAmbient = useCallback((ambientName, fadeInDuration = 3000) => {
    if (!isInitialized) return;

    const ambientUrl = config.files.ambient[ambientName];
    if (!ambientUrl) {
      console.warn(`Ambient ${ambientName} not found`);
      return;
    }

    // Stop current ambient
    if (ambientRef.current) {
      ambientRef.current.fade(ambientRef.current.volume(), 0, 1000);
      setTimeout(() => {
        ambientRef.current?.stop();
        ambientRef.current?.unload();
      }, 1000);
    }

    // Load and play new ambient
    ambientRef.current = new Howl({
      src: [ambientUrl],
      volume: 0,
      loop: true,
      autoplay: true,
      onload: () => {
        ambientRef.current.fade(0, config.categories.ambient.volume, fadeInDuration);
      }
    });

    setCurrentAmbient(ambientName);
  }, [isInitialized, config]);

  const stopAmbient = useCallback((fadeOutDuration = 2000) => {
    if (ambientRef.current) {
      ambientRef.current.fade(ambientRef.current.volume(), 0, fadeOutDuration);
      setTimeout(() => {
        ambientRef.current?.stop();
        setCurrentAmbient(null);
      }, fadeOutDuration);
    }
  }, []);

  // ========================================
  // 🎛️ PROCEDURAL AUDIO GENERATORS
  // ========================================

  const generateTone = useCallback((frequency, duration = 1000, waveform = 'sine') => {
    if (!isInitialized) return;

    const osc = new Tone.Oscillator(frequency, waveform);
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.1,
      decay: 0.2,
      sustain: 0.3,
      release: 0.4
    });

    osc.connect(env);
    env.toDestination();

    osc.start();
    env.triggerAttackRelease(duration / 1000);

    setTimeout(() => {
      osc.dispose();
      env.dispose();
    }, duration + 1000);
  }, [isInitialized]);

  const generateNoise = useCallback((type = 'white', duration = 500) => {
    if (!isInitialized) return;

    const noise = new Tone.Noise(type);
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.01,
      decay: 0.1,
      sustain: 0.2,
      release: 0.3
    });

    noise.connect(env);
    env.toDestination();

    noise.start();
    env.triggerAttackRelease(duration / 1000);

    setTimeout(() => {
      noise.dispose();
      env.dispose();
    }, duration + 1000);
  }, [isInitialized]);

  const generateImpact = useCallback((intensity = 0.5) => {
    if (!isInitialized) return;

    // Create impact sound using multiple oscillators
    const baseFreq = 60 + (intensity * 40);
    const duration = 200 + (intensity * 300);

    // Low frequency component
    generateTone(baseFreq, duration, 'sine');

    // Mid frequency punch
    setTimeout(() => {
      generateTone(baseFreq * 2, duration * 0.5, 'triangle');
    }, 10);

    // High frequency crack
    setTimeout(() => {
      generateNoise('white', duration * 0.3);
    }, 20);
  }, [isInitialized, generateTone, generateNoise]);

  // ========================================
  // 🎚️ GLOBAL AUDIO CONTROLS
  // ========================================

  const setMasterVolume = useCallback((volume) => {
    Howler.volume(volume);
  }, []);

  const mute = useCallback(() => {
    Howler.mute(true);
  }, []);

  const unmute = useCallback(() => {
    Howler.mute(false);
  }, []);

  const updateListenerPosition = useCallback((x, y, z) => {
    if (config.master.spatialAudio) {
      Howler.pos(x, y, z);
    }
  }, [config.master.spatialAudio]);

  const updateListenerOrientation = useCallback((x, y, z, upX = 0, upY = 1, upZ = 0) => {
    if (config.master.spatialAudio) {
      Howler.orientation(x, y, z, upX, upY, upZ);
    }
  }, [config.master.spatialAudio]);

  // ========================================
  // 📊 AUDIO ANALYSIS
  // ========================================

  const getAudioAnalyzer = useCallback(() => {
    if (!isInitialized || !audioContextRef.current) return null;

    const analyzer = new Tone.Analyser('waveform', 1024);
    Tone.Destination.connect(analyzer);

    return {
      getWaveform: () => analyzer.getValue(),
      getFrequencyData: () => {
        analyzer.type = 'fft';
        const data = analyzer.getValue();
        analyzer.type = 'waveform';
        return data;
      }
    };
  }, [isInitialized]);

  return {
    isInitialized,
    currentMusic,
    currentAmbient,

    // Sound effects
    playSound,
    stopSound,
    fadeSound,

    // Music
    playMusic,
    stopMusic,
    setMusicVolume,

    // Ambient
    playAmbient,
    stopAmbient,

    // Procedural audio
    generateTone,
    generateNoise,
    generateImpact,

    // Global controls
    setMasterVolume,
    mute,
    unmute,
    updateListenerPosition,
    updateListenerOrientation,

    // Analysis
    getAudioAnalyzer
  };
}