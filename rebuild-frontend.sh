#!/bin/bash

# ===================================
# Rebuild SOLO Frontend
# ===================================

set -e

echo "🎨 Rebuilding Frontend..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/monitor239web/public_html"

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_step() {
    echo -e "\n${BLUE}==>${NC} $1\n"
}

print_step "📦 Instalando dependencias..."
cd "$PROJECT_ROOT/frontend"
npm install
print_success "Dependencias instaladas"

print_step "🔨 Compilando Frontend..."
npm run build
print_success "Frontend compilado"

print_step "📋 Copiando archivos..."
rm -rf "$PROJECT_ROOT/assets"
cp -r dist/assets "$PROJECT_ROOT/"
cp -f dist/index.html "$PROJECT_ROOT/"
print_success "Archivos copiados"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Frontend Rebuild Completado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL: https://monitor.239web.com"
echo ""
