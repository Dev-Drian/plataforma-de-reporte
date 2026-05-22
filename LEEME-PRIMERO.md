# ✅ PASOS SOLO POR CONSOLA (cPanel sin Docker)

Sigue estos comandos en orden. Esto es lo único que necesitas.

---

## 1) Verificar que tienes Python y Node.js

```bash
python3 --version
node --version
```

Si NO tienes Node.js, instala con nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node --version
npm --version
```

Si tu Python es 3.6 y falla FastAPI, instala Python 3.9+ desde cPanel:

```bash
python3 --version
```

Si tienes CloudLinux, normalmente ya existe Python 3.11 aquí:

```bash
/opt/alt/python311/bin/python3.11 --version
```

Usa ese Python 3.11 para instalar dependencias y migraciones.

---

## 2) Crear la base de datos (si no existe)

```bash
mysql -uroot -p
```

Dentro de MySQL:
```sql
CREATE DATABASE monitor239web_bd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

## 3) Instalar dependencias (SIN scripts)

### Python (backend-data)

Si usas Python 3.11 (CloudLinux):

```bash
/opt/alt/python311/bin/python3.11 -m ensurepip --user
/opt/alt/python311/bin/python3.11 -m pip install --upgrade --user pip
/opt/alt/python311/bin/python3.11 -m pip install --user -r /home/monitor239web/public_html/backend-data/requirements.txt
```

### Node.js (backend-gateway)

```bash
cd /home/monitor239web/public_html/backend-gateway
npm install --production
npm run build
```

---

## 4) Inicializar base de datos (SIN scripts)

```bash
cd /home/monitor239web/public_html/backend-data
/opt/alt/python311/bin/python3.11 -m alembic upgrade head
/opt/alt/python311/bin/python3.11 scripts/init_db.py
```

---

## 5) Compilar frontend (en tu PC)

```bash
cd frontend
npm install
npm run build
```

Sube el contenido de `frontend/dist/` a:
`/home/monitor239web/public_html/`

---

## 6) Activar el .htaccess

```bash
cd /home/monitor239web/public_html
cp .htaccess.nuevo .htaccess
```

---

## 7) Verificar que todo funciona

```bash
# Backend Python
curl http://127.0.0.1:3000/health

# Backend Node.js
curl http://127.0.0.1:3001/health
```

---

## 8) Lo que falta después de migraciones

1. Configurar **Python App** en cPanel (Application URL: `data-api`).
2. Configurar **Node.js App** en cPanel (Application URL: `api`).
3. Compilar frontend en tu PC y subir `frontend/dist/` a `public_html/`.
4. Probar URLs finales en el navegador.
