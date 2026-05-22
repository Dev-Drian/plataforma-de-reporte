#!/bin/bash

# ===================================
# Rebuild SOLO Backend Python (FastAPI)
# ===================================

set -e

echo "🐍 Rebuilding Backend Python..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/monitor239web/public_html"
PYTHON_CMD="/opt/alt/python311/bin/python3.11"

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_step() {
    echo -e "\n${BLUE}==>${NC} $1\n"
}

cd "$PROJECT_ROOT/backend-data"

print_warning "Deteniendo proceso actual..."
pkill -f "uvicorn main:app" || echo "No hay proceso corriendo"
sleep 2

print_step "📦 Instalando dependencias Python..."
$PYTHON_CMD -m pip install --user -r requirements.txt --upgrade
print_success "Dependencias instaladas"

print_step "🗄️  Ejecutando migraciones..."
$PYTHON_CMD -m alembic upgrade head
print_success "Migraciones completadas"

print_step "🚀 Iniciando Backend Python..."
nohup $PYTHON_CMD -m uvicorn main:app --host 127.0.0.1 --port 3000 > uvicorn.log 2>&1 &
PYTHON_PID=$!
sleep 3

if ps -p $PYTHON_PID > /dev/null; then
    print_success "Backend Python iniciado (PID: $PYTHON_PID)"
else
    echo -e "${RED}✗ Error al iniciar. Ver logs en: backend-python.log${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backend Python Rebuild Completado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🐍 PID: $PYTHON_PID"
echo "🌐 URL: http://127.0.0.1:3000"
echo "📚 Docs: http://127.0.0.1:3000/docs"
echo "📋 Logs: tail -f backend-data/uvicorn.log"
echo ""
