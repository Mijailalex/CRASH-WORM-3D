/* ============================================================================ */
/* 🎮 CRASH WORM 3D - PANTALLA DE CARGA */
/* ============================================================================ */

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import useAudioManager from '@/hooks/useAudioManager';

// ========================================
// 🔄 COMPONENTE PRINCIPAL DE LOADING
// ========================================

export function LoadingScreen() {
  const { actions } = useGame();
  const { isInitialized: isAudioReady } = useAudioManager();

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [tips, setTips] = useState([]);
  const [currentTip, setCurrentTip] = useState(0);

  const intervalRef = useRef();
  const tipIntervalRef = useRef();

  // ========================================
  // 📝 PASOS DE CARGA Y TIPS
  // ========================================

  const loadingSteps = [
    { name: 'Initializing Game Engine...', duration: 1200 },
    { name: 'Loading Game Assets...', duration: 800 },
    { name: 'Setting up Physics...', duration: 600 },
    { name: 'Initializing Audio System...', duration: 700 },
    { name: 'Loading Level Data...', duration: 500 },
    { name: 'Preparing Game World...', duration: 900 },
    { name: 'Finalizing Setup...', duration: 400 },
    { name: 'Ready to Play!', duration: 300 }
  ];

  const gameTips = [
    "💡 Use WASD or arrow keys to move your character",
    "⚡ Press SPACE to jump - you can double jump!",
    "🎯 Collect gems to increase your score",
    "💨 Use SHIFT to dash and avoid enemies",
    "❤️ Pick up health items to restore your HP",
    "🏃‍♂️ Moving platforms require perfect timing",
    "👹 Different enemies have unique attack patterns",
    "🌟 Power-ups give you temporary abilities",
    "🎮 Press ESC to pause the game anytime",
    "🏆 Complete levels quickly for bonus points"
  ];

  // ========================================
  // 🔄 SIMULACIÓN DE CARGA
  // ========================================

  useEffect(() => {
    setTips(gameTips);

    // Iniciar proceso de carga
    let totalDuration = 0;
    let currentProgress = 0;

    const startLoading = () => {
      // Calcular duración total
      totalDuration = loadingSteps.reduce((sum, step) => sum + step.duration, 0);

      loadingSteps.forEach((step, index) => {
        setTimeout(() => {
          setCurrentStep(index);

          // Animar progreso para este paso
          const stepProgress = (loadingSteps.slice(0, index + 1).reduce((sum, s) => sum + s.duration, 0) / totalDuration) * 100;

          animateProgress(currentProgress, stepProgress, step.duration);
          currentProgress = stepProgress;

          // Si es el último paso, marcar como completo
          if (index === loadingSteps.length - 1) {
            setTimeout(() => {
              setIsComplete(true);
              // Ir al menú principal después de un breve delay
              setTimeout(() => {
                actions.setGameState('menu');
              }, 1000);
            }, step.duration);
          }
        }, loadingSteps.slice(0, index).reduce((sum, s) => sum + s.duration, 0));
      });
    };

    const animateProgress = (from, to, duration) => {
      const startTime = Date.now();
      const difference = to - from;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function para suavizar la animación
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = from + (difference * easeOutQuart);

        setProgress(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    };

    startLoading();

    // Rotar tips cada 2 segundos
    tipIntervalRef.current = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % gameTips.length);
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
      }
    };
  }, [actions]);

  // ========================================
  // 🎨 RENDER
  // ========================================

  return (
    <div className="loading-screen">
      {/* Fondo animado */}
      <LoadingBackground />

      {/* Contenido principal */}
      <div className="loading-container">
        {/* Logo del juego */}
        <GameLogo isComplete={isComplete} />

        {/* Barra de progreso */}
        <ProgressBar
          progress={progress}
          currentStep={loadingSteps[currentStep]?.name || ''}
          isComplete={isComplete}
        />

        {/* Tips del juego */}
        <TipsSection
          tips={tips}
          currentTip={currentTip}
          isVisible={!isComplete}
        />

        {/* Información adicional */}
        <LoadingInfo
          isAudioReady={isAudioReady}
          progress={progress}
        />
      </div>

      {/* Efectos de partículas */}
      <LoadingParticles isActive={progress > 50} />
    </div>
  );
}

// ========================================
// 🎨 FONDO ANIMADO
// ========================================

function LoadingBackground() {
  const canvasRef = useRef();
  const animationRef = useRef();
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Crear partículas de fondo
    const createParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2
        });
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dibujar partículas
      particlesRef.current.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Dibujar partícula
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(68, 136, 255, ${particle.opacity})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    createParticles();
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="loading-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
      }}
    />
  );
}

// ========================================
// 🎮 LOGO DEL JUEGO
// ========================================

function GameLogo({ isComplete }) {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    // Animación de entrada
    setTimeout(() => setAnimationClass('fade-in'), 100);

    if (isComplete) {
      setAnimationClass('glow-complete');
    }
  }, [isComplete]);

  return (
    <div className={`game-logo ${animationClass}`}>
      <h1 className="logo-title">
        🎮 CRASH WORM 3D
      </h1>
      <p className="logo-subtitle">Adventure Awaits</p>

      {/* Efectos de brillo */}
      <div className="logo-glow" />

      {/* Versión */}
      <div className="version-info">
        v1.0.0
      </div>
    </div>
  );
}

// ========================================
// 📊 BARRA DE PROGRESO
// ========================================

function ProgressBar({ progress, currentStep, isComplete }) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Suavizar la animación del progreso
    const animate = () => {
      setDisplayProgress(prev => {
        const diff = progress - prev;
        return prev + diff * 0.1;
      });
    };

    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [progress]);

  return (
    <div className="progress-section">
      <div className="progress-text">
        <span className="current-step">{currentStep}</span>
        <span className="progress-percentage">{Math.round(displayProgress)}%</span>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar-bg">
          <div
            className={`progress-bar-fill ${isComplete ? 'complete' : ''}`}
            style={{ width: `${displayProgress}%` }}
          />

          {/* Efecto de brillo en la barra */}
          <div className="progress-shine" />
        </div>
      </div>

      {/* Segmentos de la barra de progreso */}
      <div className="progress-segments">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`progress-segment ${displayProgress > (i * 12.5) ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

// ========================================
// 💡 SECCIÓN DE TIPS
// ========================================

function TipsSection({ tips, currentTip, isVisible }) {
  const [tipAnimationClass, setTipAnimationClass] = useState('');

  useEffect(() => {
    setTipAnimationClass('tip-fade-out');

    setTimeout(() => {
      setTipAnimationClass('tip-fade-in');
    }, 200);
  }, [currentTip]);

  if (!isVisible) return null;

  return (
    <div className="tips-section">
      <div className="tips-header">
        <span className="tips-icon">💡</span>
        <span className="tips-title">Game Tips</span>
      </div>

      <div className={`tip-content ${tipAnimationClass}`}>
        <p className="tip-text">
          {tips[currentTip]}
        </p>
      </div>

      {/* Indicadores de tips */}
      <div className="tip-indicators">
        {tips.map((_, i) => (
          <div
            key={i}
            className={`tip-indicator ${i === currentTip ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

// ========================================
// ℹ️ INFORMACIÓN DE CARGA
// ========================================

function LoadingInfo({ isAudioReady, progress }) {
  return (
    <div className="loading-info">
      <div className="system-status">
        <div className={`status-item ${isAudioReady ? 'ready' : 'loading'}`}>
          <span className="status-icon">🔊</span>
          <span className="status-text">
            Audio System: {isAudioReady ? 'Ready' : 'Initializing...'}
          </span>
        </div>

        <div className={`status-item ${progress > 30 ? 'ready' : 'loading'}`}>
          <span className="status-icon">🎮</span>
          <span className="status-text">
            Game Engine: {progress > 30 ? 'Ready' : 'Loading...'}
          </span>
        </div>

        <div className={`status-item ${progress > 70 ? 'ready' : 'loading'}`}>
          <span className="status-icon">🌍</span>
          <span className="status-text">
            World Data: {progress > 70 ? 'Ready' : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Información de dispositivo */}
      <div className="device-info">
        <div className="device-item">
          <span>Platform:</span>
          <span>{navigator.platform}</span>
        </div>
        <div className="device-item">
          <span>Resolution:</span>
          <span>{window.innerWidth}x{window.innerHeight}</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ✨ PARTÍCULAS DE CARGA
// ========================================

function LoadingParticles({ isActive }) {
  const particleRef = useRef();

  useEffect(() => {
    if (!isActive || !particleRef.current) return;

    const particles = [];
    const particleCount = 20;

    // Crear partículas
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'loading-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 3 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 2) + 's';

      particleRef.current.appendChild(particle);
      particles.push(particle);
    }

    return () => {
      particles.forEach(particle => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });
    };
  }, [isActive]);

  if (!isActive) return null;

  return <div ref={particleRef} className="loading-particles-container" />;
}

export default LoadingScreen;
