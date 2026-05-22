# 🔄 Scripts de Rebuild

Scripts para reconstruir y desplegar la aplicación en el servidor cPanel.

## 📋 Scripts Disponibles

### 1. `rebuild-all.sh` - Rebuild Completo
Reconstruye y reinicia **todo**: Backend Python, Backend Gateway y Frontend.

```bash
./rebuild-all.sh
```

**Usa este cuando:**
- Haces cambios en múltiples partes del proyecto
- Quieres actualizar todo de una vez
- Después de hacer `git pull` con cambios en varios componentes

---

### 2. `rebuild-frontend.sh` - Solo Frontend
Reconstruye y despliega **solo el frontend** (React).

```bash
./rebuild-frontend.sh
```

**Usa este cuando:**
- Solo cambias archivos en `/frontend/src/`
- Modificas componentes, páginas o estilos
- Actualizas el UI sin tocar el backend
- Es el más rápido ⚡ (~30 segundos)

---

### 3. `rebuild-backend.sh` - Solo Backend Python
Reconstruye y reinicia **solo el backend Python** (FastAPI).

```bash
./rebuild-backend.sh
```

**Usa este cuando:**
- Cambias archivos en `/backend-data/`
- Modificas APIs, servicios o modelos
- Agregas nuevas migraciones de base de datos
- Tarda ~1-2 minutos

---

### 4. `rebuild-gateway.sh` - Solo Gateway
Reconstruye y reinicia **solo el backend Gateway** (Node.js).

```bash
./rebuild-gateway.sh
```

**Usa este cuando:**
- Cambias archivos en `/backend-gateway/src/`
- Modificas rutas, middlewares o controladores
- Actualizas la capa de autenticación
- Tarda ~30-60 segundos

---

## 🚀 Uso Rápido

```bash
# Navegar al directorio
cd /home/monitor239web/public_html

# Solo frontend (más común)
./rebuild-frontend.sh

# Solo backend Python
./rebuild-backend.sh

# Solo gateway
./rebuild-gateway.sh

# Todo completo
./rebuild-all.sh
```

---

## 📝 ¿Qué hace cada script?

### Frontend
1. Instala dependencias (`npm install`)
2. Compila React con Vite (`npm run build`)
3. Copia archivos a `/public_html/`

### Backend Python
1. Detiene proceso uvicorn actual
2. Instala dependencias Python
3. Ejecuta migraciones de base de datos
4. Inicia uvicorn en puerto 3000

### Backend Gateway
1. Detiene proceso Node.js actual
2. Instala dependencias Node.js
3. Compila TypeScript
4. Inicia servidor Gateway

---

## 🔍 Ver Logs

```bash
# Logs Backend Python
tail -f backend-data/backend-python.log

# Logs Backend Gateway
tail -f backend-gateway/backend-gateway.log

# Ver procesos corriendo
ps aux | grep -E '(uvicorn|node dist)' | grep -v grep
```

---

## 🛑 Detener Servicios

```bash
# Detener Backend Python
pkill -f 'uvicorn main:app'

# Detener Backend Gateway
pkill -f 'node dist/app.js'

# Detener todo
pkill -f 'uvicorn main:app' && pkill -f 'node dist/app.js'
```

---

## ⚠️ Notas Importantes

1. **Permisos**: Los scripts deben ser ejecutables
   ```bash
   chmod +x rebuild-*.sh
   ```

2. **Python**: El script usa `/opt/alt/python311/bin/python3.11`
   - Si tu versión es diferente, edita la variable `PYTHON_CMD` en `rebuild-backend.sh`

3. **Logs**: Los logs se guardan en:
   - `backend-data/backend-python.log`
   - `backend-gateway/backend-gateway.log`

4. **Tiempo**: 
   - Frontend: ~30 seg
   - Backend: ~1-2 min
   - Gateway: ~30-60 seg
   - Todo: ~3-4 min

---

## 🎯 Flujo de Trabajo Recomendado

### Desarrollo Normal (cambios en frontend)
```bash
# 1. Haces cambios en frontend/src/
# 2. Rebuild solo frontend
./rebuild-frontend.sh
```

### Cambios en API (cambios en backend)
```bash
# 1. Haces cambios en backend-data/
# 2. Rebuild backend
./rebuild-backend.sh
```

### Después de git pull
```bash
# Si hay cambios en todo
./rebuild-all.sh

# O uno por uno según lo que cambió
./rebuild-frontend.sh  # Si solo cambió frontend
./rebuild-backend.sh   # Si solo cambió backend
```

---

## ✅ Verificación

Después de rebuild, verifica:

1. **Frontend**: https://monitor.239web.com
2. **Backend Python**: http://127.0.0.1:3000/health
3. **Backend Docs**: http://127.0.0.1:3000/docs
4. **API Pública**: https://monitor.239web.com/api/health
5. **Data API**: https://monitor.239web.com/data-api/health

---

## 🐛 Troubleshooting

### Frontend no actualiza
```bash
# Limpia cache del navegador (Ctrl+Shift+R)
# O ejecuta:
rm -rf assets/*
./rebuild-frontend.sh
```

### Backend no inicia
```bash
# Ver logs
tail -50 backend-data/backend-python.log

# Verificar proceso
ps aux | grep uvicorn

# Reiniciar
pkill -f uvicorn
./rebuild-backend.sh
```

### Gateway no responde
```bash
# Ver logs
tail -50 backend-gateway/backend-gateway.log

# Verificar proceso
ps aux | grep 'node dist'

# Reiniciar
pkill -f 'node dist'
./rebuild-gateway.sh
```

---

## 📞 Ayuda

Si algo falla:
1. Revisa los logs
2. Verifica que los procesos estén corriendo
3. Asegúrate de tener las variables de entorno configuradas (`.env`)
4. Verifica permisos de archivos

---

**¡Listo! Ahora puedes rebuild rápidamente cualquier parte del proyecto. 🚀**
