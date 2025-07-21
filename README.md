# 🎮 Crash Worm 3D Adventure

<div align="center">

![Crash Worm 3D Logo](./public/icons/icon-192x192.png)

**Juego de plataformas 3D multijugador con gráficos avanzados y física realista**

[![Build Status](https://github.com/crash-worm-3d/client/workflows/CI/badge.svg)](https://github.com/crash-worm-3d/client/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/crash-worm-3d/client/releases)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

[🎯 Demo Live](#) • [📖 Documentación](./docs/) • [🐛 Reportar Bug](https://github.com/crash-worm-3d/client/issues) • [💡 Request Feature](https://github.com/crash-worm-3d/client/issues)

</div>

---

## 📋 Tabla de Contenidos

- [✨ Características](#-características)
- [🏗️ Arquitectura](#️-arquitectura)
- [🚀 Instalación Rápida](#-instalación-rápida)
- [🎮 Guía de Juego](#-guía-de-juego)
- [🛠️ Desarrollo](#️-desarrollo)
- [🐳 Docker](#-docker)
- [🔒 Seguridad](#-seguridad)
- [📊 Performance](#-performance)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [📚 Documentación](#-documentación)
- [🤝 Contribuir](#-contribuir)
- [📄 Licencia](#-licencia)

---

## ✨ Características

### 🎮 **Gameplay Avanzado**
- **Mundo 3D Inmersivo**: Exploración libre en entornos 3D detallados
- **Física Realista**: Sistema de física avanzado con colisiones precisas
- **Multijugador**: Hasta 16 jugadores simultáneos
- **Modos de Juego**: Classic, Competitive, Survival, Private Rooms
- **Sistema de Logros**: Tracking de progreso y recompensas
- **Inventario Dinámico**: Gestión de items y power-ups

### 🎨 **Gráficos y Audio**
- **WebGL 2.0**: Renderizado 3D de alta performance
- **Shaders Personalizados**: Efectos visuales avanzados
- **Iluminación Dinámica**: Sombras y reflejos en tiempo real
- **Partículas**: Sistema de efectos de partículas optimizado
- **Audio Espacial**: Sonido 3D posicional
- **Música Adaptiva**: Soundtrack que se adapta al gameplay

### 🌐 **Tecnologías Web Modernas**
- **Progressive Web App (PWA)**: Instalable en cualquier dispositivo
- **Offline Support**: Juego disponible sin conexión
- **Cross-Platform**: Compatible con desktop, mobile y tablets
- **Responsive Design**: Se adapta a cualquier tamaño de pantalla

### 🛡️ **Seguridad y Performance**
- **Anti-Cheat System**: Detección de trampas en tiempo real
- **Rate Limiting**: Protección contra spam y ataques
- **Cifrado de Datos**: Comunicaciones seguras
- **Cache Inteligente**: Optimización de carga y performance
- **Compression**: Assets comprimidos para carga rápida

---

## 🏗️ Arquitectura

```
crash-worm-3d/
├── 🎨 Frontend (React + Three.js + Vite)
│   ├── 🧠 Core Engine (GameEngine.js)
│   ├── 🎮 Game Systems (Physics, AI, Audio)
│   ├── 🖼️ Components (Player, Enemies, UI)
│   └── 🔧 Utils (Hooks, Context, Config)
│
├── 🔙 Backend (Node.js + Express + WebSocket)
│   ├── 🌐 REST API (Authentication, Game Data)
│   ├── 🔌 WebSocket Server (Real-time Multiplayer)
│   ├── 🛡️ Security (Anti-cheat, Rate Limiting)
│   └── 📊 Analytics (Metrics, Logging)
│
├── 🗄️ Database (PostgreSQL + Redis)
│   ├── 👥 User Management
│   ├── 🎮 Game State Persistence
│   ├── 📈 Analytics Data
│   └── ⚡ Session Cache
│
└── 🐳 Infrastructure (Docker + Nginx)
    ├── 🌐 Load Balancing
    ├── 📊 Monitoring (Prometheus + Grafana)
    ├── 🔒 SSL/TLS Termination
    └── 📋 Health Checks
```

### 🏛️ **Patrones de Diseño Utilizados**

- **Entity-Component-System (ECS)**: Arquitectura modular para game objects
- **Observer Pattern**: Sistema de eventos desacoplado
- **State Machine**: Gestión de estados del juego
- **Object Pool**: Optimización de memoria para objetos reutilizables
- **Command Pattern**: Sistema de inputs y acciones
- **Strategy Pattern**: Algoritmos intercambiables (AI, Physics)

---

## 🚀 Instalación Rápida

### 📋 **Prerequisitos**

```bash
# Verificar versiones requeridas
node --version  # >= 18.0.0
npm --version   # >= 8.0.0
git --version   # >= 2.0.0
```

### ⚡ **Instalación Express (5 minutos)**

```bash
# 1. Clonar el repositorio
git clone https://github.com/crash-worm-3d/client.git
cd crash-worm-3d

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 4. Iniciar desarrollo
npm run dev

# 5. Iniciar servidor (terminal separada)
npm run server:dev
```

**🎉 ¡Listo! El juego estará disponible en http://localhost:3000**

### 🔧 **Configuración Detallada**

<details>
<summary><strong>📝 Variables de Entorno Importantes</strong></summary>

```bash
# .env
NODE_ENV=development
VITE_PORT=3000
VITE_API_URL=http://localhost:8080
VITE_WEBSOCKET_URL=ws://localhost:8081
VITE_ENABLE_MULTIPLAYER=true
VITE_ENABLE_ANALYTICS=true
VITE_LOG_LEVEL=debug
```
</details>

<details>
<summary><strong>🎮 Configuración del Juego</strong></summary>

```javascript
// src/data/gameConfig.js
export const gameConfig = {
  graphics: {
    quality: 'auto', // 'low' | 'medium' | 'high' | 'auto'
    shadows: true,
    antialiasing: true,
    postprocessing: true
  },
  audio: {
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    spatialAudio: true
  },
  controls: {
    sensitivity: 1.0,
    invertY: false,
    gamepadSupport: true
  },
  network: {
    maxPlayers: 16,
    tickRate: 20,
    timeout: 30000
  }
};
```
</details>

---

## 🎮 Guía de Juego

### 🎯 **Objetivo**
Navega por mundos 3D desafiantes, recolecta power-ups, evita obstáculos y compite con otros jugadores para obtener la mayor puntuación.

### 🕹️ **Controles**

| Acción | Teclado | Gamepad | Móvil |
|--------|---------|---------|-------|
| Mover | WASD | Stick Izq | Virtual Joystick |
| Saltar | Espacio | A/X | Botón Salto |
| Correr | Shift | RT/R2 | Mantener movimiento |
| Cámara | Mouse | Stick Der | Touch + Drag |
| Inventario | I | Select | Menú |
| Pausa | Esc | Start | Botón Pausa |

### 🎊 **Modos de Juego**

1. **🏃‍♂️ Classic**: Modo historia individual
2. **🏆 Competitive**: Ranking multijugador
3. **⚔️ Survival**: Ondas infinitas de enemigos
4. **🏠 Private**: Salas privadas con amigos
5. **⚡ Speed Run**: Contrarreloj

### 💎 **Power-ups**

- **🚀 Speed Boost**: Aumenta velocidad temporalmente
- **⭐ Star Power**: Invencibilidad por 10 segundos
- **🔋 Extra Life**: Vida adicional
- **💰 Score Multiplier**: Duplica puntos por 30 segundos
- **🛡️ Shield**: Protección contra un golpe

---

## 🛠️ Desarrollo

### 📁 **Estructura del Proyecto**

```
src/
├── 🧠 core/                 # Motor del juego y sistemas centrales
│   ├── GameEngine.js        # Motor principal
│   ├── AdvancedSystems.js   # Física, IA, Procedural
│   ├── PerformanceAndEffects.js  # Optimización y VFX
│   └── SecurityNetworking.js     # Seguridad y red
├── 🎮 components/          # Componentes React del juego
│   ├── Player.jsx          # Lógica del jugador
│   ├── GameWorld.jsx       # Mundo del juego
│   └── GameUI.jsx          # Interfaz de usuario
├── 🪝 hooks/              # Custom React hooks
├── 🔧 utils/              # Utilidades y helpers
├── 🎨 styles/             # Estilos CSS globales
└── 📊 data/               # Configuraciones y datos
```

### 🔧 **Comandos de Desarrollo**

```bash
# Desarrollo
npm run dev                 # Iniciar cliente en desarrollo
npm run server:dev         # Iniciar servidor en desarrollo
npm run full:dev           # Iniciar cliente + servidor

# Build
npm run build              # Build de producción
npm run build:analyze      # Análisis del bundle
npm run preview           # Preview del build

# Testing
npm test                  # Tests unitarios
npm run test:watch        # Tests en modo watch
npm run test:coverage     # Coverage de tests
npm run test:e2e          # Tests end-to-end

# Calidad de código
npm run lint              # Linting con ESLint
npm run lint:fix          # Fix automático
npm run format            # Formatear con Prettier
npm run type-check        # Verificar tipos TypeScript

# Mantenimiento
npm run deps:update       # Actualizar dependencias
npm run security:audit    # Auditoría de seguridad
npm run clean             # Limpiar cache y builds
```

### 🎯 **Scripts de Desarrollo Personalizados**

<details>
<summary><strong>⚙️ Configuración del Motor de Juego</strong></summary>

```javascript
// Ejemplo de configuración del GameEngine
import { GameEngine } from '@/core/GameEngine';
import { AdvancedPhysicsSystem } from '@/core/AdvancedSystems';

const engine = new GameEngine({
  debug: true,
  fps: 60,
  enablePhysics: true,
  enableAI: true,
  enableNetworking: true
});

// Registrar sistemas
engine.registerSystem(new AdvancedPhysicsSystem());
engine.registerSystem(new AISystem());
engine.registerSystem(new NetworkingSystem());

// Inicializar
await engine.initialize();
engine.start();
```
</details>

<details>
<summary><strong>🎮 Creando Nuevos Componentes de Juego</strong></summary>

```javascript
// Ejemplo de componente personalizado
import { useGameEngine } from '@/hooks/useGameEngine';

export function CustomGameObject({ position, rotation }) {
  const { engine, scene } = useGameEngine();
  
  useEffect(() => {
    const mesh = createCustomMesh();
    scene.add(mesh);
    
    return () => scene.remove(mesh);
  }, []);
  
  return null; // Componente lógico, sin render visual
}
```
</details>

### 📊 **Performance Guidelines**

- **🎯 Target**: 60 FPS en dispositivos modernos
- **📱 Mobile**: 30 FPS mínimo en dispositivos móviles
- **🧠 Memory**: < 512MB uso de RAM
- **📦 Bundle Size**: < 2MB inicial, < 10MB total
- **⚡ Load Time**: < 3s primera carga

---

## 🐳 Docker

### 🚀 **Desarrollo con Docker**

```bash
# Iniciar todos los servicios
docker-compose up -d

# Solo servicios esenciales
docker-compose up frontend backend postgres redis

# Con hot reload para desarrollo
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Ver logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### 🏭 **Producción**

```bash
# Build de producción
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy con escalamiento
docker-compose up -d --scale backend=3 --scale websocket=2

# Monitoreo
docker-compose exec prometheus curl localhost:9090/targets
```

### 📊 **Servicios Incluidos**

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 80, 443 | Cliente React + Nginx |
| Backend API | 8080 | API REST del juego |
| WebSocket | 8081 | Servidor multijugador |
| PostgreSQL | 5432 | Base de datos principal |
| Redis | 6379 | Cache y sesiones |
| Prometheus | 9090 | Métricas y monitoreo |
| Grafana | 3001 | Dashboards |

---

## 🔒 Seguridad

### 🛡️ **Medidas de Seguridad Implementadas**

- **🔐 Authentication**: JWT + Session management
- **🛡️ Anti-Cheat**: Validación server-side de movimientos
- **🚫 Rate Limiting**: Protección contra spam/DDoS
- **🔍 Input Validation**: Sanitización de todas las entradas
- **🔒 HTTPS/WSS**: Comunicaciones cifradas
- **🍪 Secure Cookies**: HttpOnly, Secure, SameSite
- **📋 CSP Headers**: Content Security Policy estricta
- **🔍 CORS**: Configuración restrictiva de orígenes

### 🚨 **Sistema Anti-Cheat**

```javascript
// Ejemplo de validación de movimiento
const MAX_SPEED = 150; // unidades por segundo
const MAX_ACCELERATION = 50;

function validatePlayerMovement(oldPos, newPos, deltaTime) {
  const distance = oldPos.distanceTo(newPos);
  const speed = distance / deltaTime;
  
  if (speed > MAX_SPEED) {
    // Posible speed hack detectado
    flagSuspiciousActivity(playerId, 'speed_violation', { speed });
    return false;
  }
  
  return true;
}
```

### 🔧 **Configuración de Seguridad**

<details>
<summary><strong>📋 Headers de Seguridad</strong></summary>

```nginx
# Nginx security headers
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';" always;
```
</details>

---

## 📊 Performance

### ⚡ **Optimizaciones Implementadas**

- **🎨 Object Pooling**: Reutilización de objetos 3D
- **📦 Asset Bundling**: Carga optimizada de recursos
- **🔄 Level-of-Detail (LOD)**: Modelos adaptativos por distancia
- **🗜️ Texture Compression**: Texturas optimizadas por plataforma
- **⚡ Frustum Culling**: Renderizado selectivo
- **🧠 Spatial Partitioning**: Optimización de colisiones
- **📱 Adaptive Quality**: Ajuste automático de calidad gráfica

### 📈 **Monitoreo de Performance**

```javascript
// Performance monitor integrado
const performanceMonitor = new PerformanceManager({
  targetFPS: 60,
  enableProfiling: true,
  reportInterval: 5000
});

// Métricas disponibles
performanceMonitor.getStats(); // FPS, memoria, draw calls, etc.
```

### 🔍 **Debug Tools**

- **📊 FPS Counter**: Contador de frames por segundo
- **🧠 Memory Usage**: Monitor de uso de memoria
- **🎮 Debug Panel**: Panel de debugging in-game
- **📈 Performance Graphs**: Gráficos de rendimiento en tiempo real
- **🔧 Inspector Tools**: Herramientas de inspección de objetos

---

## 🧪 Testing

### 🎯 **Estrategia de Testing**

```bash
# Tests unitarios
npm test                    # Jest + Testing Library
npm run test:watch          # Modo watch
npm run test:coverage       # Con coverage

# Tests de integración
npm run test:integration    # Tests de sistemas

# Tests end-to-end
npm run test:e2e           # Playwright
npm run test:e2e:ui        # Con interfaz visual

# Tests de performance
npm run test:perf          # Benchmarks de rendimiento
```

### 📋 **Cobertura de Tests**

- **🎮 Game Logic**: Tests de mecánicas de juego
- **🌐 Network**: Tests de comunicación cliente-servidor
- **🔒 Security**: Tests de validación y anti-cheat
- **🎨 Rendering**: Tests de sistema de renderizado
- **📱 UI/UX**: Tests de interfaz de usuario

### 🤖 **Tests Automatizados**

```yaml
# GitHub Actions workflow
- name: Run Tests
  run: |
    npm run test:coverage
    npm run test:e2e
    npm run security:audit
```

---

## 🚀 Deployment

### 🌐 **Opciones de Deployment**

1. **🐳 Docker**: Containerización completa
2. **☁️ Cloud**: AWS, Google Cloud, Azure
3. **🔄 CI/CD**: GitHub Actions, GitLab CI
4. **📦 Static**: Netlify, Vercel (solo frontend)
5. **🏠 Self-hosted**: VPS, Dedicated Server

### ⚙️ **Deployment con Docker**

```bash
# Build de producción
docker build -t crashworm3d:latest .

# Deploy con Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Scaling horizontal
docker-compose up -d --scale backend=3
```

### 🔄 **CI/CD Pipeline**

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install & Test
        run: |
          npm ci
          npm run test:coverage
          npm run build
      
      - name: Deploy
        run: |
          docker build -t $IMAGE_NAME .
          docker push $IMAGE_NAME
```

### 📊 **Monitoring en Producción**

- **🔍 Health Checks**: `/health` endpoint
- **📈 Metrics**: Prometheus + Grafana
- **🚨 Alerting**: Alerts automáticas
- **📋 Logging**: Structured logging con ELK stack
- **🔍 Tracing**: APM con Jaeger/OpenTelemetry

---

## 📚 Documentación

### 📖 **Documentación Adicional**

- [🎮 Game Design Document](./docs/GAME_DESIGN.md)
- [🏗️ Architecture Guide](./docs/ARCHITECTURE.md)
- [🔌 API Reference](./docs/API.md)
- [👨‍💻 Developer Guide](./docs/DEVELOPER_GUIDE.md)
- [🚀 Deployment Guide](./docs/DEPLOYMENT.md)
- [🔒 Security Guide](./docs/SECURITY.md)
- [🧪 Testing Guide](./docs/TESTING.md)

### 📝 **Tutoriales**

- [🎯 Getting Started Tutorial](./docs/tutorials/getting-started.md)
- [🎮 Creating Custom Game Objects](./docs/tutorials/custom-objects.md)
- [🔌 Multiplayer Setup](./docs/tutorials/multiplayer.md)
- [🎨 Custom Shaders](./docs/tutorials/shaders.md)
- [📊 Performance Optimization](./docs/tutorials/performance.md)

### 🎥 **Videos y Recursos**

- [📹 Video Tutorials](https://youtube.com/crashworm3d)
- [🎮 Live Demos](https://crashworm3d.com/demos)
- [📖 Knowledge Base](https://docs.crashworm3d.com)
- [💬 Community Forum](https://forum.crashworm3d.com)

---

## 🤝 Contribuir

### 🎯 **Cómo Contribuir**

1. **🍴 Fork** el repositorio
2. **🌿 Crear** una rama feature (`git checkout -b feature/amazing-feature`)
3. **💻 Commit** los cambios (`git commit -m 'Add amazing feature'`)
4. **📤 Push** a la rama (`git push origin feature/amazing-feature`)
5. **🔄 Abrir** un Pull Request

### 📋 **Guidelines de Contribución**

- **✅ Tests**: Todos los nuevos features deben incluir tests
- **📝 Documentación**: Actualizar documentación según corresponda
- **🎨 Code Style**: Seguir las convenciones existentes (ESLint/Prettier)
- **🔍 Review**: Todo código debe pasar code review
- **📊 Performance**: Considerar impacto en performance

### 🐛 **Reportando Bugs**

```markdown
**Descripción del Bug**
Una descripción clara del bug

**Pasos para Reproducir**
1. Ir a '...'
2. Click en '...'
3. Ver error

**Comportamiento Esperado**
Lo que debería pasar

**Screenshots**
Si aplica, añadir screenshots

**Información del Sistema**
- OS: [ej. Windows 10]
- Browser: [ej. Chrome 91]
- Version: [ej. 1.0.0]
```

### 💡 **Solicitando Features**

Usamos [GitHub Issues](https://github.com/crash-worm-3d/client/issues) para tracking de features. Incluye:

- **📝 Descripción**: Descripción detallada del feature
- **🎯 Caso de Uso**: Por qué es útil este feature
- **🎨 Mockups**: Si es UI, incluir mockups o wireframes
- **📊 Prioridad**: Baja, Media, Alta, Crítica

---

## 👥 Comunidad

### 💬 **Canales de Comunicación**

- **📧 Email**: team@crashworm3d.com
- **💬 Discord**: [Servidor de Discord](https://discord.gg/crashworm3d)
- **🐦 Twitter**: [@CrashWorm3D](https://twitter.com/crashworm3d)
- **📰 Reddit**: [r/CrashWorm3D](https://reddit.com/r/crashworm3d)
- **📺 YouTube**: [Canal Oficial](https://youtube.com/crashworm3d)

### 🏆 **Contributors**

Un agradecimiento especial a todos los [contributors](https://github.com/crash-worm-3d/client/contributors) que han ayudado a hacer este proyecto posible.

### 🎉 **Comunidad**

- **👥 Players**: +10,000 jugadores activos
- **💻 Developers**: +50 contributors
- **🌍 Countries**: Jugadores en +30 países
- **⭐ GitHub Stars**: +2,500 stars

---

## 📊 Stats del Proyecto

![GitHub stars](https://img.shields.io/github/stars/crash-worm-3d/client?style=social)
![GitHub forks](https://img.shields.io/github/forks/crash-worm-3d/client?style=social)
![GitHub issues](https://img.shields.io/github/issues/crash-worm-3d/client)
![GitHub pull requests](https://img.shields.io/github/issues-pr/crash-worm-3d/client)

![Lines of code](https://img.shields.io/tokei/lines/github/crash-worm-3d/client)
![Code size](https://img.shields.io/github/languages/code-size/crash-worm-3d/client)
![Last commit](https://img.shields.io/github/last-commit/crash-worm-3d/client)

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

```
MIT License

Copyright (c) 2024 Crash Worm 3D Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

**🎮 ¡Construido con ❤️ por el equipo de Crash Worm 3D!**

[⬆️ Volver arriba](#-crash-worm-3d-adventure)

</div>