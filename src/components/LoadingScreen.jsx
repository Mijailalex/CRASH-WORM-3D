import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { Canvas } from '@react-three/fiber';
import { Float, Sphere, Box, Text3D, Center, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Styled Components
const LoadingContainer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, 
    #0a0e27 0%, 
    #1a1a3e 25%, 
    #2d4a7a 50%, 
    #0d47a1 75%,
    #1565c0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  overflow: hidden;
`;

const LoadingTitle = styled(motion.h1)`
  font-size: 4.5rem;
  font-weight: bold;
  background: linear-gradient(45deg, #00FFFF, #40E0D0, #48D1CC, #87CEEB);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  margin-bottom: 30px;
  text-shadow: 0 0 40px rgba(0,255,255,0.8);
  animation: cosmicPulse 3s ease-in-out infinite;
  
  @keyframes cosmicPulse {
    0%, 100% { 
      background-position: 0% 50%;
      transform: scale(1);
      filter: drop-shadow(0 0 30px rgba(0,255,255,0.8));
    }
    50% { 
      background-position: 100% 50%;
      transform: scale(1.03);
      filter: drop-shadow(0 0 50px rgba(64,224,208,0.9));
    }
  }

  @media (max-width: 768px) {
    font-size: 3rem;
  }
`;

const LoadingSubtitle = styled(motion.p)`
  font-size: 1.8rem;
  color: #FFFFFF;
  text-shadow: 3px 3px 12px rgba(0,0,0,0.8);
  text-align: center;
  margin-bottom: 40px;
  background: rgba(0,255,255,0.1);
  padding: 15px 30px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(0,255,255,0.3);

  @media (max-width: 768px) {
    font-size: 1.4rem;
    padding: 10px 20px;
  }
`;

const ProgressBarContainer = styled.div`
  width: 600px;
  height: 25px;
  background: rgba(0,0,0,0.6);
  border-radius: 15px;
  overflow: hidden;
  border: 3px solid #00FFFF;
  box-shadow: 
    0 0 30px rgba(0,255,255,0.6),
    inset 0 0 20px rgba(0,0,0,0.5);
  margin-bottom: 30px;
  position: relative;

  @media (max-width: 768px) {
    width: 90%;
    max-width: 400px;
  }
`;

const ProgressBar = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, 
    #00FFFF 0%, 
    #40E0D0 25%, 
    #48D1CC 50%, 
    #87CEEB 75%,
    #00FFFF 100%);
  background-size: 200% 100%;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  animation: gradientShift 2s ease-in-out infinite;

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255,255,255,0.4) 50%, 
      transparent 100%);
    animation: shimmer 1.5s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const ProgressText = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #000080;
  font-weight: bold;
  font-size: 14px;
  text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
  z-index: 1;
`;

const LoadingStep = styled(motion.div)`
  font-size: 1.4rem;
  color: #FFFFFF;
  text-align: center;
  margin-bottom: 20px;
  padding: 10px 20px;
  background: rgba(255,255,255,0.1);
  border-radius: 15px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.2);
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    font-size: 1.2rem;
    padding: 8px 15px;
  }
`;

const DifficultyDisplay = styled(motion.div)`
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, 
    ${props => props.color}20 0%, 
    ${props => props.color}40 50%, 
    ${props => props.color}60 100%);
  border: 2px solid ${props => props.color};
  border-radius: 15px;
  padding: 20px 30px;
  text-align: center;
  backdrop-filter: blur(15px);
  box-shadow: 0 0 30px ${props => props.color}40;

  @media (max-width: 768px) {
    bottom: 80px;
    padding: 15px 20px;
  }
`;

const TipContainer = styled(motion.div)`
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.7);
  font-size: 1rem;
  text-align: center;
  max-width: 80%;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    bottom: 20px;
  }
`;

const ParticleSystem = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
`;

const Particle = styled(motion.div)`
  position: absolute;
  width: 4px;
  height: 4px;
  background: ${props => props.color || '#00FFFF'};
  border-radius: 50%;
  box-shadow: 0 0 10px ${props => props.color || '#00FFFF'};
`;

// Componente 3D para el fondo de carga
function LoadingBackground3D() {
  const meshRef = useRef();
  
  return (
    <group>
      {/* Geometría central animada */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
        <Center>
          <mesh ref={meshRef}>
            <torusKnotGeometry args={[2, 0.5, 128, 16]} />
            <meshStandardMaterial
              color="#00FFFF"
              emissive="#004040"
              metalness={0.8}
              roughness={0.2}
              wireframe={false}
            />
          </mesh>
        </Center>
      </Float>

      {/* Esferas orbitando */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Float
          key={i}
          speed={1 + i * 0.2}
          rotationIntensity={0.4}
          floatIntensity={0.2}
        >
          <Sphere
            args={[0.3]}
            position={[
              Math.cos((i / 8) * Math.PI * 2) * 4,
              Math.sin((i / 8) * Math.PI * 2) * 2,
              Math.sin((i / 8) * Math.PI * 4) * 3
            ]}
          >
            <meshStandardMaterial
              color={`hsl(${i * 45 + 180}, 70%, 60%)`}
              emissive={`hsl(${i * 45 + 180}, 70%, 20%)`}
              transparent
              opacity={0.8}
            />
          </Sphere>
        </Float>
      ))}

      {/* Partículas 3D */}
      <Sparkles
        count={150}
        scale={[15, 15, 15]}
        size={3}
        speed={0.4}
        color="#00FFFF"
        opacity={0.8}
      />

      {/* Texto 3D */}
      <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.1}>
        <Center position={[0, -4, 0]}>
          <Text3D
            font="/fonts/helvetiker_bold.typeface.json"
            size={0.8}
            height={0.1}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
          >
            LOADING...
            <meshStandardMaterial
              color="#FFD700"
              emissive="#AA8800"
              metalness={0.6}
              roughness={0.3}
            />
          </Text3D>
        </Center>
      </Float>

      {/* Iluminación */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#00FFFF" />
      <pointLight position={[-5, -5, 5]} intensity={1} color="#FF6B35" />
      <spotLight
        position={[0, 10, 0]}
        angle={Math.PI / 6}
        penumbra={0.5}
        intensity={0.8}
        color="#FFFFFF"
      />
    </group>
  );
}

function LoadingScreen({ progress, difficulty, difficultyConfig }) {
  const [currentStep, setCurrentStep] = useState('');
  const [particles, setParticles] = useState([]);
  const [tips] = useState([
    "💡 Usa Shift para correr más rápido y alcanzar plataformas lejanas",
    "🎯 Recolecta gemas para aumentar tu puntuación y desbloquear habilidades",
    "⚡ El timing perfecto en los saltos es clave para el éxito",
    "🌟 Explora cada rincón para encontrar secretos ocultos",
    "🎮 Los enemigos tienen patrones de movimiento predecibles",
    "💎 Las gemas especiales valen mucho más que las normales",
    "🚀 Mantén el momentum para realizar saltos épicos"
  ]);
  const [currentTip, setCurrentTip] = useState(0);

  // Definir pasos de carga basados en el progreso
  useEffect(() => {
    if (progress < 20) {
      setCurrentStep('🔧 Iniciando motor 3D de última generación...');
    } else if (progress < 40) {
      setCurrentStep('🌍 Generando física del mundo con Matter.js...');
    } else if (progress < 60) {
      setCurrentStep('🎨 Cargando texturas y modelos 3D...');
    } else if (progress < 80) {
      setCurrentStep('🎵 Configurando audio espacial con Tone.js...');
    } else if (progress < 100) {
      setCurrentStep('✨ Aplicando efectos visuales premium...');
    } else {
      setCurrentStep('🚀 ¡Preparando experiencia épica!');
    }
  }, [progress]);

  // Generar partículas
  useEffect(() => {
    const newParticles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: ['#00FFFF', '#40E0D0', '#48D1CC', '#87CEEB'][i % 4],
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2
    }));
    setParticles(newParticles);
  }, []);

  // Cambiar tips periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <LoadingContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Fondo 3D */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        opacity: 0.6 
      }}>
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
          <LoadingBackground3D />
        </Canvas>
      </div>

      {/* Sistema de partículas 2D */}
      <ParticleSystem>
        {particles.map((particle) => (
          <Particle
            key={particle.id}
            color={particle.color}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`
            }}
            animate={{
              y: [-20, -window.innerHeight - 20],
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1, 1, 0.5]
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        ))}
      </ParticleSystem>

      {/* Contenido principal */}
      <LoadingTitle
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        Generando Mundo 3D...
      </LoadingTitle>

      <LoadingSubtitle
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Preparando tu aventura cósmica épica
      </LoadingSubtitle>

      {/* Barra de progreso */}
      <ProgressBarContainer>
        <ProgressBar
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <ProgressText>{progress}%</ProgressText>
      </ProgressBarContainer>

      {/* Paso actual */}
      <LoadingStep
        key={currentStep}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        {currentStep}
      </LoadingStep>

      {/* Display de dificultad */}
      <DifficultyDisplay
        color={difficultyConfig.color}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: difficultyConfig.color,
          marginBottom: '8px'
        }}>
          {difficultyConfig.name}
        </div>
        <div style={{ color: 'white', fontSize: '1rem' }}>
          💖 {difficultyConfig.playerLives} vidas • 
          🎯 {difficultyConfig.enemiesToKill} enemigos • 
          ⭐ +{difficultyConfig.expPerKill} EXP
        </div>
      </DifficultyDisplay>

      {/* Tips rotativos */}
      <TipContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTip}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {tips[currentTip]}
          </motion.div>
        </AnimatePresence>
      </TipContainer>

      {/* Efectos adicionales */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '50%',
          left: '50%',
          transform: 'translate(-50%, 50%)',
          fontSize: '8rem',
          opacity: 0.1,
          pointerEvents: 'none'
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        🌌
      </motion.div>

      {/* Estrellas de fondo */}
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: '2px',
            height: '2px',
            background: '#FFFFFF',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.5, 1]
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
        />
      ))}
    </LoadingContainer>
  );
}

export default LoadingScreen;