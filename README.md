# Programa semanal

Planilla para completar el programa de la semana y descargar PNG/PDF (hoja A4).

En desarrollo el servidor sirve [`docs/`](docs/): la vista previa es el HTML y el CSS de la plantilla. En producción (`NODE_ENV=production`) sirve solo [`dist/`](dist/) y la vista previa es el canvas. El contenedor no incluye `docs/`.

Servidor Node en [`server/`](server/) que sirve el sitio y sincroniza el programa desde jw.org (`GET /api/semana?lunes=YYYY-MM-DD`). El scrape trae la guía MWB (entre semana) y, para el finde, canciones intermedia/final desde el artículo de estudio de La Atalaya. Si esas canciones fallan, la respuesta sigue en 200 con `parcial: true` y `advertencias` (no finge éxito total con strings vacíos silenciosos).

Puerto por defecto: **8097** (`PORT` en env lo puede cambiar).

- **Producción (casa):** `http://192.168.1.50:8097/` → subdominio Cloudflare `programa.nataperalta.com.ar` (ruta tunnel)
- **Detalle:** [DOCUMENTACION.md](DOCUMENTACION.md)

## Local

```bash
cd server && npm install && npm run dev
# abrir http://localhost:8097/  (HTML y CSS en vivo)
```

Producción local (solo `dist/`):

```bash
cd server && npm run build && npm start
```

Solo frontend **sin API** (python en `:8000` no tiene `/api/semana`; no sirve para sincronizar):

```bash
python -m http.server -d docs 8000
```

Para sincronizar: `cd server && npm run dev` → http://localhost:8097/

## Deploy

Auto-deploy con GitHub Actions (self-hosted en `ny-server-house`) al hacer **push** a:

- `claude/github-pages-site-ln6583`
- `main`

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) → `git reset --hard` en `/home/nata/programa-semanal` + `docker compose up -d --build`.

También se puede disparar a mano: Actions → Deploy → Run workflow.

Manual (LAN):

```bash
rsync -avz --delete --exclude node_modules --exclude .git \
  ./ nata@192.168.1.50:/home/nata/programa-semanal/
ssh nata@192.168.1.50 'cd /home/nata/programa-semanal && docker compose up -d --build'
```
