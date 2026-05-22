# 🚀 Comandos para Correr el Proyecto

## 📋 Comandos Básicos

### 1. Iniciar todo (Modo Desarrollo)
```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml up
```

### 2. Iniciar en segundo plano
```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Ver estado de los servicios
```bash
cd infrastructure
docker-compose ps
```

### 4. Ver logs
```bash
cd infrastructure
docker-compose logs -f
```

### 5. Ver logs de un servicio específico
```bash
cd infrastructure
docker-compose logs -f backend-data
docker-compose logs -f gateway
docker-compose logs -f frontend
```

### 6. Detener todo
```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml down
```

### 7. Reiniciar un servicio
```bash
cd infrastructure
docker-compose restart backend-data
docker-compose restart gateway
docker-compose restart frontend
```

## 🗄️ Base de Datos

### Inicializar base de datos (primera vez)
```bash
cd infrastructure
docker-compose exec backend-data python scripts/init_db.py
```

### Ejecutar migraciones
```bash
cd infrastructure
docker-compose exec backend-data alembic upgrade head
```

### Ver estado de migraciones
```bash
cd infrastructure
docker-compose exec backend-data alembic current
```

### Ejecutar seeders (todos los datos iniciales, incluyendo providers)
```bash
cd infrastructure
docker-compose exec backend-data python -m app.seeders.run_seeders
```

Este comando ejecuta todos los seeders:
- Roles (admin, user, viewer)
- Organizaciones de demostración
- Usuarios de ejemplo
- Configuraciones iniciales
- Keywords de ejemplo
- Ciudades de ejemplo
- **OAuth Providers** (Google, Meta, LinkedIn, TikTok)

## 🔧 Verificar que Todo Funciona

### Verificar servicios corriendo
```bash
cd infrastructure
docker-compose ps
```

### Probar endpoints
- Frontend: http://localhost:3000
- Gateway API: http://localhost:4000
- Data API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Verificar salud de servicios
```bash
curl http://localhost:8000/health
curl http://localhost:4000/health
```

## 🧹 Limpiar (si hay problemas)

### Detener y eliminar contenedores
```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml down
```

### Reconstruir todo desde cero
```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml up --build --force-recreate
```

## 📝 URLs Importantes

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:4000
- **API Data**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379



