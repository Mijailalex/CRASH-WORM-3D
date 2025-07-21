
// ========================================
// HOOKS PERSONALIZADOS COMPLETOS
// useGameEngine, useAudioManager, useNetworkSync
// ========================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameEngine } from '../core/GameEngine';
import { useGame } from '../context/GameContext';
import * as Tone from 'tone';

// ========================================
// HOOK useAudioManager
// Ubicación: src/hooks/useAudioManager.js
// ========================================

export function useAudioManager() {
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const synthsRef = useRef({});
  const soundsRef = useRef({});
  const currentMusicRef = useRef(null);

  // Inicializar Tone.js
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Tone.start();
        setupSynths();
        setIsAudioInitialized(true);
        console.log('🔊 AudioManager inicializado');
      } catch (error) {
        console.error('❌ Error inicializando audio:', error);
      }
    };

    initAudio();

    return () => {
      if (currentMusicRef.current) {
        currentMusicRef.current.dispose();
      }
      Object.values(synthsRef.current).forEach(synth => synth.dispose());
    };
  }, []);

  // Configurar sintetizadores
  const setupSynths = useCallback(() => {
    synthsRef.current = {
      jump: new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
      }).toDestination(),

      collect: new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 }
      }).toDestination(),

      hit: new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0 }
      }).toDestination(),

      ambient: new Tone.FMSynth({
        harmonicity: 3,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.2, decay: 0.3, sustain: 0.1, release: 1.2 }
      }).toDestination()
    };

    // Configurar volumen inicial
    Object.values(synthsRef.current).forEach(synth => {
      synth.volume.value = Tone.gainToDb(volume);
    });
  }, [volume]);

  // Funciones de audio
  const playSound = useCallback((soundType, options = {}) => {
    if (!isAudioInitialized || isMuted) return;

    const synth = synthsRef.current[soundType];
    if (!synth) return;

    switch (soundType) {
      case 'jump':
        synth.triggerAttackRelease('C5', '16n', Tone.now(), 0.8);
        break;
      case 'collect':
        const collectNotes = ['C6', 'E6', 'G6'];
        collectNotes.forEach((note, i) => {
          synth.triggerAttackRelease(note, '32n', Tone.now() + i * 0.05, 0.6);
        });
        break;
      case 'hit':
        synth.triggerAttackRelease('8n', Tone.now(), 0.5);
        break;
      case 'ambient':
        if (options.note) {
          synth.triggerAttackRelease(options.note, options.duration || '2n', Tone.now(), 0.3);
        }
        break;
    }
  }, [isAudioInitialized, isMuted]);

  const playMusic = useCallback((type = 'background') => {
    if (!isAudioInitialized || isMuted) return;

    if (currentMusicRef.current) {
      currentMusicRef.current.stop();
      currentMusicRef.current.dispose();
    }

    // Música procedural simple
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    const sequence = new Tone.Sequence((time, note) => {
      synth.triggerAttackRelease(note, '8n', time, 0.2);
    }, generateMelody(type), '8n');

    sequence.start(0);
    Tone.Transport.start();

    currentMusicRef.current = { synth, sequence };
  }, [isAudioInitialized, isMuted]);

  const stopMusic = useCallback(() => {
    if (currentMusicRef.current) {
      currentMusicRef.current.sequence.stop();
      Tone.Transport.stop();
      currentMusicRef.current.synth.dispose();
      currentMusicRef.current = null;
    }
  }, []);

  const generateMelody = useCallback((type) => {
    const scales = {
      background: ['C4', 'E4', 'G4', 'A4', 'C5'],
      victory: ['C5', 'E5', 'G5', 'C6'],
      danger: ['C3', 'Eb3', 'F#3', 'G3']
    };

    const scale = scales[type] || scales.background;
    const melody = [];

    for (let i = 0; i < 16; i++) {
      melody.push(scale[Math.floor(Math.random() * scale.length)]);
    }

    return melody;
  }, []);

  // Control de volumen
  const updateVolume = useCallback((newVolume) => {
    setVolume(newVolume);
    const dbValue = Tone.gainToDb(newVolume);
    Object.values(synthsRef.current).forEach(synth => {
      synth.volume.value = dbValue;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (isMuted) {
      Tone.Transport.stop();
    }
  }, [isMuted]);

  return {
    isAudioInitialized,
    playSound,
    playMusic,
    stopMusic,
    volume,
    updateVolume,
    isMuted,
    toggleMute
  };
}