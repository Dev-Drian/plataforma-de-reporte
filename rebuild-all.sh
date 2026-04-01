#!/bin/bash

# ===================================
# Rebuild COMPLETO - Backend y Frontend
# ===================================

set -e

echo "🔄 Rebuilding TODO - Backend Python + Gateway + Frontend..."
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/monitor239web/public_html"

print_step() {
    echo -e "\n${BLUE}==>${NC} $1\n"
}

# ===================================
# 1. REBUILD BACKEND PYTHON
# ===================================
print_step "1️⃣  Rebuilding Backend Python..."
bash "$PROJECT_ROOT/rebuild-backend.sh"

# ===================================
# 2. REBUILD BACKEND GATEWAY
# ===================================
print_step "2️⃣  Rebuilding Backend Gateway..."
bash "$PROJECT_ROOT/rebuild-gateway.sh"

# ===================================
# 3. REBUILD FRONTEND
# ===================================
print_step "3️⃣  Rebuilding Frontend..."
bash "$PROJECT_ROOT/rebuild-frontend.sh"
# ===================================
# 3. REBUILD FRONTEND
# ===================================
print_step "3️⃣  Rebuilding Frontend..."
bash "$PROJECT_ROOT/rebuild-frontend.sh"

# ===================================
# RESUMEN FINAL
# ===================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ REBUILD COMPLETO FINALIZADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL: https://monitor.239web.com"
echo ""
echo "📝 Scripts disponibles:"
echo "   ./rebuild-frontend.sh  - Solo frontend"
echo "   ./rebuild-backend.sh   - Solo backend Python"
echo "   ./rebuild-gateway.sh   - Solo backend Gateway"
echo "   ./rebuild-all.sh       - Todo"
echo ""
