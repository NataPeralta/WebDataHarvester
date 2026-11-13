# Programa Semanal: generador de imágenes y publicación

Sitio estático (GitHub Pages) para completar una planilla semanal, generar la imagen del programa en PNG y publicarla en un listado público. Está en la carpeta `docs/` y es independiente del scraper que vive en el resto del repo.

- **Listado público:** `https://nataperalta.github.io/WebDataHarvester/`
- **Panel de administración (con login):** `https://nataperalta.github.io/WebDataHarvester/admin.html`

No usa servidor, base de datos ni paso de compilación: los archivos de `docs/` son la versión final.

---

## 1. Qué hace

| Parte | Descripción |
|---|---|
| **Planilla autocompletable** | Formulario con fecha, presidente, oraciones, secciones y partes. Sugiere nombres mientras se escribe y suma los nuevos a la lista. |
| **Vista previa en vivo** | La imagen se dibuja en un `<canvas>` y se actualiza con cada cambio. |
| **Descargar / compartir** | Exporta la imagen como PNG. En celulares compatibles aparece "Compartir". |
| **Publicar** | Sube la imagen y los datos al repo. Aparece en el listado público. |
| **Administrar lo publicado** | Ver, editar (recarga los datos en la planilla), reemplazar y despublicar. |
| **Login** | Usuario y clave para entrar al panel. |
| **Borradores** | Se guardan en el navegador, con respaldo exportable e importable en JSON. |

## 2. Estructura de archivos

```
docs/
├── index.html        Listado público
├── galeria.js        Lógica del listado y del visor
├── admin.html        Panel: login + planilla + publicación
├── admin.js          Planilla, borradores, dibujo de la imagen
├── publicar.js       Publicación vía API de GitHub
├── auth.js           Login del panel
├── config.js         Configuración (repo, rama, hash de la clave)
├── styles.css        Estilos (claro/oscuro automático)
├── .nojekyll         Evita que GitHub procese el sitio con Jekyll
└── publicados/       Imágenes y datos publicados (los escribe el panel)
    ├── index.json    Listado de lo publicado
    ├── <id>.png      Imagen de cada semana
    └── <id>.json     Datos de cada semana (para poder editarla)
tools/
└── crear-acceso.js   Genera usuario y clave nuevos
```

El `<id>` de cada programa es el lunes de la semana en formato `AAAA-MM-DD` (por ejemplo `2024-12-30`). Si no hay fecha, se arma a partir del texto de la fecha.

## 3. Cómo funciona

### Planilla e imagen
- `admin.js` mantiene un objeto `estado` con todos los datos y lo redibuja en el canvas (1240 px de ancho, el alto crece si hay más partes).
- Las posiciones y tipografías están en las constantes y en `componer()` de `admin.js`. Se usan Montserrat y Roboto desde Google Fonts.
- Al elegir el lunes de la semana, el texto de la fecha se genera solo ("30-6 de diciembre"). Se puede corregir a mano.
- **"Nueva semana →"** guarda la actual como borrador, avanza 7 días y deja las partes, pero vacía los nombres.

### Publicación
GitHub Pages no tiene servidor, así que publicar significa **escribir archivos en el repo** con la API de GitHub (`PUT /repos/{owner}/{repo}/contents/...`) usando un token personal. El flujo de "Publicar esta semana" es:

1. Lee `docs/publicados/index.json`. Si la semana ya existe, pide confirmación para reemplazarla.
2. Genera el PNG y lo sube como `<id>.png`.
3. Sube los datos como `<id>.json`.
4. Actualiza `index.json` con la nueva entrada.

"Despublicar" quita la entrada del índice y borra el PNG y el JSON. Cada paso es un commit en la rama configurada. Después de publicar, GitHub Pages tarda uno o dos minutos en reflejarlo.

Formato de `index.json`:

```json
{
  "items": [
    {
      "id": "2024-12-30",
      "semana": "2024-12-30",
      "fecha": "30-6 de diciembre",
      "titulo": "LECTURA SEMANAL DE LA BIBLIA",
      "imagen": "2024-12-30.png",
      "publicado": "2024-12-29T10:00:00.000Z"
    }
  ]
}
```

### Listado público
`galeria.js` lee `publicados/index.json`, ordena por semana (más nueva primero), destaca la semana en curso y abre cada imagen en un visor con botón de descarga. Si el archivo no existe muestra "Todavía no hay programas publicados".

## 4. Puesta en marcha

### Activar GitHub Pages (una vez)
1. En el repo: **Settings → Pages**.
2. **Source:** Deploy from a branch.
3. **Branch:** la rama del sitio (hoy `claude/github-pages-site-ln6583`) y carpeta **`/docs`**. Guardar.

### Configuración (`docs/config.js`)
| Campo | Qué es |
|---|---|
| `owner`, `repo` | Dueño y nombre del repositorio. |
| `branch` | Rama donde escribe el panel. **Tiene que ser la misma rama desde la que Pages publica.** Si movés Pages a `main`, cambiá este valor; si no, las publicaciones se guardan en una rama que el sitio no muestra. |
| `carpeta` | Carpeta de publicaciones (`docs/publicados`). |
| `acceso` | Usuario, sal, iteraciones y hash de la clave. |

### Token de GitHub (una vez por navegador)
Para publicar hace falta un token. En el panel, sección **"Conexión con GitHub"**:

1. En GitHub: *Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*.
2. **Repository access:** solo `WebDataHarvester`.
3. **Permissions → Repository → Contents:** *Read and write*.
4. Pegarlo en el panel y tocar "Guardar y probar".

El token se guarda solo en el `localStorage` de ese navegador. Nunca se escribe en el repo. "Quitar token" lo borra.

### Usuario y clave
Se cambian con:

```bash
node tools/crear-acceso.js <usuario> [clave]
```

Si no se indica la clave, genera una al azar y la muestra en pantalla. El script reescribe el bloque `acceso` de `docs/config.js`. Después hay que hacer commit y push. La clave no se guarda en ningún archivo: solo su hash (PBKDF2-SHA256, 200.000 iteraciones, con sal).

## 5. Seguridad: qué protege y qué no

- **El login es una barrera en el navegador, no seguridad real.** El sitio es estático y su código es público; alguien con conocimientos técnicos puede saltearlo. Sirve para que el panel no quede a la vista de cualquiera.
- **Lo que protege la publicación es el token.** Sin él nadie puede escribir en el repo, aunque entre al panel.
- La sesión dura 8 horas y vive en `sessionStorage` (se pierde al cerrar la pestaña). Tras cada intento fallido hay una espera que crece hasta 5 segundos.
- **El listado y las imágenes son públicos.** Quedan en `docs/publicados/` y se pueden abrir por su URL directa; si el repo es público, también se ven en GitHub. Ocultarlos de verdad requiere Pages privado (GitHub Enterprise) u otro hosting con autenticación real.
- `config.js` es público: solo contiene el hash de la clave, nunca la clave ni el token. Conviene usar una clave larga.
- El panel lleva `noindex` para que no aparezca en buscadores.

## 6. Datos guardados en el navegador

| Clave de `localStorage` | Contenido |
|---|---|
| `programa-semanal:estado:v1` | Planilla actual (se guarda sola). |
| `programa-semanal:nombres:v1` | Lista de nombres para autocompletar. |
| `programa-semanal:guardados:v1` | Borradores por semana. |
| `programa-semanal:token:v1` | Token de GitHub. |

Los borradores y nombres son locales a cada navegador. Para pasarlos a otro dispositivo: **Exportar respaldo** y **Importar respaldo** (archivo JSON).

## 7. Probar en local

```bash
python3 -m http.server -d docs 8000
# abrir http://localhost:8000/
```

El login necesita un contexto seguro (HTTPS o `localhost`). Para probar la publicación contra el repo real hace falta el token.

## 8. Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| Se ve la versión vieja del sitio | Pages tarda uno o dos minutos; recargar con Ctrl+F5. |
| 404 en el sitio | En *Settings → Pages* la carpeta debe ser `/docs`, no `/ (root)`. |
| Publiqué pero no aparece | `branch` en `config.js` distinto de la rama de Pages, o el despliegue sigue en curso. |
| "El token no es válido o venció" | Generar uno nuevo y pegarlo en "Conexión con GitHub". |
| "El token no tiene permiso…" | El token necesita *Contents: Read and write* sobre este repo. |
| "El acceso no está configurado" | `acceso.hash` está vacío en `config.js`; correr `tools/crear-acceso.js`. |
| "…se necesita HTTPS" al entrar | El navegador no ofrece `crypto.subtle` fuera de HTTPS o `localhost`. |
