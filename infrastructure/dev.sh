#!/bin/bash
# Script para iniciar Docker en modo desarrollo con hot-reload
# No requiere rebuild cuando cambias código

echo "========================================"
echo "🚀 Iniciando Docker en modo DESARROLLO"
echo "========================================"
echo ""
echo "✅ Hot-reload activado:"
echo "   - Frontend: Cambios instantáneos (Vite)"
echo "   - Gateway: Cambios instantáneos (tsx watch)"
echo "   - Backend Data: Cambios instantáneos (uvicorn --reload)"
echo ""
echo "📝 Modifica el código y los cambios se reflejarán automáticamente"
echo "   NO necesitas hacer rebuild!"
echo ""
echo "Para detener: Ctrl+C o ejecuta: docker-compose -f docker-compose.dev.yml down"
echo ""

cd "$(dirname "$0")"
docker-compose -f docker-compose.dev.yml up


