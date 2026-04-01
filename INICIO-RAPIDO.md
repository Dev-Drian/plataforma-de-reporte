# 🚀 INICIO RÁPIDO - cPanel sin Docker

## ⚡ Instalación Rápida

```bash
# 1. Ejecuta el instalador
cd /home/monitor239web/public_html
./install-cpanel.sh

# 2. Edita los archivos .env con tus credenciales
nano backend-data/.env
nano backend-gateway/.env

# 3. Crea la base de datos en cPanel
# Ve a: cPanel → MySQL Databases
# Crea: monitor239_marketing
# Usuario: monitor239_app

# 4. Inicializa la base de datos
cd backend-data
python3.9 -m alembic upgrade head
python3.9 scripts/init_db.py

# 5. Configura las aplicaciones en cPanel
# Python App:  Application URL = data-api, Root = backend-data
# Node.js App: Application URL = api, Root = backend-gateway

# 6. Compila el frontend (en tu máquina local)
cd frontend
npm install
npm run build
# Sube dist/ a public_html/

# 7. Verifica instalación
cd /home/monitor239web/public_html
./verificar-instalacion.sh
```

## 📖 Documentación Completa

Lee **[SETUP_CPANEL_SIN_DOCKER.md](SETUP_CPANEL_SIN_DOCKER.md)** para instrucciones detalladas.

## 🔧 Comandos Útiles

```bash
# Ver estado de servicios
./verificar-instalacion.sh

# Reiniciar Python App
# Ve a: cPanel → Setup Python App → Restart

# Reiniciar Node.js App  
# Ve a: cPanel → Setup Node.js App → Restart

# Ver logs Python
tail -f ~/logs/data-api.log

# Ver logs Node.js
tail -f ~/logs/api.log
```

## 📝 Checklist de Instalación

- [ ] Ejecutar `install-cpanel.sh`
- [ ] Editar `backend-data/.env`
- [ ] Editar `backend-gateway/.env`
- [ ] Crear base de datos MySQL en cPanel
- [ ] Configurar DATABASE_URL en .env
- [ ] Ejecutar migraciones: `alembic upgrade head`
- [ ] Inicializar BD: `python scripts/init_db.py`
- [ ] Configurar Python App en cPanel
- [ ] Configurar Node.js App en cPanel
- [ ] Compilar frontend localmente
- [ ] Subir frontend a public_html/
- [ ] Verificar `.htaccess` (usar `.htaccess.nuevo` si es necesario)
- [ ] Ejecutar `verificar-instalacion.sh`
- [ ] Probar URLs en el navegador

## 🌐 URLs de Prueba

- Frontend: https://monitor239web.com
- API Gateway: https://monitor239web.com/api/health
- Backend Data: https://monitor239web.com/data-api/health
- API Docs: https://monitor239web.com/data-api/docs

## ⚠️ Problemas Comunes

### Error: "Cannot connect to database"
```bash
# Verifica credenciales
mysql -u monitor239_app -p monitor239_marketing
# Si no conecta, verifica DATABASE_URL en .env
```

### Error: "Module not found"
```bash
cd backend-data
python3.9 -m pip install --user -r requirements.txt
```

### Backend no responde
```bash
# Reinicia las aplicaciones desde cPanel
# O verifica logs en ~/logs/
```

## 📞 Soporte

- **Guía completa**: [SETUP_CPANEL_SIN_DOCKER.md](SETUP_CPANEL_SIN_DOCKER.md)
- **Arquitectura**: [DASHBOARD-ARCHITECTURE.md](DASHBOARD-ARCHITECTURE.md)
- **Logs**: `~/logs/`

---

**Nota**: Este proyecto NO requiere Docker ni PostgreSQL. Usa MySQL de cPanel y corre directamente con Python App y Node.js App.
