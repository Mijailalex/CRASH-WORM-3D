// ============================================================================
// 🚀 CRASH WORM 3D - SERVICE WORKER AVANZADO
// ============================================================================
// Ubicación: public/sw.js
// Service Worker con cache inteligente, sincronización offline y actualizaciones

const SW_VERSION = '1.0.0';
const CACHE_PREFIX = 'crashworm3d';
const STATIC_CACHE = `${CACHE_PREFIX}-static-v${SW_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-v${SW_VERSION}`;
const ASSETS_CACHE = `${CACHE_PREFIX}-assets-v${SW_VERSION}`;
const API_CACHE = `${CACHE_PREFIX}-api-v${SW_VERSION}`;

// ============================================================================
// 📦 RECURSOS PARA CACHE ESTÁTICO
// ============================================================================

const STATIC_ASSETS = [
  // Core files
  '/',
  '/index.html',
  '/manifest.json',
  
  // JavaScript bundles (se actualizan automáticamente)
  '/assets/index.js',
  '/assets/vendor.js',
  
  // CSS
  '/assets/index.css',
  
  // Iconos esenciales
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  
  // Assets críticos del juego
  '/textures/grass.jpg',
  '/textures/stone.jpg',
  '/audio/jump.wav',
  '/audio/collect.wav',
  
  // Fallback offline
  '/offline.html'
];

// Recursos que se cachean dinámicamente
const CACHEABLE_ORIGINS = [
  self.location.origin,
  'https://cdnjs.cloudflare.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

// URLs que no se deben cachear
const NO_CACHE_URLS = [
  '/api/auth/',
  '/api/realtime/',
  'chrome-extension://'
];

// ============================================================================
// 🎯 EVENTOS DEL SERVICE WORKER
// ============================================================================

// INSTALL - Instalación inicial
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${SW_VERSION}`);
  
  event.waitUntil(
    Promise.all([
      // Cache recursos estáticos
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting para activación inmediata
      self.skipWaiting()
    ])
  );
});

// ACTIVATE - Activación y limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version ${SW_VERSION}`);
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      cleanupOldCaches(),
      
      // Claim todos los clientes
      self.clients.claim(),
      
      // Configurar sincronización en background
      setupBackgroundSync()
    ])
  );
});

// FETCH - Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar peticiones no HTTP
  if (!request.url.startsWith('http')) return;
  
  // Estrategias de cache según el tipo de recurso
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isGameAsset(url)) {
    event.respondWith(handleGameAsset(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// MESSAGE - Comunicación con el cliente
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: SW_VERSION });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_GAME_DATA':
      cacheGameData(payload).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

// SYNC - Sincronización en background
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  switch (event.tag) {
    case 'game-data-sync':
      event.waitUntil(syncGameData());
      break;
      
    case 'analytics-sync':
      event.waitUntil(syncAnalytics());
      break;
      
    case 'score-sync':
      event.waitUntil(syncScores());
      break;
  }
});

// PUSH - Notificaciones push
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: 'Tienes nuevas actualizaciones en Crash Worm 3D!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Jugar Ahora',
        icon: '/icons/action-play.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/action-close.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Crash Worm 3D', options)
  );
});

// NOTIFICATIONCLICK - Clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  switch (event.action) {
    case 'explore':
      event.waitUntil(
        clients.openWindow('/?source=notification')
      );
      break;
    case 'close':
      // No hacer nada, solo cerrar
      break;
    default:
      event.waitUntil(
        clients.openWindow('/')
      );
      break;
  }
});

// ============================================================================
// 🔧 FUNCIONES DE UTILIDAD
// ============================================================================

// Verificar si es un recurso estático
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.pathname.includes(asset)) ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.html');
}

// Verificar si es una petición de API
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

// Verificar si es un asset del juego
function isGameAsset(url) {
  const gameAssetExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.wav', '.mp3', '.ogg', '.glb', '.gltf'];
  return gameAssetExtensions.some(ext => url.pathname.endsWith(ext));
}

// Verificar si la URL es cacheable
function isCacheable(url) {
  return CACHEABLE_ORIGINS.some(origin => url.origin === origin) &&
         !NO_CACHE_URLS.some(noCache => url.pathname.startsWith(noCache));
}

// ============================================================================
// 📦 ESTRATEGIAS DE CACHE
// ============================================================================

// Manejar recursos estáticos - Cache First
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset error:', error);
    return getOfflineFallback(request);
  }
}

// Manejar peticiones de API - Network First
async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed for API, trying cache');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback para APIs críticas
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'No hay conexión disponible',
        cached: false 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Manejar assets del juego - Stale While Revalidate
async function handleGameAsset(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cachedResponse = await cache.match(request);
  
  const networkFetch = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    console.warn('[SW] Network failed for game asset');
    return null;
  });
  
  return cachedResponse || networkFetch || getAssetFallback(request);
}

// Manejar peticiones dinámicas - Network First con cache
async function handleDynamicRequest(request) {
  if (!isCacheable(new URL(request.url))) {
    return fetch(request);
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || getOfflineFallback(request);
  }
}

// ============================================================================
// 🧹 GESTIÓN DE CACHE
// ============================================================================

// Limpiar caches antiguos
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, ASSETS_CACHE, API_CACHE];
  
  const oldCaches = cacheNames.filter(cacheName => 
    cacheName.startsWith(CACHE_PREFIX) && !currentCaches.includes(cacheName)
  );
  
  console.log('[SW] Cleaning up caches:', oldCaches);
  
  return Promise.all(
    oldCaches.map(cacheName => caches.delete(cacheName))
  );
}

// Limpiar todos los caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// ============================================================================
// 🔄 SINCRONIZACIÓN EN BACKGROUND
// ============================================================================

// Configurar sincronización en background
async function setupBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    console.log('[SW] Background sync available');
  }
}

// Sincronizar datos del juego
async function syncGameData() {
  try {
    console.log('[SW] Syncing game data');
    
    // Obtener datos pendientes del IndexedDB
    const pendingData = await getPendingGameData();
    
    for (const data of pendingData) {
      try {
        const response = await fetch('/api/sync/game-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          await removePendingGameData(data.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync game data item:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Game data sync failed:', error);
  }
}

// Sincronizar analytics
async function syncAnalytics() {
  try {
    console.log('[SW] Syncing analytics');
    
    const pendingAnalytics = await getPendingAnalytics();
    
    if (pendingAnalytics.length > 0) {
      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: pendingAnalytics })
      });
      
      if (response.ok) {
        await clearPendingAnalytics();
      }
    }
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
  }
}

// Sincronizar puntuaciones
async function syncScores() {
  try {
    console.log('[SW] Syncing scores');
    
    const pendingScores = await getPendingScores();
    
    for (const score of pendingScores) {
      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(score)
        });
        
        if (response.ok) {
          await removePendingScore(score.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync score:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Score sync failed:', error);
  }
}

// ============================================================================
// 🎮 FUNCIONES ESPECÍFICAS DEL JUEGO
// ============================================================================

// Cachear datos del juego
async function cacheGameData(data) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
  return cache.put('/game-data', response);
}

// ============================================================================
// 🔄 FALLBACKS OFFLINE
// ============================================================================

// Fallback general offline
function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  if (request.destination === 'document') {
    return caches.match('/offline.html');
  }
  
  if (request.destination === 'image') {
    return caches.match('/icons/offline-image.png');
  }
  
  return new Response('Offline - No hay conexión disponible', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Fallback para assets del juego
function getAssetFallback(request) {
  const url = new URL(request.url);
  
  if (url.pathname.includes('texture')) {
    return caches.match('/textures/fallback.png');
  }
  
  if (url.pathname.includes('audio')) {
    return caches.match('/audio/silence.wav');
  }
  
  return new Response('Asset not available offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// ============================================================================
// 💾 FUNCIONES DE DATOS (SIMULADAS)
// ============================================================================

// Estas funciones deberían conectarse con IndexedDB en una implementación real
async function getPendingGameData() {
  // Simular datos pendientes
  return [];
}

async function removePendingGameData(id) {
  console.log(`[SW] Removing pending game data: ${id}`);
}

async function getPendingAnalytics() {
  return [];
}

async function clearPendingAnalytics() {
  console.log('[SW] Clearing pending analytics');
}

async function getPendingScores() {
  return [];
}

async function removePendingScore(id) {
  console.log(`[SW] Removing pending score: ${id}`);
}

// ============================================================================
// 📊 LOGGING Y DEBUGGING
// ============================================================================

// Log del estado del service worker
console.log(`[SW] Crash Worm 3D Service Worker v${SW_VERSION} loaded`);
console.log(`[SW] Caches: ${[STATIC_CACHE, DYNAMIC_CACHE, ASSETS_CACHE, API_CACHE].join(', ')}`);

// Debugging en desarrollo
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  console.log('[SW] Development mode - Enhanced logging enabled');
  
  // Interceptar todos los fetch para debugging
  const originalFetch = self.fetch;
  self.fetch = function(...args) {
    console.log('[SW] Fetch:', args[0]);
    return originalFetch.apply(this, args);
  };
}