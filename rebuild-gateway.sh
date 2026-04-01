#!/bin/bash

# ===================================
# Rebuild SOLO Backend Gateway (Node.js)
# ===================================

set -e

echo "🚀 Rebuilding Backend Gateway..."
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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_step() {
    echo -e "\n${BLUE}==>${NC} $1\n"
}

cd "$PROJECT_ROOT/backend-gateway"

print_warning "Deteniendo proceso actual..."
pkill -f "node dist/app.js" || echo "No hay proceso corriendo"
sleep 2

print_step "📦 Instalando dependencias Node.js..."
npm install
print_success "Dependencias instaladas"

print_step "🔨 Compilando TypeScript..."
npm run build
print_success "TypeScript compilado"

print_step "🚀 Iniciando Backend Gateway..."
# Cargar variables de entorno del archivo .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi
nohup node dist/app.js > backend-gateway.log 2>&1 &
NODE_PID=$!
sleep 3

if ps -p $NODE_PID > /dev/null; then
    print_success "Backend Gateway iniciado (PID: $NODE_PID)"
else
    echo -e "${RED}✗ Error al iniciar. Ver logs en: backend-gateway.log${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backend Gateway Rebuild Completado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 PID: $NODE_PID"
echo "📋 Logs: tail -f backend-gateway/backend-gateway.log"
echo ""
