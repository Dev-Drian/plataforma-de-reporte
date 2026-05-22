# 🚀 Configuración cPanel SIN Docker

Esta guía te ayudará a configurar el proyecto en cPanel sin usar Docker ni PostgreSQL.

## 📋 Requisitos Previos

- **MySQL**: Base de datos (incluida en cPanel)
- **Python 3.9+**: Configurado en cPanel
- **Node.js 18+**: Configurado en cPanel
- **Acceso SSH**: Para instalar dependencias

---

## 🗄️ Paso 1: Configurar Base de Datos MySQL

### 1.1 Crear Base de Datos

En cPanel → MySQL Databases:

1. Crear base de datos: `monitor239_marketing`
2. Crear usuario: `monitor239_app`
3. Establecer contraseña segura
4. Asignar **TODOS LOS PRIVILEGIOS** al usuario sobre la base de datos

### 1.2 Anotar Credenciales

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=monitor239_marketing
DB_USER=monitor239_app
DB_PASSWORD=tu_contraseña_segura
```

---

## ⚙️ Paso 2: Configurar Variables de Entorno

### 2.1 Backend Data (Python)

Crear archivo `/home/monitor239web/public_html/backend-data/.env`:

```bash
# Base de datos
DATABASE_URL=mysql+pymysql://monitor239_app:tu_contraseña@localhost:3306/monitor239_marketing

# JWT
JWT_SECRET=genera_una_clave_secura_aqui_min_32_caracteres

# URLs
FRONTEND_URL=https://monitor239web.com
API_GATEWAY_URL=https://monitor239web.com/api

# Redis (opcional - si no tienes Redis, el sistema funcionará igual)
REDIS_URL=redis://localhost:6379

# OAuth - Google
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# OAuth - Meta/Facebook
META_APP_ID=tu_meta_app_id
META_APP_SECRET=tu_meta_app_secret

# OAuth - LinkedIn
LINKEDIN_CLIENT_ID=tu_linkedin_client_id
LINKEDIN_CLIENT_SECRET=tu_linkedin_client_secret

# OAuth - TikTok
TIKTOK_CLIENT_ID=tu_tiktok_client_id
TIKTOK_CLIENT_SECRET=tu_tiktok_client_secret
```

### 2.2 Backend Gateway (Node.js)

Crear archivo `/home/monitor239web/public_html/backend-gateway/.env`:

```bash
NODE_ENV=production
PORT=3001

# JWT (debe ser la misma que backend-data)
JWT_SECRET=genera_una_clave_secura_aqui_min_32_caracteres

# Backend Data URL
FASTAPI_URL=http://127.0.0.1:3000

# URLs públicas
FRONTEND_URL=https://monitor239web.com
```

### 2.3 Frontend (React)

Crear archivo `/home/monitor239web/public_html/frontend/.env.production`:

```bash
VITE_API_URL=https://monitor239web.com/api
VITE_DATA_API_URL=https://monitor239web.com/data-api
```

---

## 🐍 Paso 3: Configurar Backend Python (FastAPI)

### 3.1 Instalar Dependencias

```bash
cd /home/monitor239web/public_html/backend-data

# Usar Python de cPanel (ajusta la versión según tu cPanel)
python3.9 -m pip install --user -r requirements.txt
```

### 3.2 Configurar Python en cPanel

1. Ve a **cPanel → Setup Python App**
2. Crea nueva aplicación:
   - **Python version**: 3.9 o superior
   - **Application root**: `/home/monitor239web/public_html/backend-data`
   - **Application URL**: `data-api`
   - **Application startup file**: `passenger_wsgi.py`
   - **Application Entry point**: `application`

### 3.3 Inicializar Base de Datos

```bash
cd /home/monitor239web/public_html/backend-data

# Ejecutar migraciones
python3.9 -m alembic upgrade head

# Inicializar datos
python3.9 scripts/init_db.py

# Seeders (opcional, para datos de prueba)
python3.9 -m app.seeders.run_seeders
```

### 3.4 Verificar que funciona

```bash
curl http://127.0.0.1:3000/health
# O prueba en: https://tudominio.com/data-api/docs
```

---

## 🚀 Paso 4: Configurar Backend Gateway (Node.js)

### 4.1 Instalar Dependencias

```bash
cd /home/monitor239web/public_html/backend-gateway

# Instalar Node modules
npm install --production

# Compilar TypeScript
npm run build
```

### 4.2 Configurar Node.js en cPanel

1. Ve a **cPanel → Setup Node.js App**
2. Crea nueva aplicación:
   - **Node.js version**: 18 o superior
   - **Application mode**: Production
   - **Application root**: `/home/monitor239web/public_html/backend-gateway`
   - **Application URL**: `api`
   - **Application startup file**: `dist/app.js`

### 4.3 Iniciar Aplicación

El servicio se iniciará automáticamente. Para reiniciar:
```bash
cd /home/monitor239web/public_html/backend-gateway
npm run build
# Luego reinicia la app desde cPanel → Setup Node.js App
```

---

## 🎨 Paso 5: Configurar Frontend (React)

### 5.1 Compilar Frontend (en tu máquina local)

```bash
cd frontend

# Instalar dependencias
npm install

# Compilar para producción
npm run build
```

Esto genera la carpeta `dist/` con archivos estáticos.

### 5.2 Subir a cPanel

Sube **solo** el contenido de `frontend/dist/` a:
```
/home/monitor239web/public_html/
```

**Estructura final:**
```
/home/monitor239web/public_html/
  ├── index.html          ← del frontend
  ├── assets/             ← del frontend
  ├── .htaccess          ← configuración de Apache
  ├── backend-data/      ← API Python
  ├── backend-gateway/   ← API Node.js
  └── ...
```

---

## 🔧 Paso 6: Configurar .htaccess

Edita `/home/monitor239web/public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Redirigir /data-api al backend Python
  RewriteRule ^data-api/(.*)$ http://127.0.0.1:3000/$1 [P,L]

  # Redirigir /api al backend Node.js
  RewriteRule ^api/(.*)$ http://127.0.0.1:3001/$1 [P,L]

  # Frontend - Redirigir todas las rutas a index.html (SPA)
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_URI} !^/data-api
  RewriteCond %{REQUEST_URI} !^/api
  RewriteRule . /index.html [L]
</IfModule>

# Habilitar mod_proxy
<IfModule mod_proxy.c>
  ProxyPreserveHost On
  ProxyRequests Off
</IfModule>

# Comprimir archivos estáticos
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache para archivos estáticos
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/json "access plus 0 seconds"
</IfModule>
```

---

## ✅ Paso 7: Verificar Instalación

### URLs a probar:

1. **Frontend**: https://monitor239web.com
2. **API Gateway**: https://monitor239web.com/api/health
3. **Backend Data**: https://monitor239web.com/data-api/health
4. **API Docs**: https://monitor239web.com/data-api/docs

### Comandos de verificación:

```bash
# Verificar Python App
curl http://127.0.0.1:3000/health

# Verificar Node.js App
curl http://127.0.0.1:3001/health

# Ver logs Python
tail -f /home/monitor239web/logs/data-api.log

# Ver logs Node.js
tail -f /home/monitor239web/logs/api.log
```

---

## 🔄 Actualizaciones y Mantenimiento

### Actualizar Backend Python

```bash
cd /home/monitor239web/public_html/backend-data
git pull
python3.9 -m pip install --user -r requirements.txt
python3.9 -m alembic upgrade head
# Reiniciar desde cPanel → Setup Python App
```

### Actualizar Backend Node.js

```bash
cd /home/monitor239web/public_html/backend-gateway
git pull
npm install
npm run build
# Reiniciar desde cPanel → Setup Node.js App
```

### Actualizar Frontend

```bash
# En tu máquina local
cd frontend
git pull
npm install
npm run build

# Subir dist/ a cPanel
```

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

1. Verifica credenciales en `.env`
2. Verifica que el usuario MySQL tenga privilegios
3. Prueba conexión: `python3.9 -c "from app.core.database import engine; print(engine.connect())"`

### Error: "Module not found"

```bash
cd backend-data
python3.9 -m pip install --user -r requirements.txt
```

### Error: Node.js no inicia

1. Verifica que `dist/app.js` existe
2. Ejecuta: `npm run build`
3. Revisa logs en cPanel

### Frontend muestra página en blanco

1. Verifica que `.env.production` tenga las URLs correctas
2. Recompila: `npm run build`
3. Sube nuevamente a cPanel

---

## 📝 Notas Importantes

1. **Sin Redis**: Si no tienes Redis, el cache simplemente no funcionará, pero la app sí.
2. **Sin Docker**: Todo corre directamente en cPanel usando Python App y Node.js App.
3. **MySQL en vez de PostgreSQL**: El proyecto ya está configurado para MySQL.
4. **Passenger WSGI**: cPanel usa Passenger para ejecutar aplicaciones Python.
5. **PM2**: cPanel gestiona Node.js automáticamente, no necesitas PM2.

---

## 🔐 Seguridad

1. Cambia `JWT_SECRET` por una clave segura (mínimo 32 caracteres)
2. Usa contraseñas seguras para MySQL
3. Mantén `.env` fuera de `public_html` o protégelo:
   ```apache
   # En .htaccess
   <Files ".env">
     Order allow,deny
     Deny from all
   </Files>
   ```

---

## 📞 Soporte

Si tienes problemas, revisa:
- Logs de Python: `/home/monitor239web/logs/`
- Logs de Node.js: `/home/monitor239web/logs/`
- Logs de Apache: cPanel → Error Log

---

¡Listo! 🎉 Tu aplicación debería estar funcionando sin Docker ni PostgreSQL.
