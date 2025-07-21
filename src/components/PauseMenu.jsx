import React from 'react';

export function PauseMenu({ onResume, onMainMenu }) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '30px', color: '#00ffff' }}>
        PAUSED
      </h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <button
          onClick={onResume}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#00ff00',
            color: 'black',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Resume
        </button>
        <button
          onClick={onMainMenu}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Main Menu
        </button>
      </div>
      <div style={{ marginTop: '30px', fontSize: '16px', opacity: 0.7 }}>
        Press ESC to resume
      </div>
    </div>
  );
}