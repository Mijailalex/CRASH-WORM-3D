// ========================================
// LOADING SCREEN COMPONENT
// ========================================

export function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    const loadingSteps = [
      { progress: 20, text: 'Loading 3D models...' },
      { progress: 40, text: 'Initializing physics...' },
      { progress: 60, text: 'Setting up audio...' },
      { progress: 80, text: 'Generating world...' },
      { progress: 100, text: 'Ready!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        setProgress(step.progress);
        setLoadingText(step.text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 500);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <h1 className="game-title">🎮 Crash Worm 3D Adventure</h1>
        
        <div className="loading-bar-container">
          <div 
            className="loading-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="loading-text">{loadingText}</p>
        <p className="loading-percentage">{progress}%</p>
      </div>
    </div>
  );
}