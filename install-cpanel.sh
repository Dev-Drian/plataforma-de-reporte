#!/bin/bash

# ===================================
# Script de Instalación para cPanel
# Sin Docker, Sin PostgreSQL
# ===================================

set -e  # Salir si hay error

echo "🚀 Instalando Marketing & SEO Platform en cPanel..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
PROJECT_ROOT="/home/monitor239web/public_html"
PYTHON_VERSION="python3"  # Ajusta según tu cPanel

# ===================================
# Función para imprimir mensajes
# ===================================
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_step() {
    echo -e "\n${GREEN}==>${NC} $1\n"
}

# ===================================
# PASO 1: Verificar requisitos
# ===================================
print_step "Verificando requisitos..."

if ! command -v $PYTHON_VERSION &> /dev/null; then
    print_error "Python 3.9+ no encontrado. Instálalo desde cPanel."
    exit 1
fi
print_success "Python: $($PYTHON_VERSION --version)"

if ! command -v node &> /dev/null; then
    print_error "Node.js no encontrado. Instálalo desde cPanel."
    exit 1
fi
print_success "Node.js: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm no encontrado."
    exit 1
fi
print_success "npm: $(npm --version)"

# ===================================
# PASO 2: Configurar Backend Python
# ===================================
print_step "Configurando Backend Python..."

cd "$PROJECT_ROOT/backend-data"

# Copiar .env si no existe
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Archivo .env creado. DEBES EDITARLO con tus credenciales."
        print_warning "Ubicación: $PROJECT_ROOT/backend-data/.env"
    else
        print_error "No se encontró .env.example"
        exit 1
    fi
else
    print_success ".env ya existe"
fi

# Instalar dependencias Python
print_step "Instalando dependencias Python (esto puede tardar varios minutos)..."
$PYTHON_VERSION -m pip install --user -r requirements.txt
print_success "Dependencias Python instaladas"

# ===================================
# PASO 3: Configurar Backend Node.js
# ===================================
print_step "Configurando Backend Gateway (Node.js)..."

cd "$PROJECT_ROOT/backend-gateway"

# Copiar .env si no existe
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Archivo .env creado. DEBES EDITARLO con tus credenciales."
        print_warning "Ubicación: $PROJECT_ROOT/backend-gateway/.env"
    else
        print_error "No se encontró .env.example"
        exit 1
    fi
else
    print_success ".env ya existe"
fi

# Instalar dependencias Node.js
print_step "Instalando dependencias Node.js..."
npm install --production
print_success "Dependencias Node.js instaladas"

# Compilar TypeScript
print_step "Compilando TypeScript..."
npm run build
print_success "TypeScript compilado"

# ===================================
# PASO 4: Frontend
# ===================================
print_step "Configurando Frontend..."

cd "$PROJECT_ROOT/frontend"

# Copiar .env.production si no existe
if [ ! -f ".env.production" ]; then
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env.production
        print_warning "Archivo .env.production creado. DEBES EDITARLO con tu dominio."
        print_warning "Ubicación: $PROJECT_ROOT/frontend/.env.production"
    else
        print_error "No se encontró .env.production.example"
        exit 1
    fi
else
    print_success ".env.production ya existe"
fi

print_warning "Frontend: Debes compilarlo con 'npm run build' en tu máquina local"
print_warning "y subir el contenido de dist/ a public_html/"

# ===================================
# RESUMEN
# ===================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "Instalación completada!"
echo ""
echo "📋 PASOS SIGUIENTES:"
echo ""
echo "1. Editar archivos de configuración (.env):"
echo "   - $PROJECT_ROOT/backend-data/.env"
echo "   - $PROJECT_ROOT/backend-gateway/.env"
echo "   - $PROJECT_ROOT/frontend/.env.production"
echo ""
echo "2. Crear base de datos MySQL en cPanel:"
echo "   - Nombre: monitor239_marketing"
echo "   - Usuario: monitor239_app"
echo "   - Actualiza DATABASE_URL en backend-data/.env"
echo ""
echo "3. Inicializar base de datos:"
echo "   cd $PROJECT_ROOT/backend-data"
echo "   $PYTHON_VERSION -m alembic upgrade head"
echo "   $PYTHON_VERSION scripts/init_db.py"
echo ""
echo "4. Configurar Python App en cPanel:"
echo "   - Application root: $PROJECT_ROOT/backend-data"
echo "   - Application URL: data-api"
echo "   - Startup file: passenger_wsgi.py"
echo ""
echo "5. Configurar Node.js App en cPanel:"
echo "   - Application root: $PROJECT_ROOT/backend-gateway"
echo "   - Application URL: api"
echo "   - Startup file: dist/app.js"
echo ""
echo "6. Compilar y subir Frontend:"
echo "   cd frontend (en tu máquina local)"
echo "   npm install"
echo "   npm run build"
echo "   Subir contenido de dist/ a public_html/"
echo ""
echo "7. Verificar .htaccess en public_html/"
echo ""
echo "📖 Guía completa: $PROJECT_ROOT/SETUP_CPANEL_SIN_DOCKER.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
