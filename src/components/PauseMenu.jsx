// ========================================
// PAUSE MENU COMPONENT
// ========================================

export function PauseMenu({ onGameEvent }) {
  const [selectedOption, setSelectedOption] = useState(0);

  const menuOptions = [
    { label: 'Resume', action: () => onGameEvent({ type: 'resumeGame' }) },
    { label: 'Settings', action: () => console.log('Settings') },
    { label: 'Main Menu', action: () => onGameEvent({ type: 'backToMenu' }) }
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
    <div className="pause-menu">
      <div className="pause-overlay">
        <div className="pause-content">
          <h2>⏸️ PAUSED</h2>
          
          <nav className="pause-nav">
            {menuOptions.map((option, index) => (
              <button
                key={index}
                className={`pause-option ${index === selectedOption ? 'selected' : ''}`}
                onClick={option.action}
                onMouseEnter={() => setSelectedOption(index)}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}