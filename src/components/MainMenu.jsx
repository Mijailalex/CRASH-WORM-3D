// ========================================
// MAIN MENU COMPONENT
// ========================================

export function MainMenu({ onGameEvent }) {
  const [selectedOption, setSelectedOption] = useState(0);

  const menuOptions = [
    { label: 'Start Game', action: () => onGameEvent({ type: 'startGame' }) },
    { label: 'Settings', action: () => console.log('Settings') },
    { label: 'Credits', action: () => console.log('Credits') },
    { label: 'Exit', action: () => window.close() }
  ];

  const handleKeyPress = (event) => {
    switch (event.key) {
      case 'ArrowUp':
        setSelectedOption(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        setSelectedOption(prev => Math.min(menuOptions.length - 1, prev + 1));
        break;
      case 'Enter':
        menuOptions[selectedOption].action();
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedOption]);

  return (
    <div className="main-menu">
      <div className="menu-background">
        <div className="stars"></div>
        <div className="nebula"></div>
      </div>
      
      <div className="menu-content">
        <h1 className="game-title">
          🎮 Crash Worm 3D Adventure
        </h1>
        
        <nav className="menu-nav">
          {menuOptions.map((option, index) => (
            <button
              key={index}
              className={`menu-option ${index === selectedOption ? 'selected' : ''}`}
              onClick={option.action}
              onMouseEnter={() => setSelectedOption(index)}
            >
              {option.label}
            </button>
          ))}
        </nav>
        
        <div className="menu-info">
          <p>Use ↑↓ arrows and Enter to navigate</p>
          <p>WASD to move • Space to jump • ESC to pause</p>
        </div>
      </div>
    </div>
  );
}
