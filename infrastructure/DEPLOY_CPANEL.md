# 🚀 Guía de Despliegue en cPanel

## Arquitectura

```
Internet → Apache (cPanel, puertos 80/443) → Docker Containers (127.0.0.1)
```

Apache actúa como reverse proxy. Docker solo corre servicios internos.

## Pasos de Despliegue

### 1. Construir Frontend Estático

En tu máquina local:

```bash
cd frontend
npm install
npm run build
```

Esto crea la carpeta `dist/` con los archivos estáticos.

### 2. Subir Frontend a cPanel

Sube el contenido de `frontend/dist/` a:
```
/home/portal239/public_html/
```

Debe quedar así:
```
/home/portal239/public_html/
  ├── index.html
  ├── assets/
  │   ├── index-xxx.js
  │   └── index-xxx.css
  └── .htaccess
```

### 3. Configurar .htaccess

Copia el archivo `.htaccess.cpanel` a `/home/portal239/public_html/.htaccess`:

```bash
cp infrastructure/.htaccess.cpanel /home/portal239/public_html/.htaccess
chmod 644 /home/portal239/public_html/.htaccess
```

### 4. Configurar Docker Compose

El `docker-compose.yml` ya está configurado para cPanel:
- ✅ Sin nginx
- ✅ Sin frontend en Docker
- ✅ Backends solo en localhost (127.0.0.1)
- ✅ PostgreSQL y Redis sin puertos expuestos

### 5. Iniciar Servicios Docker

```bash
cd /home/portal239/public_html/infrastructure
docker compose up -d
```

### 6. Verificar Servicios

```bash
# Ver estado
docker compose ps

# Ver logs
docker compose logs -f

# Probar APIs
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:8000/health
```

### 7. Inicializar Base de Datos

```bash
# Migraciones
docker compose exec backend-data alembic upgrade head

# Inicializar BD
docker compose exec backend-data python scripts/init_db.py

# Seeders
docker compose exec backend-data python -m app.seeders.run_seeders
```

## URLs Finales

- **Frontend**: `http://portal.239web.com`
- **API Gateway**: `http://portal.239web.com/api`
- **Backend Data API**: `http://portal.239web.com/data-api`
- **API Docs**: `http://portal.239web.com/data-api/docs`

## Configuración de Variables de Entorno

Edita `/home/portal239/public_html/infrastructure/.env`:

```env
POSTGRES_USER=app
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO
POSTGRES_DB=marketing_seo
JWT_SECRET=TU_JWT_SECRET_MUY_SEGURO
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# etc...
```

## Comandos Útiles

```bash
# Reiniciar servicios
docker compose restart

# Ver logs
docker compose logs -f

# Detener todo
docker compose down

# Actualizar código
git pull
docker compose build
docker compose up -d
```

## Troubleshooting

### Error 502 Bad Gateway
- Verificar que los servicios Docker están corriendo: `docker compose ps`
- Verificar que responden: `curl http://127.0.0.1:4000/health`

### Frontend no carga
- Verificar que los archivos de `dist/` están en `public_html/`
- Verificar que `index.html` existe
- Verificar permisos: `chmod 644 index.html`

### APIs no funcionan
- Verificar `.htaccess` está en `public_html/`
- Verificar que `mod_proxy` está habilitado (ya está por defecto)
- Ver logs de Apache: `tail -f /home/portal239/logs/error_log`
