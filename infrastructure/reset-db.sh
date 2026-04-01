#!/bin/bash
# Script para resetear la base de datos y ejecutar seeders
# Uso: ./reset-db.sh

set -e

echo "🔄 Reseteando base de datos..."
echo ""

# 1. Detener contenedores
echo "⏹️  Deteniendo contenedores..."
docker compose -f docker-compose.dev.yml down

# 2. Eliminar volumen de PostgreSQL
echo "🗑️  Eliminando volumen de PostgreSQL..."
docker volume rm infrastructure_postgres_data_dev 2>/dev/null || echo "  (Volumen no existe, continuando...)"

# 3. Levantar servicios
echo "🚀 Levantando servicios..."
docker compose -f docker-compose.dev.yml up -d

# 4. Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 10

# 5. Verificar que PostgreSQL está saludable
echo "🔍 Verificando salud de PostgreSQL..."
until docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U app > /dev/null 2>&1; do
  echo "  Esperando PostgreSQL..."
  sleep 2
done
echo "✅ PostgreSQL está listo"

# 6. Ejecutar migraciones
echo "📊 Ejecutando migraciones..."
docker compose -f docker-compose.dev.yml exec -T backend-data alembic upgrade head

# 7. Ejecutar seeders principales
echo "🌱 Ejecutando seeders principales..."
docker compose -f docker-compose.dev.yml exec -T backend-data python -m app.seeders.run_seeders

# 8. Ejecutar seeder de desarrollo (actualiza callbacks OAuth)
echo "🔧 Ejecutando seeder de desarrollo (callbacks OAuth)..."
docker compose -f docker-compose.dev.yml exec -T backend-data python -m app.seeders.seed_dev

echo ""
echo "✅ Base de datos reseteada y seeders ejecutados exitosamente!"
echo "📍 Callbacks OAuth configurados con FRONTEND_URL del .env"
