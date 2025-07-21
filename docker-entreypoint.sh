#!/bin/sh
# ============================================================================
# 🐳 CRASH WORM 3D - DOCKER ENTRYPOINT SCRIPT
# ============================================================================
# Ubicación: docker-entrypoint.sh
# Script de inicialización para contenedor Docker

set -e

# ========================================
# 🔧 CONFIGURACIÓN INICIAL
# ========================================

echo "🎮 Iniciando Crash Worm 3D Adventure..."
echo "📅 $(date)"
echo "🏷️  Versión: ${APP_VERSION:-1.0.0}"
echo "🌍 Entorno: ${NODE_ENV:-production}"

# ========================================
# 🔍 VERIFICACIONES PRE-INICIO
# ========================================

echo "🔍 Realizando verificaciones..."

# Verificar que existen los archivos necesarios
if [ ! -f "/usr/share/nginx/html/index.html" ]; then
    echo "❌ Error: index.html no encontrado"
    exit 1
fi

if [ ! -f "/etc/nginx/nginx.conf" ]; then
    echo "❌ Error: Configuración de Nginx no encontrada"
    exit 1
fi

# Verificar permisos
if [ ! -r "/usr/share/nginx/html/index.html" ]; then
    echo "❌ Error: Sin permisos de lectura en archivos web"
    exit 1
fi

echo "✅ Verificaciones completadas"

# ========================================
# 🔧 CONFIGURACIÓN DINÁMICA DE NGINX
# ========================================

echo "🔧 Configurando Nginx..."

# Crear configuración dinámica basada en variables de entorno
cat > /tmp/nginx-env.conf << EOF
# Configuración dinámica generada en runtime
worker_processes ${NGINX_WORKER_PROCESSES:-auto};

events {
    worker_connections ${NGINX_WORKER_CONNECTIONS:-1024};
    use epoll;
    multi_accept on;
}

http {
    # Configuración básica
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout ${NGINX_KEEPALIVE_TIMEOUT:-65};
    client_max_body_size ${NGINX_CLIENT_MAX_BODY_SIZE:-50M};
    
    # Compresión
    gzip ${NGINX_GZIP:-on};
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types
        application/javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rss+xml
        application/vnd.geo+json
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        font/opentype
        image/bmp
        image/svg+xml
        image/x-icon
        text/cache-manifest
        text/css
        text/plain
        text/vcard
        text/vnd.rim.location.xloc
        text/vtt
        text/x-component
        text/x-cross-domain-policy;
    
    # Configuración de logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
    
    # Incluir configuraciones del sitio
    include /etc/nginx/conf.d/*.conf;
}
EOF

# Si estamos en modo debug, mostrar configuración
if [ "${DEBUG:-false}" = "true" ]; then
    echo "🐛 Modo DEBUG activado"
    echo "📄 Configuración de Nginx:"
    cat /tmp/nginx-env.conf
fi

# ========================================
# 🌐 CONFIGURACIÓN DE VARIABLES DE RUNTIME
# ========================================

echo "🌐 Configurando variables de runtime..."

# Crear archivo de configuración JavaScript para el cliente
cat > /usr/share/nginx/html/config.js << EOF
// Configuración dinámica generada en runtime
window.RUNTIME_CONFIG = {
    version: '${APP_VERSION:-1.0.0}',
    environment: '${NODE_ENV:-production}',
    buildTime: '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    apiUrl: '${API_URL:-}',
    wsUrl: '${WEBSOCKET_URL:-}',
    features: {
        analytics: ${ENABLE_ANALYTICS:-true},
        multiplayer: ${ENABLE_MULTIPLAYER:-true},
        pwa: ${ENABLE_PWA:-true},
        debug: ${DEBUG:-false}
    },
    limits: {
        maxPlayersPerRoom: ${MAX_PLAYERS_PER_ROOM:-16},
        maxRequestSize: '${NGINX_CLIENT_MAX_BODY_SIZE:-50M}'
    }
};

console.log('🎮 Runtime config loaded:', window.RUNTIME_CONFIG);
EOF

# ========================================
# 🔒 CONFIGURACIÓN DE SEGURIDAD
# ========================================

echo "🔒 Aplicando configuración de seguridad..."

# Headers de seguridad adicionales
if [ "${SECURITY_HEADERS:-true}" = "true" ]; then
    cat > /etc/nginx/conf.d/security.conf << EOF
# Headers de seguridad
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Download-Options "noopen" always;
add_header X-Permitted-Cross-Domain-Policies "none" always;

# CSP (Content Security Policy)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self' ws: wss: https:; worker-src 'self' blob:;" always;

# HSTS (solo en HTTPS)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
EOF
fi

# ========================================
# 📊 CONFIGURACIÓN DE MONITOREO
# ========================================

echo "📊 Configurando monitoreo..."

# Endpoint de salud personalizado
cat > /usr/share/nginx/html/health << EOF
{
    "status": "healthy",
    "version": "${APP_VERSION:-1.0.0}",
    "environment": "${NODE_ENV:-production}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "uptime": 0,
    "nginx": {
        "worker_processes": "${NGINX_WORKER_PROCESSES:-auto}",
        "worker_connections": "${NGINX_WORKER_CONNECTIONS:-1024}"
    }
}
EOF

# Script de métricas (si está habilitado)
if [ "${ENABLE_METRICS:-false}" = "true" ]; then
    echo "📈 Métricas habilitadas"
    
    # Crear endpoint de métricas básicas
    cat > /usr/share/nginx/html/metrics << EOF
{
    "app": "crash-worm-3d",
    "version": "${APP_VERSION:-1.0.0}",
    "build_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "container_id": "${HOSTNAME}",
    "memory_limit": "$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo 'unknown')",
    "cpu_limit": "$(cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us 2>/dev/null || echo 'unknown')"
}
EOF
fi

# ========================================
# 🗂️ CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
# ========================================

echo "🗂️ Optimizando archivos estáticos..."

# Configurar cache headers para diferentes tipos de archivos
cat > /etc/nginx/conf.d/cache.conf << EOF
# Cache para assets estáticos
location ~* \.(jpg|jpeg|png|gif|ico|css|js|webp|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
}

# Cache para archivos de juego
location ~* \.(wav|mp3|ogg|glb|gltf|bin)$ {
    expires 6M;
    add_header Cache-Control "public";
    add_header Vary "Accept-Encoding";
}

# Sin cache para archivos críticos
location ~* \.(html|json|xml)$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}
EOF

# ========================================
# 🚀 OPTIMIZACIONES DE PERFORMANCE
# ========================================

echo "🚀 Aplicando optimizaciones de performance..."

# Precomprimir archivos si es posible
if command -v gzip >/dev/null 2>&1; then
    echo "📦 Precomprimiendo archivos..."
    find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" \) -exec gzip -9 -k {} \;
fi

# ========================================
# 🔄 CONFIGURACIÓN DE PROXY REVERSO
# ========================================

# Si se especifica una API backend
if [ -n "${API_BACKEND_URL}" ]; then
    echo "🔄 Configurando proxy reverso para API..."
    
    cat > /etc/nginx/conf.d/api-proxy.conf << EOF
# Proxy para API backend
location /api/ {
    proxy_pass ${API_BACKEND_URL}/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
EOF
fi

# WebSocket proxy
if [ -n "${WEBSOCKET_BACKEND_URL}" ]; then
    echo "🔌 Configurando proxy WebSocket..."
    
    cat > /etc/nginx/conf.d/ws-proxy.conf << EOF
# Proxy para WebSocket
location /socket.io/ {
    proxy_pass ${WEBSOCKET_BACKEND_URL};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF
fi

# ========================================
# 📝 LOGGING Y DEBUGGING
# ========================================

echo "📝 Configurando logging..."

# Configurar formato de logs personalizado
cat > /etc/nginx/conf.d/logging.conf << EOF
# Formato de log personalizado
log_format game_log '\$remote_addr - \$remote_user [\$time_local] '
                   '"\$request" \$status \$body_bytes_sent '
                   '"\$http_referer" "\$http_user_agent" '
                   '\$request_time \$upstream_response_time';

# Aplicar formato a access log
access_log /var/log/nginx/access.log game_log;
EOF

# ========================================
# ✅ VERIFICACIÓN FINAL
# ========================================

echo "✅ Verificando configuración final..."

# Test de configuración de Nginx
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuración de Nginx válida"
else
    echo "❌ Error en configuración de Nginx"
    exit 1
fi

# ========================================
# 🎬 INICIO DEL SERVICIO
# ========================================

echo "🎬 Iniciando servidor..."
echo "🌍 Servidor disponible en puerto 80"
echo "📊 Health check: /health"

if [ "${ENABLE_METRICS:-false}" = "true" ]; then
    echo "📈 Métricas: /metrics"
fi

if [ "${DEBUG:-false}" = "true" ]; then
    echo "🐛 Modo DEBUG activado - logs verbosos habilitados"
fi

echo "🎮 ¡Crash Worm 3D Adventure está listo!"
echo "=================================================="

# Ejecutar comando pasado como argumentos
exec "$@"