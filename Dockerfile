# ============================================================================
# 🐳 CRASH WORM 3D - DOCKERFILE OPTIMIZADO
# ============================================================================
# Ubicación: Dockerfile
# Imagen Docker optimizada para producción con multi-stage build

# ========================================
# 🏗️ STAGE 1: BUILD ENVIRONMENT
# ========================================
FROM node:20-alpine AS builder

# Metadata
LABEL maintainer="Crash Worm 3D Team <team@crashworm3d.com>"
LABEL version="1.0.0"
LABEL description="Crash Worm 3D Adventure - Build Stage"

# Configuración de variables de entorno de build
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV CI=true

# Instalar dependencias del sistema necesarias para compilación
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev \
    && ln -sf python3 /usr/bin/python

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./
COPY .npmrc* ./

# Optimizar instalación de dependencias
RUN npm ci --only=production --silent --no-optional \
    && npm cache clean --force

# Copiar código fuente y archivos de configuración
COPY . .

# Crear directorio para logs
RUN mkdir -p logs

# Build optimizado para producción
RUN npm run build

# Verificar que el build se completó correctamente
RUN ls -la dist/ && \
    test -f dist/index.html && \
    echo "✅ Build completed successfully"

# ========================================
# 🎯 STAGE 2: RUNTIME ENVIRONMENT
# ========================================
FROM nginx:1.25-alpine AS runtime

# Metadata para la imagen final
LABEL maintainer="Crash Worm 3D Team <team@crashworm3d.com>"
LABEL version="1.0.0"
LABEL description="Crash Worm 3D Adventure - Production Server"

# Instalar dependencias adicionales
RUN apk add --no-cache \
    curl \
    jq \
    tzdata \
    && rm -rf /var/cache/apk/*

# Configurar timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S gameuser && \
    adduser -S gameuser -u 1001 -G gameuser

# Crear directorios necesarios
RUN mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && chown -R gameuser:gameuser /var/cache/nginx /var/log/nginx

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Copiar archivos de build desde el stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar archivos estáticos adicionales
COPY --from=builder /app/public/icons /usr/share/nginx/html/icons
COPY --from=builder /app/public/textures /usr/share/nginx/html/textures
COPY --from=builder /app/public/audio /usr/share/nginx/html/audio

# Configurar permisos
RUN chown -R gameuser:gameuser /usr/share/nginx/html

# Crear archivo de salud para health checks
RUN echo '{"status":"healthy","version":"1.0.0","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > /usr/share/nginx/html/health.json

# ========================================
# 🔧 STAGE 3: CONFIGURACIÓN FINAL
# ========================================

# Exponer puertos
EXPOSE 80 443

# Variables de entorno para runtime
ENV NODE_ENV=production
ENV NGINX_WORKER_PROCESSES=auto
ENV NGINX_WORKER_CONNECTIONS=1024
ENV NGINX_CLIENT_MAX_BODY_SIZE=50M
ENV NGINX_KEEPALIVE_TIMEOUT=65
ENV NGINX_GZIP=on

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health.json || exit 1

# Script de inicio personalizado
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Cambiar a usuario no-root
USER gameuser

# Punto de entrada
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

# ========================================
# 📊 INFORMACIÓN DE LA IMAGEN
# ========================================

# Añadir labels adicionales para metadata
LABEL org.opencontainers.image.title="Crash Worm 3D Adventure"
LABEL org.opencontainers.image.description="Juego de plataformas 3D multijugador"
LABEL org.opencontainers.image.url="https://crashworm3d.com"
LABEL org.opencontainers.image.documentation="https://crashworm3d.com/docs"
LABEL org.opencontainers.image.source="https://github.com/crash-worm-3d/client"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.licenses="MIT"

# ========================================
# 🚀 INSTRUCCIONES DE USO
# ========================================

# Construir la imagen:
# docker build -t crashworm3d:latest .

# Ejecutar el contenedor:
# docker run -d -p 80:80 --name crashworm3d crashworm3d:latest

# Ejecutar con variables de entorno personalizadas:
# docker run -d -p 80:80 \
#   -e NGINX_WORKER_PROCESSES=2 \
#   -e NGINX_CLIENT_MAX_BODY_SIZE=100M \
#   --name crashworm3d crashworm3d:latest

# Ejecutar con volumen para logs:
# docker run -d -p 80:80 \
#   -v /host/logs:/var/log/nginx \
#   --name crashworm3d crashworm3d:latest

# ========================================
# 🔒 CONSIDERACIONES DE SEGURIDAD
# ========================================

# 1. La imagen usa usuario no-root (gameuser)
# 2. Dependencias mínimas en imagen final
# 3. Health checks configurados
# 4. Headers de seguridad en Nginx
# 5. Sin secretos embebidos en la imagen
# 6. Multi-stage build para reducir superficie de ataque