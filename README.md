# Marketing & SEO Intelligence Platform

Plataforma SaaS para gestión integral de métricas de Marketing y SEO con integración multi-plataforma.

## 🏗️ Arquitectura

La plataforma está dividida en 3 repositorios principales:

1. **Frontend** - React + TypeScript + Vite + Tailwind CSS
2. **Backend Gateway** - Express + Node.js + TypeScript
3. **Backend Datos** - FastAPI + Python

## 📁 Estructura del Proyecto

```
.
├── frontend/              # Frontend React
├── backend-gateway/       # API Gateway Express
├── backend-data/          # Backend FastAPI para datos
└── infrastructure/        # Docker, docker-compose, nginx
```

## 🚀 Inicio Rápido

### Opción 1: Docker Compose - Modo Desarrollo (con Hot-Reload) ⚡

**Recomendado para desarrollo:** Los cambios en el código se reflejan automáticamente **SIN necesidad de rebuild**.

#### Primera vez (construir imágenes):
```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml up --build
```

#### Desarrollo diario (sin rebuild):
```bash
# Windows
cd infrastructure
dev.bat

# Linux/Mac
cd infrastructure
./dev.sh

# O manualmente:
docker-compose -f docker-compose.dev.yml up
```

**Características:**
- ✅ Hot-reload automático en Frontend (Vite) - Cambios instantáneos
- ✅ Hot-reload automático en Backend Gateway (tsx watch) - Reinicio automático
- ✅ Hot-reload automático en Backend Data (uvicorn --reload) - Reinicio automático
- ✅ **NO necesitas rebuild** cuando modificas código
- ✅ Solo necesitas rebuild si agregas dependencias o cambias Dockerfiles

📖 **Ver guía completa**: [infrastructure/README-DEV.md](infrastructure/README-DEV.md)

### Opción 2: Docker Compose - Modo Producción

```bash
cd infrastructure
cp env/.env.example .env
# Edita .env con tus configuraciones
docker-compose up -d
```

### Opción 3: Desarrollo Local

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend Gateway
```bash
cd backend-gateway
npm install
cp .env.example .env
npm run dev
```

#### Backend Datos
```bash
cd backend-data
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

## 🔗 URLs

- Frontend: http://localhost:3000
- Gateway API: http://localhost:4000
- Data API: http://localhost:8000
- Data API Docs: http://localhost:8000/docs

## 🔑 Variables de Entorno

Cada componente tiene su archivo `.env.example`. Copia y configura según tus necesidades.

## 📚 Documentación

- [Frontend README](frontend/README.md)
- [Backend Gateway README](backend-gateway/README.md)
- [Backend Datos README](backend-data/README.md)

## 🛠️ Tecnologías

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts
- **Gateway**: Express, TypeScript, JWT, Axios
- **Backend Data**: FastAPI, Python, SQLAlchemy, Celery
- **Base de Datos**: MySQL 8 (pymysql), Redis
- **Infraestructura**: Docker, Docker Compose, Nginx

## 🔐 Roles (SaaS-ready)
- `admin` (control total, gestión de usuarios/planes)
- `analyst` (operativo, puede editar configuraciones de datos)
- `viewer` (solo lectura)

> Facturación: deja variables preparadas (Stripe) para activarlas cuando se integre.

## 📝 Próximos Pasos

1. Configurar autenticación OAuth para Google, Meta, LinkedIn, TikTok
2. Implementar integraciones con APIs externas
3. Configurar jobs de sincronización automática
4. Implementar multi-tenancy para SaaS
5. Agregar tests unitarios e integración

## 📄 Licencia

MIT

