# ⚠️ NOTAS IMPORTANTES PARA TU SERVIDOR

## ✅ Lo que ya está configurado:

1. **Archivos .env creados** con tus credenciales:
   - Base de datos: `monitor239web_bd`
   - Usuario: `root`
   - JWT_SECRET generado automáticamente
   - URLs configuradas para monitor239web.com

2. **Python 3.6.8** instalado y disponible

3. **MySQL 8.0.45** instalado y disponible

## ⚠️ Lo que necesitas hacer:

### 1. INSTALAR NODE.JS EN cPanel

Node.js NO está instalado en el servidor. Tienes 2 opciones:

#### Opción A: Instalar desde cPanel (RECOMENDADO)
1. Entra a cPanel
2. Busca "Setup Node.js App" o "Node.js Selector"
3. Instala Node.js versión 18 o superior
4. Crea una nueva aplicación Node.js

#### Opción B: Instalar manualmente con nvm
```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Instalar Node.js 18
nvm install 18
nvm use 18
```

### 2. ACTUALIZAR PYTHON (RECOMENDADO)

Tu servidor tiene Python 3.6.8, que es antiguo. Muchas librerías modernas requieren Python 3.9+.

**En cPanel:**
1. Ve a "Setup Python App" o "Python Selector"
2. Selecciona Python 3.9 o superior si está disponible

**Si no está disponible:** Contacta a tu proveedor de hosting o usa Python 3.6 (puede que algunas dependencias no funcionen).

### 3. VERIFICAR CREDENCIALES DE MYSQL

La contraseña que proporcionaste (`Adecas2020*`) tiene caracteres especiales. 

**Verifica que la base de datos existe:**
```bash
mysql -uroot -p
# Ingresa tu contraseña cuando te la pida
# Luego ejecuta:
SHOW DATABASES;
# Debe aparecer: monitor239web_bd
```

Si la base de datos **NO existe**, créala:
```sql
CREATE DATABASE monitor239web_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. VERIFICAR PERMISOS

```bash
# Asegúrate de que tienes permisos
ls -la /home/monitor239web/public_html/backend-data/.env
# Debe mostrar: -rw------- (600)
```

## 📋 CHECKLIST COMPLETO:

- [x] ✅ Archivos .env creados
- [x] ✅ JWT_SECRET generado
- [x] ✅ Python disponible (3.6.8)
- [x] ✅ MySQL disponible (8.0.45)
- [ ] ⚠️  Node.js (PENDIENTE - REQUERIDO)
- [ ] ⚠️  Verificar base de datos existe
- [ ] 📝 Instalar dependencias Python
- [ ] 📝 Instalar dependencias Node.js
- [ ] 📝 Inicializar base de datos
- [ ] 📝 Configurar Python App en cPanel
- [ ] 📝 Configurar Node.js App en cPanel
- [ ] 📝 Compilar y subir frontend
- [ ] 📝 Actualizar .htaccess

## 🚀 PASOS SIGUIENTES (EN ORDEN):

### 1. Instalar Node.js (CRÍTICO)
```bash
# Desde cPanel → Setup Node.js App
# O manualmente con nvm (ver arriba)
```

### 2. Verificar base de datos
```bash
mysql -uroot -p
# Ingresa: Adecas2020*
# Ejecuta: SHOW DATABASES;
```

### 3. Instalar dependencias Python
```bash
cd /home/monitor239web/public_html
./install-cpanel.sh
```

### 4. Inicializar base de datos
```bash
cd /home/monitor239web/public_html
./init-database.sh
```

### 5. Configurar aplicaciones en cPanel
- Python App para backend-data (puerto 3000)
- Node.js App para backend-gateway (puerto 3001)

### 6. Compilar frontend (en tu máquina local)
```bash
cd frontend
npm install
npm run build
# Subir dist/ a public_html/
```

### 7. Actualizar .htaccess
```bash
cp .htaccess.nuevo .htaccess
```

### 8. Verificar instalación
```bash
./verificar-instalacion.sh
```

## 🔍 TROUBLESHOOTING:

### "Access denied for user 'root'@'localhost'"
- Verifica la contraseña con: `mysql -uroot -p` e ingresa manualmente
- Si no funciona, puede que el usuario root esté restringido en cPanel
- Crea un nuevo usuario desde cPanel → MySQL Databases

### "python3: command not found" o "python3.9: command not found"
- Usa `python3` en lugar de `python3.9`
- O instala Python 3.9+ desde cPanel

### "node: command not found"
- Node.js NO está instalado
- Instálalo desde cPanel → Setup Node.js App

### Dependencias de Python no se instalan
- Puede ser por Python 3.6 (muy antiguo)
- Actualiza a Python 3.9+ desde cPanel
- O contacta a tu proveedor de hosting

## 📞 SOPORTE:

- **Documentación completa**: [SETUP_CPANEL_SIN_DOCKER.md](SETUP_CPANEL_SIN_DOCKER.md)
- **Inicio rápido**: [INICIO-RAPIDO.md](INICIO-RAPIDO.md)
- **Arquitectura**: [DASHBOARD-ARCHITECTURE.md](DASHBOARD-ARCHITECTURE.md)

## 🔐 SEGURIDAD:

✅ **Ya configurado:**
- Archivos .env protegidos (chmod 600)
- JWT_SECRET único generado
- Credenciales guardadas de forma segura

⚠️ **Recuerda:**
- NO subas archivos .env a GitHub
- Mantén actualizados Python y Node.js
- Usa HTTPS en producción (cPanel lo configura automáticamente)

---

**¿Listo para continuar?** Instala Node.js y luego ejecuta:
```bash
./install-cpanel.sh
```
