# 🎮 Crash Worm 3D Adventure

![Crash Worm 3D](https://img.shields.io/badge/Version-1.0.0-brightgreen) ![React](https://img.shields.io/badge/React-18.2.0-blue) ![Three.js](https://img.shields.io/badge/Three.js-Latest-orange) ![Vite](https://img.shields.io/badge/Vite-5.0-purple)

**Una aventura épica de plataformas 3D con gráficos de última generación, física realista y audio espacial inmersivo.**

## 🌟 Características Principales

### 🎨 **Gráficos 3D de Nueva Generación**
- **Motor 3D**: Three.js con React Three Fiber
- **Renderizado**: WebGL con sombras en tiempo real
- **Efectos Visuales**: Partículas, post-procesamiento, bloom effects
- **Materiales**: PBR (Physically Based Rendering) con texturas procedurales
- **Iluminación**: Sistema de luces dinámico con múltiples fuentes

### 🎯 **Jugabilidad Estilo Crash Bandicoot**
- **Controles Precisos**: Movimiento 3D fluido con física realista
- **Plataformas**: Sistema de saltos con timing perfecto
- **Coleccionables**: Gemas, power-ups y secretos ocultos
- **Enemigos**: IA inteligente con patrones de comportamiento
- **Niveles**: Diseño vertical con desafíos progresivos

### 🎵 **Sistema de Audio Avanzado**
- **Música Procedural**: Generada dinámicamente con Tone.js
- **Efectos Espaciales**: Audio 3D posicional con Howler.js
- **Música Adaptativa**: Cambia según el estado del juego
- **SFX Premium**: Efectos de sonido sintéticos de alta calidad

### 🎮 **Características del Juego**
- **4 Dificultades**: Desde principiante hasta leyenda
- **Sistema de Progresión**: Niveles, experiencia y logros
- **Física Realista**: Gravedad, colisiones y momentum
- **UI Moderna**: Glassmorphism y efectos holográficos
- **Responsive**: Adaptable a diferentes dispositivos

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Navegador moderno con soporte WebGL 2.0

### 1. Clonar e Instalar
```bash
# Ya tienes el proyecto configurado en:
cd crash-worm-3d

# Verificar dependencias instaladas
npm list --depth=0
```

### 2. Estructura del Proyecto
```
crash-worm-3d/
├── src/
│   ├── components/
│   │   ├── AudioManager.jsx      # Sistema de audio
│   │   ├── GameWorld.jsx         # Mundo 3D principal
│   │   ├── GameUI.jsx            # Interfaz de usuario
│   │   ├── LoadingScreen.jsx     # Pantalla de carga
│   │   └── MainMenu.jsx          # Menú principal
│   ├── context/
│   │   └── GameContext.jsx       # Estado global del juego
│   ├── styles/
│   │   └── globals.css           # Estilos globales premium
│   ├── App.jsx                   # Componente principal
│   └── main.jsx                  # Punto de entrada
├── public/
│   ├── fonts/                    # Fuentes 3D para Three.js
│   └── index.html
└── package.json
```

### 3. Ejecutar el Juego
```bash
# Desarrollo
npm run dev

# Construir para producción
npm run build

# Preview de producción
npm run preview
```

## 🎮 Controles del Juego

### Controles Principales
- **WASD** / **Flechas**: Movimiento 3D
- **Espacio**: Saltar
- **Shift**: Correr/Dash
- **ESC**: Pausar juego
- **M**: Toggle audio
- **F11**: Pantalla completa

### Controles Avanzados
- **Clic izquierdo**: Interactuar (en menús)
- **Tab**: Alternar HUD
- **F**: Modo debug (en desarrollo)

## 🛠 Tecnologías Utilizadas

### Core Framework
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "vite": "^5.0.0"
}
```

### Gráficos 3D
```json
{
  "three": "latest",
  "@react-three/fiber": "latest",
  "@react-three/drei": "latest",
  "@react-three/rapier": "latest"
}
```

### Física y Animaciones
```json
{
  "matter-js": "latest",
  "cannon-es": "latest",
  "framer-motion": "latest",
  "lottie-web": "latest",
  "lottie-react": "latest"
}
```

### Audio
```json
{
  "tone": "latest",
  "howler": "latest",
  "standardized-audio-context": "latest"
}
```

### UI y Styling
```json
{
  "styled-components": "latest",
  "tailwindcss": "latest",
  "@mui/material": "latest",
  "@emotion/react": "latest",
  "@emotion/styled": "latest"
}
```

### Utilidades
```json
{
  "lodash": "latest",
  "mathjs": "latest",
  "uuid": "latest",
  "moment": "latest",
  "axios": "latest"
}
```

## 🎯 Gameplay y Mecánicas

### Objetivos del Juego
1. **Recolectar Gemas**: Aumenta tu puntuación y desbloquea habilidades
2. **Derrotar Enemigos**: Completa objetivos para avanzar de nivel
3. **Explorar Mundos**: Descubre secretos en cada bioma
4. **Sobrevivir**: Administra tu salud y vidas sabiamente

### Sistema de Dificultades

| Dificultad | Vidas | Enemigos | Velocidad | EXP Bonus |
|------------|-------|----------|-----------|-----------|
| **Explorador Cósmico** | 5 | 8 | 0.8x | +25 |
| **Guerrero Galáctico** | 3 | 12 | 1.2x | +40 |
| **Maestro del Cosmos** | 2 | 15 | 1.6x | +60 |
| **Leyenda Infinita** | 1 | 20 | 2.0x | +100 |

### Power-ups y Habilidades
- **Salto Doble**: Permite un segundo salto en el aire
- **Dash Cósmico**: Movimiento rápido con invulnerabilidad temporal
- **Escudo de Energía**: Protección contra daño
- **Magnetismo**: Atrae gemas automáticamente
- **Visión Cósmica**: Revela secretos ocultos

## 🎨 Personalización Visual

### Configuración de Gráficos
```javascript
// En GameContext.jsx
const GRAPHICS_PRESETS = {
  low: {
    shadows: false,
    particles: false,
    postProcessing: false,
    renderScale: 0.75
  },
  medium: {
    shadows: true,
    particles: true,
    postProcessing: false,
    renderScale: 1.0
  },
  high: {
    shadows: true,
    particles: true,
    postProcessing: true,
    renderScale: 1.0
  },
  ultra: {
    shadows: true,
    particles: true,
    postProcessing: true,
    renderScale: 1.25,
    antialiasing: true
  }
};
```

### Temas de Color
El juego incluye múltiples temas de color que se adaptan dinámicamente:
- **Cósmico**: Azules y cianes
- **Fuego**: Naranjas y dorados
- **Natura**: Verdes y marrones
- **Void**: Púrpuras y magentas

## 🔧 Desarrollo y Modificación

### Agregar Nuevos Niveles
```javascript
// En GameWorld.jsx
const createLevel = (levelData) => {
  return {
    platforms: generatePlatforms(levelData.layout),
    enemies: spawnEnemies(levelData.difficulty),
    collectibles: placeCollectibles(levelData.gems),
    theme: levelData.biome
  };
};
```

### Crear Nuevos Enemigos
```javascript
// Ejemplo de enemigo personalizado
const CustomEnemy = ({ position, behavior }) => {
  const [ai, setAI] = useState(behavior);
  
  useFrame(() => {
    // Lógica de IA personalizada
    updateEnemyBehavior(ai, playerPosition);
  });
  
  return (
    <mesh position={position}>
      <sphereGeometry args={[1]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};
```

### Sistema de Logros
```javascript
// En GameContext.jsx
const ACHIEVEMENTS = {
  firstJump: {
    name: "Primer Salto",
    description: "Realiza tu primer salto",
    icon: "🚀",
    points: 10
  },
  gemCollector: {
    name: "Coleccionista",
    description: "Recolecta 100 gemas",
    icon: "💎",
    points: 50
  },
  speedRunner: {
    name: "Corredor Cósmico",
    description: "Completa un nivel en menos de 2 minutos",
    icon: "⚡",
    points: 100
  }
};
```

## 📊 Rendimiento y Optimización

### Configuraciones Recomendadas

#### PC Gaming (Alta Gama)
- **Calidad**: Ultra
- **Resolución**: 1920x1080 o superior
- **FPS Target**: 60 FPS
- **Memoria**: 8GB RAM mínimo

#### PC Estándar
- **Calidad**: Alta/Media
- **Resolución**: 1366x768
- **FPS Target**: 30-60 FPS
- **Memoria**: 4GB RAM mínimo

#### Dispositivos Móviles
- **Calidad**: Baja/Media
- **Renderizado**: Adaptativo
- **Controles**: Touch optimizado
- **Memoria**: 2GB RAM mínimo

### Optimizaciones Implementadas
- **Culling Frustum**: Solo renderiza objetos visibles
- **LOD System**: Nivel de detalle dinámico
- **Object Pooling**: Reutilización de objetos
- **Texture Compression**: Compresión automática
- **Shader Optimization**: Shaders optimizados por dispositivo

## 🐛 Solución de Problemas

### Problemas Comunes

#### El juego no carga
```bash
# Verificar dependencias
npm install

# Limpiar cache
npm run build --clean
```

#### Audio no funciona
- Verificar que el navegador permite autoplay
- Hacer clic en cualquier parte para activar contexto de audio
- Verificar configuración de audio del sistema

#### Rendimiento bajo
- Reducir calidad gráfica en configuraciones
- Cerrar otras aplicaciones
- Verificar drivers gráficos actualizados

#### Controles no responden
- Verificar que la ventana del juego esté enfocada
- Revisar configuración de controles
- Probar en modo incógnito del navegador

## 🤝 Contribución y Desarrollo

### Setup de Desarrollo
```bash
# Instalar dependencias de desarrollo
npm install -D eslint prettier typescript

# Ejecutar linter
npm run lint

# Formatear código
npm run format

# Ejecutar tests
npm run test
```

### Estructura de Commits
```
feat: nueva característica
fix: corrección de bug
docs: actualización de documentación
style: cambios de formato
refactor: refactorización de código
test: agregar tests
chore: mantenimiento
```

## 📄 Licencia y Créditos

### Desarrollado con
- ⚛️ **React** + **Three.js** (React Three Fiber)
- 🎨 **Framer Motion** + **Styled Components**
- 🎵 **Tone.js** + **Howler.js**
- 🏗️ **Vite** + **Modern JavaScript**
- ✨ **Passion & Innovation**

### Créditos Especiales
- **Inspiración**: Crash Bandicoot series (Naughty Dog)
- **Música**: Sistema procedural con Tone.js
- **Gráficos**: Renderizado 3D con Three.js
- **Física**: Matter.js para mecánicas realistas

## 🚀 Próximas Características

### Versión 1.1.0
- [ ] Multijugador local
- [ ] Editor de niveles
- [ ] Más biomas (Espacio, Cyberpunk)
- [ ] Sistema de mods
- [ ] Replays y compartir puntuaciones

### Versión 1.2.0
- [ ] Multijugador online
- [ ] Campañas personalizadas
- [ ] VR Support
- [ ] Mobile optimizations
- [ ] Cloud saves

## 📞 Soporte

### Recursos
- **Documentación**: Este README
- **Issues**: Reportar bugs en GitHub
- **Discussions**: Preguntas y sugerencias
- **Wiki**: Guías avanzadas y tutorials

### Contacto
- **Email**: support@crashworm3d.com
- **Discord**: CrashWorm3D Community
- **Twitter**: @CrashWorm3D

---

**¡Gracias por jugar Crash Worm 3D Adventure! 🎮✨**

> "La aventura cósmica más épica jamás creada en tu navegador"