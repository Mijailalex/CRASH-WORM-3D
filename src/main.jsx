import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { GameProvider } from './context/GameContext.jsx'
import './styles/globals.css'

// ========================================
// CONFIGURACIÓN INICIAL DEL JUEGO
// ========================================

// Configurar Three.js para mejor rendimiento
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

// Extender Three.js con componentes adicionales si es necesario
extend(THREE)

// Configuración global de rendimiento
if (typeof window !== 'undefined') {
  // Optimizaciones de rendimiento para el navegador
  window.addEventListener('load', () => {
    // Precargar recursos críticos
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = '/fonts/helvetiker_regular.typeface.json'
    document.head.appendChild(link)
  })

  // Gestión de errores global para Three.js
  window.addEventListener('webglcontextlost', (event) => {
    console.warn('WebGL context lost. Attempting to restore...')
    event.preventDefault()
  })

  window.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored successfully')
    // Reinicializar el juego si es necesario
  })

  // Detectar capacidades del dispositivo
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  
  if (!gl) {
    console.error('WebGL not supported')
    // Mostrar mensaje de error al usuario
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #0a0e27, #2d4a7a);
        color: white;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem; color: #FF6B35;">
          🎮 WebGL No Soportado
        </h1>
        <p style="font-size: 1.2rem; margin-bottom: 2rem; max-width: 600px;">
          Tu navegador no soporta WebGL, que es necesario para ejecutar Crash Worm 3D.
          Por favor, actualiza tu navegador o habilita WebGL en la configuración.
        </p>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #00FFFF; margin-bottom: 1rem;">Navegadores Recomendados:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>🌐 Chrome 80+ (Recomendado)</li>
            <li>🦊 Firefox 75+</li>
            <li>🧭 Safari 14+</li>
            <li>⚡ Edge 80+</li>
          </ul>
        </div>
      </div>
    `
    return
  }

  // Detectar dispositivo móvil para optimizaciones
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  if (isMobile) {
    // Configuraciones específicas para móviles
    document.documentElement.style.setProperty('--mobile-optimization', 'true')
    
    // Prevenir zoom en dispositivos móviles
    const viewport = document.querySelector('meta[name=viewport]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    }
    
    // Ocultar barra de direcciones en móviles
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.scrollTo(0, 1)
      }, 100)
    })
  }

  // Configurar gestión de memoria
  const memoryInfo = (performance as any).memory
  if (memoryInfo) {
    const memoryLimit = memoryInfo.jsHeapSizeLimit
    const memoryUsed = memoryInfo.usedJSHeapSize
    
    console.log(`Memory Info: ${(memoryUsed / 1048576).toFixed(2)}MB / ${(memoryLimit / 1048576).toFixed(2)}MB`)
    
    // Advertir si la memoria es limitada
    if (memoryLimit < 1048576 * 512) { // Menos de 512MB
      console.warn('Limited memory detected. Enabling performance optimizations.')
      document.documentElement.style.setProperty('--performance-mode', 'low')
    }
  }

  // Configurar detección de FPS
  let fps = 60
  let lastFrameTime = performance.now()
  
  const updateFPS = () => {
    const currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTime
    fps = 1000 / deltaTime
    lastFrameTime = currentTime
    
    // Ajustar calidad automáticamente basado en FPS
    if (fps < 30) {
      console.warn('Low FPS detected. Consider reducing graphics quality.')
      document.documentElement.style.setProperty('--auto-quality', 'low')
    } else if (fps > 55) {
      document.documentElement.style.setProperty('--auto-quality', 'high')
    }
    
    requestAnimationFrame(updateFPS)
  }
  
  requestAnimationFrame(updateFPS)

  // Configurar audio automáticamente
  const configureAudio = async () => {
    try {
      // Verificar soporte de Web Audio API
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) {
        console.warn('Web Audio API not supported')
        return
      }

      // Configurar audio por defecto
      const audioContext = new AudioContext()
      
      // Reanudar contexto de audio automáticamente cuando sea posible
      document.addEventListener('click', async () => {
        if (audioContext.state === 'suspended') {
          await audioContext.resume()
          console.log('Audio context resumed')
        }
      }, { once: true })

    } catch (error) {
      console.warn('Error configuring audio:', error)
    }
  }

  configureAudio()

  // Configurar modo de pantalla completa
  const setupFullscreenAPI = () => {
    const fullscreenAPI = {
      request: document.documentElement.requestFullscreen ||
               (document.documentElement as any).webkitRequestFullscreen ||
               (document.documentElement as any).mozRequestFullScreen ||
               (document.documentElement as any).msRequestFullscreen,
      exit: document.exitFullscreen ||
            (document as any).webkitExitFullscreen ||
            (document as any).mozCancelFullScreen ||
            (document as any).msExitFullscreen,
      element: document.fullscreenElement ||
               (document as any).webkitFullscreenElement ||
               (document as any).mozFullScreenElement ||
               (document as any).msFullscreenElement
    }

    // Exposer API global para el juego
    ;(window as any).gameFullscreenAPI = fullscreenAPI
  }

  setupFullscreenAPI()

  // Configurar manejo de visibilidad de página
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('Game paused due to tab visibility')
      // El juego se pausará automáticamente via GameContext
    } else {
      console.log('Game resumed')
    }
  })

  // Configurar prevención de comportamientos por defecto del navegador
  document.addEventListener('contextmenu', (e) => e.preventDefault())
  document.addEventListener('selectstart', (e) => e.preventDefault())
  document.addEventListener('dragstart', (e) => e.preventDefault())

  // Configurar manejo de errores de JavaScript
  window.addEventListener('error', (event) => {
    console.error('Game error:', event.error)
    // Aquí podrías enviar errores a un servicio de analytics
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    event.preventDefault()
  })
}

// ========================================
// CONFIGURACIÓN DE DESARROLLO
// ========================================

// Herramientas de desarrollo solo en modo dev
if (import.meta.env.DEV) {
  // Configurar React DevTools
  if (typeof window !== 'undefined') {
    ;(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {}
    }
  }

  // Configurar herramientas de desarrollo de Three.js
  import('./utils/devTools.js').then((devTools) => {
    if (devTools.default) {
      devTools.default.init()
    }
  }).catch(() => {
    // DevTools opcionales, no bloquear si fallan
  })
}

// ========================================
// RENDERIZADO DE LA APLICACIÓN
// ========================================

// Función para renderizar la aplicación
const renderApp = () => {
  const rootElement = document.getElementById('root')
  
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <React.StrictMode>
      <GameProvider>
        <App />
      </GameProvider>
    </React.StrictMode>
  )

  // Configurar hot reload en desarrollo
  if (import.meta.env.DEV && import.meta.hot) {
    import.meta.hot.accept('./App.jsx', (newApp) => {
      if (newApp) {
        root.render(
          <React.StrictMode>
            <GameProvider>
              <newApp.default />
            </GameProvider>
          </React.StrictMode>
        )
      }
    })
  }
}

// ========================================
// INICIALIZACIÓN
// ========================================

// Verificar que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp)
} else {
  renderApp()
}

// Configurar información de versión
if (typeof window !== 'undefined') {
  ;(window as any).CRASH_WORM_3D = {
    version: '1.0.0',
    build: import.meta.env.MODE,
    timestamp: new Date().toISOString(),
    author: 'Game Development Team'
  }

  console.log(`
🎮 Crash Worm 3D Adventure v1.0.0
🚀 Built with React + Three.js + Tone.js
✨ Premium 3D gaming experience

Controls:
- WASD/Arrows: Movement
- Space: Jump  
- Shift: Run
- ESC: Pause
- F11: Fullscreen

Enjoy the adventure! 🌌
  `)
}

// Exportar función de limpieza para testing
export const cleanup = () => {
  // Cleanup de recursos si es necesario
  if (typeof window !== 'undefined') {
    // Limpiar listeners
    window.removeEventListener('error', () => {})
    window.removeEventListener('unhandledrejection', () => {})
  }
}