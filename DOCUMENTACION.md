# Programa Semanal

App para completar la planilla semanal y descargar PNG/PDF (A4). Corre en el servidor de casa. En desarrollo la vista previa es HTML/CSS (`docs/`). En producción el proceso sirve solo `dist/` y la vista previa es el canvas. La API está en `server/`.

- **LAN:** `http://192.168.1.50:8097/`
- **Público (tras tunnel):** `https://programa.nataperalta.com.ar/`

Los nombres y la planilla en curso viven solo en el navegador (`localStorage`). La sync no envía nombres: solo trae estructura/temas desde jw.org.

---

## Qué hace

| Parte | Descripción |
|---|---|
| Planilla | Fecha, reuniones editables, secciones de color, partes y nombres con autocompletado. |
| Sincronizar | `GET /api/semana?lunes=YYYY-MM-DD` scrapea la guía MWB en jw.org (lectura, canciones y partes de entre semana) y el artículo de estudio de La Atalaya (`cancionIntermedia` / `cancionFinal` del finde). Si el finde falla, responde 200 con `parcial: true` y `advertencias`. Conserva nombres ya cargados. Timeout ~18s por request a jw.org. |
| Vista previa / Descargar | PNG y PDF A4 vía plantillas en `docs/plantillas/`. |

**Nota:** `python -m http.server` en `:8000` solo sirve estáticos; no expone la API. Usá el servidor Node (`PORT` default **8097**).

## Estructura

```
docs/           Fuente (HTML/CSS). Solo desarrollo.
dist/           Build de producción. Lo único que sirve el servidor.
server/         Express + scrape jw.org
scripts/build.mjs
Dockerfile      Arma dist y no copia docs/
docker-compose.yml   puerto 8097, NODE_ENV=production
```

## Datos en el navegador

| Clave | Contenido |
|---|---|
| `programa-semanal:estado:v1` | Planilla actual |
| `programa-semanal:nombres:v1` | Autocompletado |

## Deploy

Push a `claude/github-pages-site-ln6583` o `main` dispara el workflow (runner self-hosted en casa). Ver [README.md](README.md).

En Cloudflare Tunnel: `programa` → `http://localhost:8097`.
