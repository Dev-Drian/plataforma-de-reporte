# 🚀 Comandos para Azure

## 📋 Configuración Inicial

### 1. Crear archivo .env

```bash
cd ~/plataforma-de-reporte/infrastructure

# Copiar el ejemplo
cp env.example .env

# Editar con tus valores (ya está configurado para Azure)
nano .env
```

Tu `.env` debe tener:
```env
FRONTEND_URL=http://plataforma-reporte.centralus.cloudapp.azure.com
VITE_API_BASE_URL=http://plataforma-reporte.centralus.cloudapp.azure.com:4000/api
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=marketing_seo
JWT_SECRET=tu-secret-azure
```

## 🔄 Resetear Base de Datos (si hay error de autenticación)

### Opción 1: Usar el script automático (recomendado)

```bash
cd ~/plataforma-de-reporte/infrastructure
chmod +x reset-db.sh
./reset-db.sh
```

### Opción 2: Manual

```bash
cd ~/plataforma-de-reporte/infrastructure

# 1. Detener contenedores
docker compose -f docker-compose.dev.yml down

# 2. Eliminar volumen de PostgreSQL
docker volume rm infrastructure_postgres_data_dev

# 3. Levantar servicios
docker compose -f docker-compose.dev.yml up -d

# 4. Esperar a que PostgreSQL esté listo
sleep 10

# 5. Ejecutar migraciones
docker compose -f docker-compose.dev.yml exec backend-data alembic upgrade head

# 6. Ejecutar seeders principales
docker compose -f docker-compose.dev.yml exec backend-data python -m app.seeders.run_seeders

# 7. Actualizar callbacks OAuth (usa FRONTEND_URL del .env)
docker compose -f docker-compose.dev.yml exec backend-data python -m app.seeders.seed_dev
```

## 📝 Comandos Útiles

### Ver estado de servicios
```bash
docker compose -f docker-compose.dev.yml ps
```

### Ver logs
```bash
# Todos los servicios
docker compose -f docker-compose.dev.yml logs -f

# Solo un servicio
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml logs -f backend-data
docker compose -f docker-compose.dev.yml logs -f gateway
```

### Reiniciar un servicio
```bash
docker compose -f docker-compose.dev.yml restart frontend
docker compose -f docker-compose.dev.yml restart backend-data
docker compose -f docker-compose.dev.yml restart gateway
```

### Actualizar callbacks OAuth (después de cambiar FRONTEND_URL)
```bash
docker compose -f docker-compose.dev.yml exec backend-data python -m app.seeders.seed_dev
```

### Reconstruir contenedores
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## 🔍 Verificar que todo funciona

```bash
# Verificar que PostgreSQL está saludable
docker compose -f docker-compose.dev.yml exec postgres pg_isready -U app

# Probar conexión desde backend
docker compose -f docker-compose.dev.yml exec backend-data python -c "from app.core.database import engine; engine.connect(); print('✅ Conexión exitosa')"

# Verificar callbacks OAuth
docker compose -f docker-compose.dev.yml exec backend-data python -c "from app.core.config import settings; print(f'FRONTEND_URL: {settings.FRONTEND_URL}')"
```

## 🌐 URLs Finales

- **Frontend**: `http://plataforma-reporte.centralus.cloudapp.azure.com`
- **API Gateway**: `http://plataforma-reporte.centralus.cloudapp.azure.com:4000`
- **Backend Data API**: `http://plataforma-reporte.centralus.cloudapp.azure.com:8000`
- **API Docs**: `http://plataforma-reporte.centralus.cloudapp.azure.com:8000/docs`
