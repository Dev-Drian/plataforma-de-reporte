# Monitor — repositorio en cuenta `jesusmendoza`

Copia de despliegue creada desde `/home/monitor239web/public_html` para migración / nuevo hosting.

## Estructura

| Carpeta | Rol |
|---------|-----|
| `backend-data/` | FastAPI (uvicorn, puerto típico **3000**) |
| `backend-gateway/` | Gateway Node (puerto típico **3001**, opcional) |
| `frontend/` | Código fuente Vite/React |
| `infrastructure/` | Scripts SQL / infra |
| `data-api/` | API auxiliar si aplica |

## Arranque rápido (mismo servidor que LimoPress)

```bash
cd /home/jesusmendoza/monitor-repo/backend-data
/opt/alt/python311/bin/python3.11 -m pip install -r requirements.txt
/opt/alt/python311/bin/python3.11 -m uvicorn main:app --host 127.0.0.1 --port 3000
```

En LimoPress `back/.env`:

```env
MONITOR_URL=http://127.0.0.1:3000
LIMOPRESS_PROXY_SECRET=<mismo secreto que en el monitor>
```

## Git

Repositorio inicializado en esta carpeta. Añade tu remoto:

```bash
cd /home/jesusmendoza/monitor-repo
git remote add origin git@github.com:jesusmendoza/NOMBRE-REPO.git
git push -u origin main
```

## No incluido (por seguridad)

- `.env` / claves
- `node_modules/`, `venv/`, `dist/`, `api.zip`
- Historial git del origen (`monitor239web`)

Ver `LEEME-PRIMERO.md` y `COMANDOS.md` en esta misma carpeta.
