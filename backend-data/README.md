# Backend Datos - Marketing & SEO Intelligence

Backend desarrollado con FastAPI + Python para integración con APIs externas

## 🗄️ Base de Datos

Este proyecto usa **PostgreSQL** como base de datos principal y **Alembic** para migraciones.

### Estructura de Base de Datos

La base de datos está diseñada para **SaaS multi-tenant** con las siguientes tablas principales:

- **organizations** - Organizaciones/Tenants
- **users** - Usuarios del sistema
- **roles** - Roles (admin, user, viewer)
- **user_roles** - Relación usuarios-roles
- **organization_settings** - Configuraciones por organización
- **keywords** - Keywords a trackear
- **accounts** - Cuentas conectadas (Google, Meta, LinkedIn, TikTok)
- **cities** - Ciudades para tracking local
- **seo_metrics** - Métricas de SEO
- **ads_metrics** - Métricas de publicidad
- **analytics_metrics** - Métricas de Analytics
- **gbp_metrics** - Métricas de Google Business Profile
- **sync_jobs** - Jobs de sincronización
- **sync_logs** - Logs de sincronización
- **alerts** - Alertas y notificaciones

## 🚀 Instalación

```bash
pip install -r requirements.txt
```

## 📊 Migraciones y Seeders

### Inicializar Base de Datos (Migraciones + Seeders)

```bash
# Opción 1: Script completo (recomendado)
python scripts/init_db.py

# Opción 2: Manual
# 1. Ejecutar migraciones
alembic upgrade head

# 2. Ejecutar seeders
python -m app.seeders.run_seeders
```

### Comandos de Migración

```bash
# Crear una nueva migración
alembic revision --autogenerate -m "descripción del cambio"

# Aplicar migraciones
alembic upgrade head

# Revertir última migración
alembic downgrade -1

# Ver historial de migraciones
alembic history

# Ver migración actual
alembic current
```

### Seeders

Los seeders crean datos iniciales:
- ✅ Roles del sistema (admin, user, viewer)
- ✅ Organización de demostración
- ✅ Usuarios de ejemplo (admin@demo.com, user@demo.com)
- ✅ Configuraciones iniciales
- ✅ Keywords de ejemplo
- ✅ Ciudades de ejemplo

**Credenciales por defecto:**
- Admin: `admin@demo.com` / `admin123`
- User: `user@demo.com` / `user123`

⚠️ **IMPORTANTE:** Cambiar estas contraseñas en producción.

## 🔧 Desarrollo

```bash
uvicorn main:app --reload
```

La API estará disponible en `http://localhost:8000`

## 📚 Documentación API

Una vez corriendo, accede a:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🔐 Variables de Entorno

Copia `.env.example` a `.env` y configura las variables necesarias:

```env
DATABASE_URL=postgresql://app:app@localhost:5432/marketing_seo
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
# ... otras variables
```

## 📁 Estructura

```
backend-data/
├── alembic/              # Migraciones Alembic
│   ├── versions/         # Archivos de migración
│   ├── env.py           # Configuración Alembic
│   └── script.py.mako   # Template para migraciones
├── app/
│   ├── api/             # Endpoints de la API
│   ├── core/            # Configuración y utilidades
│   ├── jobs/            # Jobs de sincronización (Celery)
│   ├── models/          # Modelos SQLAlchemy
│   ├── seeders/         # Seeders de datos iniciales
│   └── services/        # Servicios de integración con APIs externas
├── scripts/             # Scripts de utilidad
└── requirements.txt     # Dependencias Python
```

## 🏗️ Arquitectura Multi-Tenant

El sistema está diseñado para SaaS multi-tenant:
- Cada organización tiene sus propios datos aislados
- Los usuarios pertenecen a una organización
- Las métricas y configuraciones están vinculadas a organizaciones
- Soporte para múltiples planes (free, basic, pro, enterprise)

