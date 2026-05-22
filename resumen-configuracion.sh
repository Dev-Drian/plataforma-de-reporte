#!/bin/bash

# ===================================
# RESUMEN DE CONFIGURACIÓN
# ===================================

cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║          CONFIGURACIÓN COMPLETADA - cPanel                    ║
╚═══════════════════════════════════════════════════════════════╝

✅ ARCHIVOS .env CREADOS CON TUS CREDENCIALES:

📁 Backend Python:
   • Ubicación: /home/monitor239web/public_html/backend-data/.env
   • Base de datos: monitor239web_bd
   • Usuario MySQL: root
   • JWT_SECRET: ✓ Configurado (generado automáticamente)

📁 Backend Gateway:
   • Ubicación: /home/monitor239web/public_html/backend-gateway/.env
   • Puerto: 3001
   • JWT_SECRET: ✓ Configurado (mismo que backend-data)

📁 Frontend:
   • Ubicación: /home/monitor239web/public_html/frontend/.env.production
   • URLs: ✓ Configuradas para monitor239web.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 PRÓXIMOS PASOS:

1️⃣  INSTALAR DEPENDENCIAS:
   ./install-cpanel.sh

2️⃣  INICIALIZAR BASE DE DATOS:
   ./init-database.sh

3️⃣  CONFIGURAR EN cPanel:
   
   Python App (Setup Python App):
   • Application root: /home/monitor239web/public_html/backend-data
   • Application URL: data-api
   • Application startup file: passenger_wsgi.py
   • Python version: 3.6 o superior
   
   Node.js App (Setup Node.js App):
   • Application root: /home/monitor239web/public_html/backend-gateway
   • Application URL: api
   • Application startup file: dist/app.js
   • Node.js version: 18 o superior

4️⃣  COMPILAR FRONTEND (en tu máquina local):
   cd frontend
   npm install
   npm run build
   
   # Subir contenido de dist/ a:
   # /home/monitor239web/public_html/

5️⃣  ACTUALIZAR .htaccess:
   # Reemplaza el .htaccess actual con .htaccess.nuevo
   cp .htaccess.nuevo .htaccess

6️⃣  VERIFICAR INSTALACIÓN:
   ./verificar-instalacion.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 DOCUMENTACIÓN:
   • Guía completa: SETUP_CPANEL_SIN_DOCKER.md
   • Inicio rápido: INICIO-RAPIDO.md

🌐 URLs FINALES:
   • Frontend: https://monitor239web.com
   • API Gateway: https://monitor239web.com/api/health
   • Backend Data: https://monitor239web.com/data-api/health
   • API Docs: https://monitor239web.com/data-api/docs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  NOTAS DE SEGURIDAD:
   • Archivos .env protegidos (chmod 600)
   • JWT_SECRET único generado
   • NO expongas estos archivos en GitHub
   • Credenciales de MySQL guardadas de forma segura

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 COMANDOS RÁPIDOS:
   ./install-cpanel.sh         # Instalar dependencias
   ./init-database.sh          # Inicializar BD
   ./verificar-instalacion.sh  # Verificar todo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

# Verificar Python
echo "🐍 Python disponible:"
python3 --version 2>/dev/null || echo "   ⚠️  Python no encontrado"

# Verificar Node.js
echo ""
echo "🚀 Node.js disponible:"
node --version 2>/dev/null || echo "   ⚠️  Node.js no encontrado"

# Verificar MySQL
echo ""
echo "🗄️  MySQL disponible:"
mysql --version 2>/dev/null || echo "   ⚠️  MySQL no encontrado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
