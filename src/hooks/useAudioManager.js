// ========================================
// HOOK useAudioManager
// ========================================

export function useAudioManager() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const audioContextRef = useRef();
  const soundsRef = useRef(new Map());
  const { state } = useGame();

  // Inicializar contexto de audio
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        // Precargar sonidos básicos
        await loadBasicSounds();
        
        setIsInitialized(true);
        console.log('🔊 AudioManager inicializado');
      } catch (error) {
        console.warn('⚠️ Audio no disponible:', error);
        setIsEnabled(false);
      }
    };

    initializeAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const loadBasicSounds = async () => {
    const basicSounds = {
      jump: generateJumpSound(),
      collectGem: generateCollectSound(),
      hit: generateHitSound(),
      damage: generateDamageSound()
    };

    for (const [name, buffer] of Object.entries(basicSounds)) {
      soundsRef.current.set(name, buffer);
    }
  };

  // Generadores de sonido procedural usando Tone.js concepts
  const generateJumpSound = () => {
    if (!audioContextRef.current) return null;
    
    const length = 0.3;
    const sampleRate = audioContextRef.current.sampleRate;
    const buffer = audioContextRef.current.createBuffer(1, length * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 400 + (200 * Math.exp(-t * 3));
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 2) * 0.3;
    }

    return buffer;
  };

  const generateCollectSound = () => {
    if (!audioContextRef.current) return null;
    
    const length = 0.2;
    const sampleRate = audioContextRef.current.sampleRate;
    const buffer = audioContextRef.current.createBuffer(1, length * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 800 + (400 * t);
      data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / length) * 0.4;
    }

    return buffer;
  };

  const generateHitSound = () => {
    if (!audioContextRef.current) return null;
    
    const length = 0.15;
    const sampleRate = audioContextRef.current.sampleRate;
    const buffer = audioContextRef.current.createBuffer(1, length * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() - 0.5) * 2;
      const envelope = Math.exp(-t * 10);
      data[i] = noise * envelope * 0.3;
    }

    return buffer;
  };

  const generateDamageSound = () => {
    if (!audioContextRef.current) return null;
    
    const length = 0.4;
    const sampleRate = audioContextRef.current.sampleRate;
    const buffer = audioContextRef.current.createBuffer(1, length * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 200 - (50 * t);
      const envelope = Math.exp(-t * 2);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
    }

    return buffer;
  };

  const playSound = useCallback((soundType, options = {}) => {
    if (!isInitialized || !isEnabled || !audioContextRef.current) return;

    const sound = soundsRef.current.get(soundType);
    if (!sound) {
      console.warn(`Sound ${soundType} not found`);
      return;
    }

    try {
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();
      
      source.buffer = sound;
      gainNode.gain.value = (options.volume || 1.0) * (state.settings?.audio?.sfxVolume || 0.7);
      
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      source.start();
      
      return source;
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [isInitialized, isEnabled, state.settings?.audio?.sfxVolume]);

  const setListenerPosition = useCallback((position) => {
    if (!audioContextRef.current || !audioContextRef.current.listener) return;
    
    const listener = audioContextRef.current.listener;
    if (listener.positionX) {
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
    }
  }, []);

  const playBackgroundMusic = useCallback((trackName, options = {}) => {
    // Implementación básica de música de fondo
    // En un proyecto real, cargarías archivos de audio aquí
    console.log(`Playing background music: ${trackName}`, options);
  }, []);

  return {
    isInitialized,
    isEnabled,
    setIsEnabled,
    playSound,
    setListenerPosition,
    playBackgroundMusic
  };
}