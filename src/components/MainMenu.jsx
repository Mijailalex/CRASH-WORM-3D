/* ============================================================================ */
/* 🎮 CRASH WORM 3D - MENÚ PRINCIPAL */
/* ============================================================================ */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { gameConfig } from '@/data/gameConfig';
import useAudioManager from '@/hooks/useAudioManager';
import useNetworkSync from '@/hooks/useNetworkSync';

// ========================================
// 🏠 COMPONENTE PRINCIPAL DEL MENÚ
// ========================================

export function MainMenu() {
  const { state, actions, utils } = useGame();
  const { playSound, playMusic } = useAudioManager();
  const { connect, createRoom, joinRoom } = useNetworkSync();

  const [currentMenu, setCurrentMenu] = useState('main');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [playerStats, setPlayerStats] = useState(null);

  const menuRef = useRef();

  // ========================================
  // 🎵 MÚSICA DE FONDO
  // ========================================

  useEffect(() => {
    // Reproducir música del menú
    playMusic('/audio/menu-music.mp3', {
      loop: true,
      volume: 0.6,
      onLoad: () => console.log('Menu music loaded'),
      onError: (error) => console.warn('Menu music failed to load:', error)
    });

    // Cargar estadísticas del jugador
    loadPlayerStats();

    return () => {
      // La música se detiene cuando se cambia de pantalla
    };
  }, [playMusic]);

  const loadPlayerStats = useCallback(() => {
    try {
      const stats = localStorage.getItem('crashworm3d_stats');
      if (stats) {
        setPlayerStats(JSON.parse(stats));
      }
    } catch (error) {
      console.warn('Error loading player stats:', error);
    }
  }, []);

  // ========================================
  // 🎮 NAVEGACIÓN DEL MENÚ
  // ========================================

  const navigateToMenu = useCallback((menuName) => {
    playSound('click');
    setCurrentMenu(menuName);
  }, [playSound]);

  const startSinglePlayer = useCallback(() => {
    playSound('start');
    actions.setDifficulty('normal');
    actions.resetGame();
    actions.startGame();
  }, [playSound, actions]);

  const startCustomLevel = useCallback((level) => {
    playSound('start');
    actions.updateLevel(level);
    actions.resetGame();
    actions.startGame();
  }, [playSound, actions]);

  const openSettings = useCallback(() => {
    playSound('click');
    setShowSettings(true);
  }, [playSound]);

  const closeSettings = useCallback(() => {
    playSound('click');
    setShowSettings(false);
  }, [playSound]);

  // ========================================
  // 🎨 RENDER PRINCIPAL
  // ========================================

  return (
    <div className="main-menu" ref={menuRef}>
      {/* Fondo animado */}
      <MenuBackground />

      {/* Contenido del menú */}
      <div className="menu-content">
        {/* Logo del juego */}
        <GameTitle />

        {/* Navegación principal */}
        {currentMenu === 'main' && (
          <MainMenuContent
            onNavigate={navigateToMenu}
            onStartGame={startSinglePlayer}
            onOpenSettings={openSettings}
            playerStats={playerStats}
          />
        )}

        {/* Selección de nivel */}
        {currentMenu === 'levels' && (
          <LevelSelectMenu
            selectedLevel={selectedLevel}
            onLevelSelect={setSelectedLevel}
            onStartLevel={startCustomLevel}
            onBack={() => navigateToMenu('main')}
          />
        )}

        {/* Menú multijugador */}
        {currentMenu === 'multiplayer' && (
          <MultiplayerMenu
            onBack={() => navigateToMenu('main')}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
          />
        )}

        {/* Estadísticas */}
        {currentMenu === 'stats' && (
          <StatsMenu
            stats={playerStats}
            onBack={() => navigateToMenu('main')}
          />
        )}

        {/* Créditos */}
        {currentMenu === 'credits' && (
          <CreditsMenu
            onBack={() => navigateToMenu('main')}
          />
        )}
      </div>

      {/* Modal de configuraciones */}
      {showSettings && (
        <SettingsModal onClose={closeSettings} />
      )}

      {/* Información de versión */}
      <VersionInfo />
    </div>
  );
}

// ========================================
// 🌌 FONDO ANIMADO DEL MENÚ
// ========================================

function MenuBackground() {
  const canvasRef = useRef();
  const animationRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];
    const starCount = 100;

    // Crear estrellas
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.8 + 0.2
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 30, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        star.y += star.speed;

        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="menu-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)'
      }}
    />
  );
}

// ========================================
// 🎮 TÍTULO DEL JUEGO
// ========================================

function GameTitle() {
  const [glitchEffect, setGlitchEffect] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchEffect(true);
      setTimeout(() => setGlitchEffect(false), 200);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`game-title ${glitchEffect ? 'glitch' : ''}`}>
      <h1 className="title-main" data-text="CRASH WORM 3D">
        CRASH WORM 3D
      </h1>
      <p className="title-subtitle">ADVENTURE AWAITS</p>
      <div className="title-decorations">
        <span className="decoration left">⟨</span>
        <span className="decoration right">⟩</span>
      </div>
    </div>
  );
}

// ========================================
// 🏠 CONTENIDO DEL MENÚ PRINCIPAL
// ========================================

function MainMenuContent({ onNavigate, onStartGame, onOpenSettings, playerStats }) {
  const menuItems = [
    { id: 'start', label: '🎮 Start Game', action: onStartGame },
    { id: 'levels', label: '🏆 Level Select', action: () => onNavigate('levels') },
    { id: 'multiplayer', label: '🌐 Multiplayer', action: () => onNavigate('multiplayer') },
    { id: 'stats', label: '📊 Statistics', action: () => onNavigate('stats') },
    { id: 'settings', label: '⚙️ Settings', action: onOpenSettings },
    { id: 'credits', label: '👥 Credits', action: () => onNavigate('credits') }
  ];

  return (
    <div className="main-menu-content fade-in">
      <div className="menu-buttons">
        {menuItems.map((item, index) => (
          <MenuButton
            key={item.id}
            label={item.label}
            onClick={item.action}
            delay={index * 100}
          />
        ))}
      </div>

      {/* Panel de estadísticas rápidas */}
      {playerStats && (
        <QuickStatsPanel stats={playerStats} />
      )}
    </div>
  );
}

// ========================================
// 🎯 BOTÓN DE MENÚ
// ========================================

function MenuButton({ label, onClick, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), delay);
  }, [delay]);

  return (
    <button
      className={`menu-button ${isVisible ? 'visible' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="button-text">{label}</span>
      <div className="button-glow" />
    </button>
  );
}

// ========================================
// 🏆 MENÚ DE SELECCIÓN DE NIVELES
// ========================================

function LevelSelectMenu({ selectedLevel, onLevelSelect, onStartLevel, onBack }) {
  const totalLevels = gameConfig.levels.total;
  const unlockedLevels = 5; // Esto vendría del progreso del jugador

  return (
    <div className="level-select-menu slide-in">
      <div className="menu-header">
        <h2>🏆 SELECT LEVEL</h2>
        <button className="back-button" onClick={onBack}>← Back</button>
      </div>

      <div className="levels-grid">
        {[...Array(totalLevels)].map((_, i) => {
          const levelNumber = i + 1;
          const isUnlocked = levelNumber <= unlockedLevels;
          const isSelected = levelNumber === selectedLevel;

          return (
            <LevelCard
              key={levelNumber}
              levelNumber={levelNumber}
              isUnlocked={isUnlocked}
              isSelected={isSelected}
              onSelect={() => onLevelSelect(levelNumber)}
              stars={isUnlocked ? Math.floor(Math.random() * 4) : 0}
            />
          );
        })}
      </div>

      <div className="level-actions">
        <button
          className="button button-primary"
          onClick={() => onStartLevel(selectedLevel)}
          disabled={selectedLevel > unlockedLevels}
        >
          ▶️ Start Level {selectedLevel}
        </button>
      </div>
    </div>
  );
}

function LevelCard({ levelNumber, isUnlocked, isSelected, onSelect, stars }) {
  return (
    <div
      className={`level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`}
      onClick={isUnlocked ? onSelect : undefined}
    >
      <div className="level-number">{levelNumber}</div>

      {isUnlocked ? (
        <div className="level-stars">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={`star ${i < stars ? 'earned' : ''}`}>
              ⭐
            </span>
          ))}
        </div>
      ) : (
        <div className="level-lock">🔒</div>
      )}

      {isSelected && <div className="level-selection-glow" />}
    </div>
  );
}

// ========================================
// 🌐 MENÚ MULTIJUGADOR
// ========================================

function MultiplayerMenu({ onBack, onCreateRoom, onJoinRoom }) {
  const [roomCode, setRoomCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleCreateRoom = async () => {
    setIsConnecting(true);
    try {
      await onCreateRoom({ maxPlayers: 4, gameMode: 'cooperative' });
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return;

    setIsConnecting(true);
    try {
      await onJoinRoom(roomCode.trim());
    } catch (error) {
      console.error('Failed to join room:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="multiplayer-menu slide-in">
      <div className="menu-header">
        <h2>🌐 MULTIPLAYER</h2>
        <button className="back-button" onClick={onBack}>← Back</button>
      </div>

      <div className="multiplayer-options">
        <div className="option-card">
          <h3>🎮 Create Game</h3>
          <p>Host a new multiplayer session</p>
          <button
            className="button button-primary"
            onClick={handleCreateRoom}
            disabled={isConnecting}
          >
            {isConnecting ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        <div className="option-card">
          <h3>🚪 Join Game</h3>
          <p>Enter a room code to join</p>
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="room-code-input"
            maxLength={6}
          />
          <button
            className="button button-primary"
            onClick={handleJoinRoom}
            disabled={isConnecting || !roomCode.trim()}
          >
            {isConnecting ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 📊 MENÚ DE ESTADÍSTICAS
// ========================================

function StatsMenu({ stats, onBack }) {
  if (!stats) {
    return (
      <div className="stats-menu slide-in">
        <div className="menu-header">
          <h2>📊 STATISTICS</h2>
          <button className="back-button" onClick={onBack}>← Back</button>
        </div>
        <div className="no-stats">
          <p>No statistics available yet.</p>
          <p>Play some games to see your progress!</p>
        </div>
      </div>
    );
  }

  const statItems = [
    { label: 'Games Played', value: stats.gamesPlayed || 0, icon: '🎮' },
    { label: 'Total Score', value: (stats.totalScore || 0).toLocaleString(), icon: '🏆' },
    { label: 'Best Score', value: (stats.bestScore || 0).toLocaleString(), icon: '⭐' },
    { label: 'Total Time', value: formatPlayTime(stats.totalTime || 0), icon: '⏱️' },
    { label: 'Enemies Defeated', value: stats.enemiesDefeated || 0, icon: '👹' },
    { label: 'Items Collected', value: stats.itemsCollected || 0, icon: '💎' },
    { label: 'Levels Completed', value: stats.levelsCompleted || 0, icon: '🏁' },
    { label: 'Perfect Levels', value: stats.perfectLevels || 0, icon: '💯' }
  ];

  return (
    <div className="stats-menu slide-in">
      <div className="menu-header">
        <h2>📊 STATISTICS</h2>
        <button className="back-button" onClick={onBack}>← Back</button>
      </div>

      <div className="stats-grid">
        {statItems.map((stat, i) => (
          <div key={stat.label} className="stat-card" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements preview */}
      <div className="achievements-preview">
        <h3>🏅 Recent Achievements</h3>
        <div className="achievement-list">
          {(stats.achievements || []).slice(-3).map((achievement, i) => (
            <div key={i} className="achievement-item">
              <span className="achievement-icon">🏅</span>
              <span className="achievement-name">{achievement}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// 👥 MENÚ DE CRÉDITOS
// ========================================

function CreditsMenu({ onBack }) {
  const credits = [
    { section: 'Development', people: ['Claude AI', 'Assistant Developer'] },
    { section: 'Game Design', people: ['Crash Worm Team', 'Level Designers'] },
    { section: 'Audio', people: ['Procedural Audio System', 'Sound Effects'] },
    { section: 'Graphics', people: ['Three.js Community', 'WebGL Developers'] },
    { section: 'Special Thanks', people: ['React Three Fiber', 'Rapier Physics', 'Tone.js'] }
  ];

  return (
    <div className="credits-menu slide-in">
      <div className="menu-header">
        <h2>👥 CREDITS</h2>
        <button className="back-button" onClick={onBack}>← Back</button>
      </div>

      <div className="credits-content">
        {credits.map((section, i) => (
          <div key={section.section} className="credit-section" style={{ animationDelay: `${i * 200}ms` }}>
            <h3>{section.section}</h3>
            <ul>
              {section.people.map((person, j) => (
                <li key={j}>{person}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="credits-footer">
          <p>🎮 Crash Worm 3D Adventure</p>
          <p>Built with React, Three.js, and WebGL</p>
          <p>© 2024 Crash Worm Team. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ⚙️ MODAL DE CONFIGURACIONES
// ========================================

function SettingsModal({ onClose }) {
  const { state, actions } = useGame();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          {/* Audio Settings */}
          <div className="setting-section">
            <h3>🔊 Audio</h3>
            <div className="setting-item">
              <label>Master Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={state.masterVolume}
                onChange={(e) => actions.setVolume('masterVolume', parseFloat(e.target.value))}
              />
              <span>{Math.round(state.masterVolume * 100)}%</span>
            </div>
            <div className="setting-item">
              <label>Music Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={state.musicVolume}
                onChange={(e) => actions.setVolume('musicVolume', parseFloat(e.target.value))}
              />
              <span>{Math.round(state.musicVolume * 100)}%</span>
            </div>
            <div className="setting-item">
              <label>SFX Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={state.sfxVolume}
                onChange={(e) => actions.setVolume('sfxVolume', parseFloat(e.target.value))}
              />
              <span>{Math.round(state.sfxVolume * 100)}%</span>
            </div>
          </div>

          {/* Game Settings */}
          <div className="setting-section">
            <h3>🎮 Game</h3>
            <div className="setting-item">
              <label>Difficulty</label>
              <select
                value={state.difficulty}
                onChange={(e) => actions.setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
                <option value="extreme">Extreme</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Player Name</label>
              <input
                type="text"
                value={state.playerName}
                onChange={(e) => actions.setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 📊 PANEL DE ESTADÍSTICAS RÁPIDAS
// ========================================

function QuickStatsPanel({ stats }) {
  return (
    <div className="quick-stats-panel">
      <h3>📊 Your Progress</h3>
      <div className="quick-stats">
        <div className="quick-stat">
          <span className="stat-value">{stats.bestScore?.toLocaleString() || '0'}</span>
          <span className="stat-label">Best Score</span>
        </div>
        <div className="quick-stat">
          <span className="stat-value">{stats.levelsCompleted || 0}</span>
          <span className="stat-label">Levels</span>
        </div>
        <div className="quick-stat">
          <span className="stat-value">{formatPlayTime(stats.totalTime || 0)}</span>
          <span className="stat-label">Time Played</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ℹ️ INFORMACIÓN DE VERSIÓN
// ========================================

function VersionInfo() {
  return (
    <div className="version-info">
      <span>v1.0.0</span>
      <span>|</span>
      <span>Built with ❤️</span>
    </div>
  );
}

// ========================================
// 🛠️ UTILIDADES
// ========================================

function formatPlayTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default MainMenu;
