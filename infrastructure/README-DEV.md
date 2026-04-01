# 🚀 Guía de Desarrollo con Docker - Hot Reload

## ⚡ Inicio Rápido (Modo Desarrollo)

### Windows
```bash
cd infrastructure
dev.bat
```

### Linux/Mac
```bash
cd infrastructure
./dev.sh
```

### O manualmente:
```bash
cd infrastructure
docker-compose -f docker-compose.dev.yml up
```

## ✅ ¿Qué es Hot-Reload?

**Hot-reload** significa que cuando modificas código en tu editor, los cambios se reflejan **automáticamente** en los contenedores **SIN necesidad de hacer rebuild**.

### Cómo funciona:

1. **Volúmenes montados**: El código fuente está montado como volumen en los contenedores
2. **Watch mode activado**: Cada servicio tiene su modo "watch" activado:
   - **Frontend**: Vite detecta cambios y recarga automáticamente
   - **Gateway**: `tsx watch` detecta cambios TypeScript y reinicia
   - **Backend Data**: `uvicorn --reload` detecta cambios Python y reinicia

## 📝 Flujo de Trabajo

1. **Primera vez** (solo una vez):
   ```bash
   cd infrastructure
   docker-compose -f docker-compose.dev.yml up --build
   ```
   Esto construye las imágenes iniciales.

2. **Desarrollo diario** (sin rebuild):
   ```bash
   cd infrastructure
   docker-compose -f docker-compose.dev.yml up
   ```
   O usa los scripts: `dev.bat` (Windows) o `./dev.sh` (Linux/Mac)

3. **Modifica código** en tu editor:
   - Frontend: `frontend/src/` → Cambios se ven en http://localhost:3000
   - Gateway: `backend-gateway/src/` → Cambios se aplican automáticamente
   - Backend Data: `backend-data/app/` → Cambios se aplican automáticamente

4. **No necesitas hacer rebuild** a menos que:
   - Agregues nuevas dependencias (package.json, requirements.txt)
   - Cambies Dockerfiles
   - Cambies configuración de Docker Compose

## 🔄 Cuándo SÍ necesitas rebuild

Solo necesitas rebuild cuando:

### 1. Agregas nuevas dependencias
```bash
# Si agregas un nuevo paquete en package.json o requirements.txt
docker-compose -f docker-compose.dev.yml up --build
```

### 2. Cambias Dockerfiles
```bash
# Si modificas Dockerfile.dev
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up
```

### 3. Cambias docker-compose.dev.yml
```bash
# Si modificas la configuración de docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

## 🛑 Detener los servicios

```bash
# Presiona Ctrl+C en la terminal donde está corriendo
# O en otra terminal:
cd infrastructure
docker-compose -f docker-compose.dev.yml down
```

## 🧹 Limpiar todo (si algo falla)

```bash
cd infrastructure

# Detener y eliminar contenedores
docker-compose -f docker-compose.dev.yml down

# Eliminar volúmenes (CUIDADO: borra datos de BD)
docker-compose -f docker-compose.dev.yml down -v

# Reconstruir desde cero
docker-compose -f docker-compose.dev.yml up --build --force-recreate
```

## 📊 Ver logs de un servicio específico

```bash
# Ver logs del backend-data
docker logs -f marketing-seo-backend-data-dev

# Ver logs del gateway
docker logs -f marketing-seo-gateway-dev

# Ver logs del frontend
docker logs -f marketing-seo-frontend-dev
```

## 🔍 Verificar que hot-reload funciona

1. Inicia los servicios: `docker-compose -f docker-compose.dev.yml up`
2. Abre http://localhost:3000
3. Modifica un archivo en `frontend/src/`
4. Guarda el archivo
5. **Deberías ver** el cambio automáticamente en el navegador (Vite recarga)

## ⚠️ Problemas Comunes

### "Los cambios no se reflejan"
- Verifica que estés usando `docker-compose.dev.yml` (no el de producción)
- Verifica que los volúmenes estén montados correctamente
- Revisa los logs: `docker logs marketing-seo-frontend-dev`

### "Error al iniciar"
- Verifica que los puertos 3000, 4000, 8000 no estén en uso
- Revisa los logs: `docker-compose -f docker-compose.dev.yml logs`

### "Module not found" después de agregar dependencias
- Necesitas rebuild: `docker-compose -f docker-compose.dev.yml up --build`

## 🎯 Resumen

✅ **Hot-reload activado**: Modifica código → Cambios automáticos  
❌ **NO necesitas rebuild** para cambios de código  
✅ **SÍ necesitas rebuild** para nuevas dependencias o cambios en Dockerfiles

