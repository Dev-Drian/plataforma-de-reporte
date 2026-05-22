#!/bin/bash

# ===================================
# Script para Inicializar Base de Datos
# ===================================

set -e

echo "🗄️  Inicializando Base de Datos MySQL..."
echo ""

PROJECT_ROOT="/home/monitor239web/public_html/backend-data"
PYTHON_VERSION="python3"

cd "$PROJECT_ROOT"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "\n${GREEN}==>${NC} $1\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar que existe .env
if [ ! -f ".env" ]; then
    print_error "No se encontró .env"
    print_error "Copia .env.example a .env y configúralo"
    exit 1
fi

# Verificar DATABASE_URL
DB_URL=$(grep "^DATABASE_URL=" ".env" | cut -d'=' -f2)
if [[ $DB_URL == *"tu_contraseña"* ]]; then
    print_error "DATABASE_URL no está configurado correctamente"
    print_error "Edita .env y configura las credenciales de MySQL"
    exit 1
fi

# Ejecutar migraciones
print_step "Ejecutando migraciones de Alembic..."
$PYTHON_VERSION -m alembic upgrade head
print_success "Migraciones completadas"

# Inicializar base de datos
print_step "Inicializando estructura de base de datos..."
$PYTHON_VERSION scripts/init_db.py
print_success "Base de datos inicializada"

# Preguntar si quiere seeders
echo ""
read -p "¿Deseas cargar datos de prueba? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[SsYy]$ ]]; then
    print_step "Cargando datos de prueba..."
    $PYTHON_VERSION -m app.seeders.run_seeders
    print_success "Datos de prueba cargados"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Base de datos lista!"
echo ""
echo "Puedes verificar con:"
echo "  mysql -u tu_usuario -p tu_base_de_datos"
echo "  SHOW TABLES;"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
