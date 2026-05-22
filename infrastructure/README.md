# 🐳 Docker Infrastructure - Marketing & SEO Intelligence

Configuración de Docker para desarrollo y producción.

## 📋 Modos de Ejecución

### 🔧 Modo Desarrollo (con Hot-Reload)

**Ideal para desarrollo:** Los cambios en el código se reflejan automáticamente sin reconstruir los contenedores.

```bash
# Desde el directorio infrastructure
docker-compose -f docker-compose.dev.yml up
```

**Características:**
- ✅ Hot-reload automático en Frontend (Vite)
- ✅ Hot-reload automático en Backend Gateway (tsx watch)
- ✅ Hot-reload automático en Backend Data (uvicorn --reload)
- ✅ Volúmenes montados para sincronización de código
- ✅ Cambios se reflejan instantáneamente

**URLs:**
- Frontend: http://localhost:3000
- Gateway API: http://localhost:4000
- Data API: http://localhost:8000
- Data API Docs: http://localhost:8000/docs

### 🚀 Modo Producción

**Ideal para testing de producción o despliegue:**

```bash
# Desde el directorio infrastructure
docker-compose up
```

**Características:**
- ✅ Build optimizado de Frontend (Nginx)
- ✅ Build optimizado de Backend Gateway
- ✅ Sin hot-reload (mejor rendimiento)
- ✅ Configuración lista para producción

## 🛠️ Comandos Útiles

### Desarrollo

```bash
# Iniciar en modo desarrollo
docker-compose -f docker-compose.dev.yml up

# Iniciar en background
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f gateway
docker-compose -f docker-compose.dev.yml logs -f backend-data

# Detener servicios
docker-compose -f docker-compose.dev.yml down

# Reconstruir un servicio específico
docker-compose -f docker-compose.dev.yml build frontend
docker-compose -f docker-compose.dev.yml up -d frontend

# Reconstruir todo
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Producción

```bash
# Iniciar en modo producción
docker-compose up

# Iniciar en background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ CUIDADO: elimina datos)
docker-compose down -v
```

## 🔄 Hot-Reload en Desarrollo

### Frontend (React + Vite)
- **Archivos monitoreados:** `src/`, `index.html`, `vite.config.ts`, etc.
- **Cambios:** Se reflejan automáticamente en el navegador
- **Puerto:** 3000

### Backend Gateway (Express + TypeScript)
- **Archivos monitoreados:** `src/`
- **Cambios:** El servidor se reinicia automáticamente con `tsx watch`
- **Puerto:** 4000

### Backend Data (FastAPI + Python)
- **Archivos monitoreados:** `app/`, `main.py`
- **Cambios:** El servidor se reinicia automáticamente con `uvicorn --reload`
- **Puerto:** 8000

## 📝 Variables de Entorno

Crea un archivo `.env` en el directorio `infrastructure/`:

```env
# Base de datos
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=marketing_seo

# JWT
JWT_SECRET=your-secret-key-change-in-production

# APIs Externas (opcional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
META_ACCESS_TOKEN=your_meta_token
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
```

## 🗄️ Base de Datos

### Inicializar Base de Datos (Primera vez)

```bash
# Entrar al contenedor de backend-data
docker-compose -f docker-compose.dev.yml exec backend-data bash

# Dentro del contenedor, ejecutar:
python scripts/init_db.py
```

O desde fuera:

```bash
docker-compose -f docker-compose.dev.yml exec backend-data python scripts/init_db.py
```

### Acceder a PostgreSQL

```bash
# Desde el host
psql -h localhost -U app -d marketing_seo

# Desde dentro del contenedor
docker-compose -f docker-compose.dev.yml exec postgres psql -U app -d marketing_seo
```

## 🐛 Troubleshooting

### Los cambios no se reflejan

1. **Verifica que estés usando `docker-compose.dev.yml`** (no `docker-compose.yml`)
2. **Verifica que los volúmenes estén montados correctamente:**
   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```
3. **Reconstruye el servicio:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build frontend
   ```

### Puerto ya en uso

Si un puerto está ocupado, puedes cambiarlo en `docker-compose.dev.yml`:

```yaml
ports:
  - "3001:3000"  # Cambiar 3000 a 3001 en el host
```

### Problemas con node_modules

Si hay problemas con dependencias, reconstruye:

```bash
docker-compose -f docker-compose.dev.yml build --no-cache frontend
docker-compose -f docker-compose.dev.yml up -d frontend
```

## 📚 Más Información

- [Frontend README](../frontend/README.md)
- [Backend Gateway README](../backend-gateway/README.md)
- [Backend Datos README](../backend-data/README.md)


