# 📋 Resumen de Scripts de Rebuild

## ✅ Scripts Creados

Se crearon **4 scripts** para facilitar el rebuild y deploy:

### 1️⃣ `rebuild-all.sh`
**Rebuild completo de todo el proyecto**
- Backend Python (FastAPI)
- Backend Gateway (Node.js)
- Frontend (React)

```bash
./rebuild-all.sh
```

### 2️⃣ `rebuild-backend.sh`
**Solo Backend Python**
- Instala dependencias Python
- Ejecuta migraciones de DB
- Reinicia uvicorn

```bash
./rebuild-backend.sh
```

### 3️⃣ `rebuild-gateway.sh`
**Solo Backend Gateway (Node.js)**
- Instala dependencias npm
- Compila TypeScript
- Reinicia servidor Node

```bash
./rebuild-gateway.sh
```

### 4️⃣ `rebuild-frontend.sh`
**Solo Frontend (React)**
- Instala dependencias npm
- Compila con Vite
- Copia archivos a public_html

```bash
./rebuild-frontend.sh
```

---

## 🛠️ Cambios Realizados

### Frontend
✅ Página Analytics actualizada con:
- Selector de tipo de cuenta (como en Ads)
- Manejo de errores mejorado
- UI consistente con PageHeader

### Backend Gateway
✅ Fix para `/api/analytics/`
- Agregado endpoint root que retorna lista de endpoints disponibles
- Ya no da error "Cannot GET /api/analytics/"

### Scripts
✅ Scripts de rebuild modulares
- Cada componente tiene su propio script
- `rebuild-all.sh` los ejecuta todos
- Logs claros y coloridos

---

## 📝 Uso Diario

### Cambios en Frontend
```bash
./rebuild-frontend.sh
```

### Cambios en Backend
```bash
./rebuild-backend.sh
```

### Cambios en Gateway
```bash
./rebuild-gateway.sh
```

### Cambios en Todo
```bash
./rebuild-all.sh
```

---

## 🔍 Verificación

Después de cualquier rebuild:

```bash
# Ver procesos
ps aux | grep -E '(uvicorn|node dist)' | grep -v grep

# Ver logs Python
tail -f backend-data/backend-python.log

# Ver logs Gateway
tail -f backend-gateway/backend-gateway.log

# Test endpoints
curl http://127.0.0.1:3000/health      # Backend Python
curl http://127.0.0.1:3001/api/health  # Gateway
```

---

## 📚 Documentación

- `REBUILD-SCRIPTS.md` - Guía completa de uso de scripts
- Scripts están en `/home/monitor239web/public_html/`
- Todos son ejecutables (chmod +x)

---

## 🎯 Próximos Pasos

1. Prueba cada script individualmente
2. Verifica que los servicios reinicien correctamente
3. Usa el script específico según lo que cambies
4. Revisa logs si algo falla

---

**¡Todo listo para desarrollo rápido! 🚀**
