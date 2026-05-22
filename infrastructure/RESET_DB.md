# 🔄 Resetear Base de Datos

## Problema: Error de autenticación PostgreSQL

Si ves el error `password authentication failed for user "app"`, significa que la BD fue creada con credenciales diferentes a las del `.env`.

## Solución: Resetear el volumen de PostgreSQL

### Opción 1: Eliminar solo el volumen de PostgreSQL (recomendado)

```bash
cd ~/plataforma-de-reporte/infrastructure

# 1. Detener los contenedores
docker compose -f docker-compose.dev.yml down

# 2. Eliminar el volumen de PostgreSQL
docker volume rm infrastructure_postgres_data_dev

# 3. Levantar de nuevo (creará la BD con las credenciales del .env)
docker compose -f docker-compose.dev.yml up -d

# 4. Esperar a que PostgreSQL esté listo (unos segundos)
docker compose -f docker-compose.dev.yml ps

# 5. Ejecutar migraciones y seeders
docker compose -f docker-compose.dev.yml exec backend-data alembic upgrade head
docker compose -f docker-compose.dev.yml exec backend-data python -m app.seeders.run_seeders

# 6. Actualizar callbacks OAuth con el seeder de desarrollo
docker compose -f docker-compose.dev.yml exec backend-data python -m app.seeders.seed_dev
```

### Opción 2: Eliminar todos los volúmenes (reset completo)

```bash
cd ~/plataforma-de-reporte/infrastructure

# 1. Detener y eliminar todo
docker compose -f docker-compose.dev.yml down -v

# 2. Levantar de nuevo
docker compose -f docker-compose.dev.yml up -d

# 3. Esperar a que los servicios estén listos
sleep 10

# 4. Ejecutar migraciones y seeders
docker compose -f docker-compose.dev.yml exec backend-data alembic upgrade head
docker compose -f docker-compose.dev.yml exec backend-data python -m app.seeders.run_seeders
docker compose -f docker-compose.dev.yml exec backend-data python -m app.seeders.seed_dev
```

### Verificar que funciona

```bash
# Ver logs de PostgreSQL
docker compose -f docker-compose.dev.yml logs postgres

# Probar conexión
docker compose -f docker-compose.dev.yml exec backend-data python -c "from app.core.database import engine; engine.connect(); print('✅ Conexión exitosa')"
```
