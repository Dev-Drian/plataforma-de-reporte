#!/bin/bash

# ===================================
# Script de Verificación
# ===================================

echo "🔍 Verificando instalación de Marketing & SEO Platform..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="/home/monitor239web/public_html"
ERRORS=0

print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ((ERRORS++))
    fi
}

# ===================================
# 1. ARCHIVOS DE CONFIGURACIÓN
# ===================================
echo "1️⃣  Archivos de Configuración:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ -f "$PROJECT_ROOT/backend-data/.env" ]
print_check $? "backend-data/.env existe"

[ -f "$PROJECT_ROOT/backend-gateway/.env" ]
print_check $? "backend-gateway/.env existe"

[ -f "$PROJECT_ROOT/.htaccess" ]
print_check $? ".htaccess existe"

echo ""

# ===================================
# 2. BACKEND PYTHON
# ===================================
echo "2️⃣  Backend Python:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ -d "$PROJECT_ROOT/backend-data/app" ]
print_check $? "Directorio app/ existe"

[ -f "$PROJECT_ROOT/backend-data/main.py" ]
print_check $? "main.py existe"

[ -f "$PROJECT_ROOT/backend-data/passenger_wsgi.py" ]
print_check $? "passenger_wsgi.py existe"

[ -f "$PROJECT_ROOT/backend-data/requirements.txt" ]
print_check $? "requirements.txt existe"

# Verificar si Python puede importar los módulos principales
cd "$PROJECT_ROOT/backend-data"
python3 -c "import fastapi" 2>/dev/null
print_check $? "FastAPI instalado"

python3 -c "import sqlalchemy" 2>/dev/null
print_check $? "SQLAlchemy instalado"

python3 -c "import pymysql" 2>/dev/null
print_check $? "PyMySQL instalado"

python3 -c "import alembic" 2>/dev/null
print_check $? "Alembic instalado"

echo ""

# ===================================
# 3. BACKEND NODE.JS
# ===================================
echo "3️⃣  Backend Gateway (Node.js):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ -d "$PROJECT_ROOT/backend-gateway/node_modules" ]
print_check $? "node_modules/ existe"

[ -d "$PROJECT_ROOT/backend-gateway/dist" ]
print_check $? "dist/ existe (TypeScript compilado)"

[ -f "$PROJECT_ROOT/backend-gateway/dist/app.js" ]
print_check $? "dist/app.js existe"

[ -f "$PROJECT_ROOT/backend-gateway/package.json" ]
print_check $? "package.json existe"

echo ""

# ===================================
# 4. FRONTEND
# ===================================
echo "4️⃣  Frontend:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ -f "$PROJECT_ROOT/index.html" ]
print_check $? "index.html existe en public_html"

[ -d "$PROJECT_ROOT/assets" ]
print_check $? "assets/ existe en public_html"

echo ""

# ===================================
# 5. BASE DE DATOS
# ===================================
echo "5️⃣  Base de Datos:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extraer DATABASE_URL del .env
if [ -f "$PROJECT_ROOT/backend-data/.env" ]; then
    DB_URL=$(grep "^DATABASE_URL=" "$PROJECT_ROOT/backend-data/.env" | cut -d'=' -f2)
    
    if [[ $DB_URL == *"tu_contraseña"* ]] || [[ $DB_URL == *"monitor239_app"* ]]; then
        echo -e "${YELLOW}⚠${NC} DATABASE_URL no configurado (usando valores de ejemplo)"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓${NC} DATABASE_URL configurado"
    fi
    
    # Intentar conexión a base de datos
    cd "$PROJECT_ROOT/backend-data"
    python3 -c "from app.core.database import engine; engine.connect()" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Conexión a base de datos exitosa"
    else
        echo -e "${RED}✗${NC} No se pudo conectar a la base de datos"
        echo -e "   ${YELLOW}→${NC} Verifica DATABASE_URL en .env"
        echo -e "   ${YELLOW}→${NC} Asegúrate de que la base de datos existe"
        echo -e "   ${YELLOW}→${NC} Verifica usuario y contraseña de MySQL"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} No se encontró backend-data/.env"
    ((ERRORS++))
fi

echo ""

# ===================================
# 6. VARIABLES DE ENTORNO
# ===================================
echo "6️⃣  Variables de Entorno:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_env_var() {
    local file=$1
    local var=$2
    local default=$3
    
    if [ -f "$file" ]; then
        value=$(grep "^${var}=" "$file" | cut -d'=' -f2)
        if [ -z "$value" ]; then
            echo -e "${YELLOW}⚠${NC} $var no está definido en $(basename $file)"
            ((ERRORS++))
        elif [ "$value" == "$default" ]; then
            echo -e "${YELLOW}⚠${NC} $var tiene valor por defecto en $(basename $file)"
            ((ERRORS++))
        else
            echo -e "${GREEN}✓${NC} $var configurado"
        fi
    fi
}

check_env_var "$PROJECT_ROOT/backend-data/.env" "JWT_SECRET" "cambia_esto_por_una_clave_segura_minimo_32_caracteres"
check_env_var "$PROJECT_ROOT/backend-gateway/.env" "JWT_SECRET" "cambia_esto_por_una_clave_segura_minimo_32_caracteres"
check_env_var "$PROJECT_ROOT/backend-data/.env" "FRONTEND_URL" ""

echo ""

# ===================================
# 7. SERVICIOS
# ===================================
echo "7️⃣  Servicios (APIs):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar Python App (puerto 3000)
curl -s http://127.0.0.1:3000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backend Python respondiendo en puerto 3000"
else
    echo -e "${YELLOW}⚠${NC} Backend Python NO responde en puerto 3000"
    echo -e "   ${YELLOW}→${NC} Configura Python App en cPanel"
fi

# Verificar Node.js App (puerto 3001)
curl -s http://127.0.0.1:3001/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Backend Gateway respondiendo en puerto 3001"
else
    echo -e "${YELLOW}⚠${NC} Backend Gateway NO responde en puerto 3001"
    echo -e "   ${YELLOW}→${NC} Configura Node.js App en cPanel"
fi

echo ""

# ===================================
# RESUMEN
# ===================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Instalación completa y correcta${NC}"
    echo ""
    echo "🎉 Tu aplicación está lista!"
    echo ""
    echo "URLs para probar:"
    echo "  • Frontend: https://monitor239web.com"
    echo "  • API Gateway: https://monitor239web.com/api/health"
    echo "  • Backend Data: https://monitor239web.com/data-api/health"
    echo "  • API Docs: https://monitor239web.com/data-api/docs"
else
    echo -e "${YELLOW}⚠️  Se encontraron $ERRORS problema(s)${NC}"
    echo ""
    echo "📋 Acciones requeridas:"
    echo "  1. Revisa los errores marcados arriba"
    echo "  2. Consulta la guía: SETUP_CPANEL_SIN_DOCKER.md"
    echo "  3. Verifica archivos .env"
    echo "  4. Configura Python App y Node.js App en cPanel"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
