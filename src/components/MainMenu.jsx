import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { Canvas } from '@react-three/fiber';
import { Float, Text3D, Center, Sparkles, OrbitControls } from '@react-three/drei';

// Styled Components
const MenuContainer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, 
    rgba(10,14,39,0.95) 0%, 
    rgba(26,26,62,0.95) 30%, 
    rgba(45,74,122,0.95) 60%, 
    rgba(13,71,161,0.95) 100%);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  overflow: hidden;
`;

const GameTitle = styled(motion.h1)`
  font-size: 6rem;
  font-weight: bold;
  background: linear-gradient(45deg, #FF6B35, #FF8C42, #FFD700, #FFA500, #FF6B35);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  margin-bottom: 20px;
  text-shadow: 0 0 40px rgba(255,107,53,0.8);
  animation: gradientShift 4s ease-in-out infinite;
  
  @keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @media (max-width: 768px) {
    font-size: 4rem;
  }
`;

const GameSubtitle = styled(motion.p)`
  font-size: 1.8rem;
  color: #FFFFFF;
  text-shadow: 3px 3px 12px rgba(0,0,0,0.8);
  text-align: center;
  max-width: 800px;
  line-height: 1.4;
  margin-bottom: 50px;
  background: rgba(255,255,255,0.1);
  padding: 20px 40px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);

  @media (max-width: 768px) {
    font-size: 1.4rem;
    padding: 15px 25px;
  }
`;

const MenuSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
  margin-bottom: 40px;
`;

const MenuButton = styled(motion.button)`
  padding: 20px 50px;
  font-size: 1.8rem;
  font-weight: bold;
  background: ${props => props.gradient || 'linear-gradient(45deg, #FF6B35, #FF8C42, #FFD700, #FFA500)'};
  background-size: 300% 300%;
  border: 4px solid rgba(255,255,255,0.9);
  border-radius: 50px;
  color: #FFFFFF;
  text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
  box-shadow: 
    0 15px 35px rgba(0,0,0,0.4), 
    inset 0 6px 0 rgba(255,255,255,0.3),
    0 0 30px rgba(255,107,53,0.5);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-width: 300px;
  animation: gradientShift 3s ease infinite;

  &:hover {
    transform: translateY(-5px) scale(1.05);
    box-shadow: 
      0 25px 50px rgba(0,0,0,0.5), 
      inset 0 8px 0 rgba(255,255,255,0.4),
      0 0 50px rgba(255,140,66,0.8);
  }

  &:active {
    transform: translateY(-2px) scale(1.02);
  }

  @media (max-width: 768px) {
    font-size: 1.4rem;
    padding: 15px 40px;
    min-width: 250px;
  }
`;

const DifficultyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 25px;
  max-width: 1200px;
  margin: 20px 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const DifficultyCard = styled(motion.div)`
  background: linear-gradient(135deg, 
    ${props => props.color}20 0%, 
    ${props => props.color}40 50%, 
    ${props => props.color}60 100%);
  border: 3px solid ${props => props.color};
  border-radius: 20px;
  padding: 25px;
  text-align: center;
  backdrop-filter: blur(15px);
  box-shadow: 
    0 10px 30px rgba(0,0,0,0.3),
    0 0 30px ${props => props.color}40;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-10px) scale(1.05);
    box-shadow: 
      0 20px 50px rgba(0,0,0,0.4),
      0 0 50px ${props => props.color}60;
    border-width: 4px;
  }
`;

const DifficultyTitle = styled.h3`
  font-size: 1.8rem;
  color: ${props => props.color};
  margin-bottom: 15px;
  text-shadow: 0 0 10px ${props => props.color};
`;

const DifficultyDescription = styled.p`
  font-size: 1.1rem;
  color: #FFFFFF;
  margin-bottom: 20px;
  opacity: 0.9;
  line-height: 1.4;
`;

const DifficultyStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  font-size: 0.9rem;
  color: #CCCCCC;
  
  div {
    padding: 5px;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
  }
`;

const HighScoreDisplay = styled(motion.div)`
  position: absolute;
  top: 30px;
  right: 30px;
  background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,0,0.3));
  border: 2px solid #FFD700;
  border-radius: 15px;
  padding: 15px 25px;
  color: #FFD700;
  font-weight: bold;
  text-shadow: 0 0 10px #FFD700;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    font-size: 0.9rem;
  }
`;

const AudioToggle = styled(motion.button)`
  position: absolute;
  top: 30px;
  left: 30px;
  background: linear-gradient(135deg, rgba(0,255,255,0.2), rgba(64,224,208,0.3));
  border: 2px solid #00FFFF;
  border-radius: 50px;
  padding: 15px;
  color: #00FFFF;
  font-size: 1.5rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 20px #00FFFF;
  }

  @media (max-width: 768px) {
    top: 20px;
    left: 20px;
    padding: 10px;
    font-size: 1.2rem;
  }
`;

const BackgroundEffects = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
`;

const FloatingElement = styled(motion.div)`
  position: absolute;
  font-size: ${props => props.size || '2rem'};
  opacity: 0.3;
  pointer-events: none;
`;

// Componente 3D para el fondo
function Background3D() {
  return (
    <group>
      {/* Texto 3D flotante */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
        <Center>
          <Text3D
            font="/fonts/helvetiker_bold.typeface.json"
            size={2}
            height={0.2}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
            bevelOffset={0}
            bevelSegments={5}
            position={[0, 0, -10]}
          >
            COSMIC
            <meshMatcapMaterial color="#ff6b35" />
          </Text3D>
        </Center>
      </Float>

      {/* Partículas ambientales */}
      <Sparkles
        count={100}
        scale={[20, 20, 20]}
        size={2}
        speed={0.3}
        color="#00ffff"
        opacity={0.6}
      />

      {/* Esferas flotantes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Float
          key={i}
          speed={0.5 + i * 0.1}
          rotationIntensity={0.3}
          floatIntensity={0.2}
        >
          <mesh
            position={[
              (Math.random() - 0.5) * 30,
              (Math.random() - 0.5) * 20,
              -15 + Math.random() * -10
            ]}
          >
            <sphereGeometry args={[0.5 + Math.random() * 0.5]} />
            <meshStandardMaterial
              color={`hsl(${i * 45}, 70%, 60%)`}
              emissive={`hsl(${i * 45}, 70%, 30%)`}
              transparent
              opacity={0.7}
            />
          </mesh>
        </Float>
      ))}

      {/* Iluminación */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#ff6b35" />
      <pointLight position={[-10, -10, 10]} intensity={0.8} color="#00ffff" />
    </group>
  );
}

function MainMenu({ onStartGame, onToggleAudio, audioEnabled, highScore, difficulties }) {
  const [currentView, setCurrentView] = useState('main'); // main, difficulty, settings, credits
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal');
  const [hoveredButton, setHoveredButton] = useState(null);

  // Efectos de fondo animados
  const backgroundElements = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    emoji: ['🌟', '⭐', '✨', '💫', '🌌', '🚀', '👾', '🎮'][i % 8],
    size: Math.random() * 2 + 1 + 'rem',
    left: Math.random() * 100 + '%',
    top: Math.random() * 100 + '%',
    duration: 10 + Math.random() * 20
  }));

  const handleDifficultySelect = (difficulty) => {
    setSelectedDifficulty(difficulty);
    onStartGame(difficulty);
  };

  const menuVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: -50,
      transition: { duration: 0.4 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <MenuContainer
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={menuVariants}
    >
      {/* Fondo 3D */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        opacity: 0.3 
      }}>
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
          <Background3D />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {/* Efectos de fondo 2D */}
      <BackgroundEffects>
        {backgroundElements.map((element) => (
          <FloatingElement
            key={element.id}
            size={element.size}
            style={{ left: element.left, top: element.top }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              rotate: [0, 360, 0]
            }}
            transition={{
              duration: element.duration,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {element.emoji}
          </FloatingElement>
        ))}
      </BackgroundEffects>

      {/* Toggle de audio */}
      <AudioToggle
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleAudio}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {audioEnabled ? '🔊' : '🔇'}
      </AudioToggle>

      {/* Display de high score */}
      <HighScoreDisplay
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Récord Mundial</div>
        <div style={{ fontSize: '1.4rem' }}>🏆 {highScore.toLocaleString()}</div>
      </HighScoreDisplay>

      <AnimatePresence mode="wait">
        {currentView === 'main' && (
          <motion.div
            key="main"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <motion.div variants={itemVariants}>
              <GameTitle>
                Crash Worm 3D
              </GameTitle>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GameSubtitle>
                🌟 Aventura épica del gusano cósmico en mundos 3D de alta calidad 🌟
                <br />
                ¡Experimenta la jugabilidad estilo Crash Bandicoot con gráficos premium!
              </GameSubtitle>
            </motion.div>

            <MenuSection variants={itemVariants}>
              <MenuButton
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentView('difficulty')}
                onMouseEnter={() => setHoveredButton('start')}
                onMouseLeave={() => setHoveredButton(null)}
              >
                🚀 Comenzar Aventura
              </MenuButton>

              <MenuButton
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentView('settings')}
                onMouseEnter={() => setHoveredButton('settings')}
                onMouseLeave={() => setHoveredButton(null)}
                gradient="linear-gradient(45deg, #4CAF50, #66BB6A, #81C784)"
              >
                ⚙️ Configuración
              </MenuButton>

              <MenuButton
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentView('credits')}
                onMouseEnter={() => setHoveredButton('credits')}
                onMouseLeave={() => setHoveredButton(null)}
                gradient="linear-gradient(45deg, #9C27B0, #BA68C8, #CE93D8)"
              >
                👨‍💻 Créditos
              </MenuButton>
            </MenuSection>
          </motion.div>
        )}

        {currentView === 'difficulty' && (
          <motion.div
            key="difficulty"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
          >
            <motion.div variants={itemVariants}>
              <GameTitle style={{ fontSize: '4rem', marginBottom: '30px' }}>
                Elige tu Destino
              </GameTitle>
            </motion.div>

            <motion.div variants={itemVariants} style={{ width: '100%', maxWidth: '1200px' }}>
              <DifficultyGrid>
                {Object.entries(difficulties).map(([key, config]) => (
                  <DifficultyCard
                    key={key}
                    color={config.color}
                    whileHover={{ scale: 1.05, y: -10 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDifficultySelect(key)}
                  >
                    <DifficultyTitle color={config.color}>
                      {config.name}
                    </DifficultyTitle>
                    
                    <DifficultyDescription>
                      {key === 'easy' ? 'Perfecto para nuevos exploradores. Enemigos tranquilos y exploración relajada.' :
                       key === 'normal' ? 'La experiencia completa de Crash Worm. Desafío equilibrado y diversión garantizada.' :
                       key === 'hard' ? 'Para veteranos. Enemigos agresivos, plataformas móviles y máxima recompensa.' :
                       'El desafío definitivo. Solo para los más valientes. ¿Eres una leyenda?'}
                    </DifficultyDescription>

                    <DifficultyStats>
                      <div>💖 Vidas: {config.playerLives}</div>
                      <div>🎯 Enemigos: {config.enemiesToKill}</div>
                      <div>⚡ Velocidad: {config.enemySpeed}x</div>
                      <div>⭐ EXP: +{config.expPerKill}</div>
                    </DifficultyStats>

                    <div style={{ 
                      marginTop: '15px', 
                      padding: '10px', 
                      background: 'rgba(255,255,255,0.1)', 
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      color: config.color
                    }}>
                      ¡Clic para comenzar!
                    </div>
                  </DifficultyCard>
                ))}
              </DifficultyGrid>
            </motion.div>

            <motion.div variants={itemVariants} style={{ marginTop: '30px' }}>
              <MenuButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('main')}
                gradient="linear-gradient(45deg, #607D8B, #90A4AE)"
              >
                ← Volver
              </MenuButton>
            </motion.div>
          </motion.div>
        )}

        {currentView === 'settings' && (
          <motion.div
            key="settings"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <motion.div variants={itemVariants}>
              <GameTitle style={{ fontSize: '4rem', marginBottom: '30px' }}>
                Configuración
              </GameTitle>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '40px',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.2)',
                textAlign: 'center'
              }}
            >
              <h3 style={{ color: '#00FFFF', marginBottom: '20px' }}>Audio</h3>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <MenuButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onToggleAudio}
                  gradient={audioEnabled ? 
                    'linear-gradient(45deg, #4CAF50, #66BB6A)' : 
                    'linear-gradient(45deg, #F44336, #EF5350)'}
                  style={{ minWidth: '200px' }}
                >
                  {audioEnabled ? '🔊 Audio ON' : '🔇 Audio OFF'}
                </MenuButton>
              </div>

              <h3 style={{ color: '#FFD700', marginBottom: '20px' }}>Gráficos</h3>
              <p style={{ color: 'white', opacity: 0.8, marginBottom: '20px' }}>
                El juego se ejecuta automáticamente con la mejor calidad posible
                para tu dispositivo. Incluye sombras en tiempo real, efectos de partículas
                y post-procesamiento avanzado.
              </p>

              <h3 style={{ color: '#FF69B4', marginBottom: '20px' }}>Controles</h3>
              <div style={{ color: 'white', textAlign: 'left', fontSize: '1.1rem' }}>
                <div>🎮 WASD / Flechas: Movimiento 3D</div>
                <div>⚡ Espacio: Saltar</div>
                <div>🏃 Shift: Dash/Correr</div>
                <div>⏸️ ESC: Pausar juego</div>
                <div>🔇 M: Toggle audio</div>
                <div>📺 F11: Pantalla completa</div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ marginTop: '30px' }}>
              <MenuButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('main')}
                gradient="linear-gradient(45deg, #607D8B, #90A4AE)"
              >
                ← Volver
              </MenuButton>
            </motion.div>
          </motion.div>
        )}

        {currentView === 'credits' && (
          <motion.div
            key="credits"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <motion.div variants={itemVariants}>
              <GameTitle style={{ fontSize: '4rem', marginBottom: '30px' }}>
                Créditos
              </GameTitle>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '40px',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.2)',
                textAlign: 'center',
                maxWidth: '800px'
              }}
            >
              <h2 style={{ color: '#FFD700', marginBottom: '20px' }}>
                🎮 Crash Worm 3D Adventure
              </h2>
              
              <div style={{ color: 'white', fontSize: '1.2rem', lineHeight: 1.6 }}>
                <p>
                  <strong style={{ color: '#00FFFF' }}>Desarrollado con:</strong>
                </p>
                <p>
                  ⚛️ React + Three.js (React Three Fiber)<br/>
                  🎨 Framer Motion + Styled Components<br/>
                  🎵 Tone.js + Howler.js<br/>
                  🏗️ Vite + Modern JavaScript<br/>
                  ✨ Passion & Coffee ☕
                </p>

                <p style={{ marginTop: '30px' }}>
                  <strong style={{ color: '#FF69B4' }}>Características:</strong>
                </p>
                <p>
                  🌟 Gráficos 3D en tiempo real<br/>
                  🎯 Física realista con colisiones<br/>
                  🎨 Efectos visuales premium<br/>
                  🎵 Audio espacial dinámico<br/>
                  🏆 Sistema de logros<br/>
                  📱 Responsive design
                </p>

                <p style={{ marginTop: '30px', color: '#FFD700' }}>
                  <strong>¡Gracias por jugar! 🚀</strong>
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ marginTop: '30px' }}>
              <MenuButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentView('main')}
                gradient="linear-gradient(45deg, #607D8B, #90A4AE)"
              >
                ← Volver
              </MenuButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MenuContainer>
  );
}

export default MainMenu;