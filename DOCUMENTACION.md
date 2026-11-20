# Programa Semanal: generador de imágenes

Página estática (GitHub Pages) para completar una planilla semanal y descargar la imagen del programa en PNG. Está en la carpeta `docs/` y es independiente del scraper que vive en el resto del repo.

- **Sitio:** `https://nataperalta.github.io/WebDataHarvester/`

No usa servidor, base de datos ni paso de compilación: los archivos de `docs/` son la versión final. No hay login, publicación ni listado público: todo ocurre en el navegador de quien la usa.

---

## 1. Qué hace

| Parte | Descripción |
|---|---|
| **Planilla autocompletable** | Formulario con fecha, presidente, oraciones, secciones y partes. Sugiere nombres mientras se escribe y suma los nuevos a la lista. La lista es **propia de cada dispositivo** (ver sección 5). |
| **Fin de semana y asignaciones** | Dos bloques opcionales dentro de la misma imagen, cada uno entre divisores horizontales: *Reunión de fin de semana* (título centrado, Oración inicial, Discursante, Conductor de La Atalaya y Lector en la misma fila, y Oración final) y *Asignaciones* (microfonista, sonido, zoom, acomodadores, puerta). Cada uno se activa o desactiva con una casilla. |
| **Vista previa en vivo** | La imagen se dibuja en un `<canvas>` y se actualiza con cada cambio. |
| **Descargar / compartir** | Exporta la imagen como PNG. En celulares compatibles aparece "Compartir". |
| **Sin guardado manual** | No hay programas guardados ni respaldos: se completa la planilla, se descarga la imagen y listo. La planilla en curso se recuerda sola en el navegador y "Nueva semana →" la deja lista para la semana siguiente. |

## 2. Estructura de archivos

```
docs/
├── index.html    Planilla y vista previa
├── app.js        Datos, formulario, dibujo de la imagen
├── styles.css    Estilos (claro/oscuro automático)
└── .nojekyll     Evita que GitHub procese el sitio con Jekyll
```

## 3. Cómo funciona

- `app.js` mantiene un objeto `estado` con todos los datos y lo redibuja en el canvas (1240 px de ancho; el alto crece si hay más partes).
- Las posiciones y tipografías están en las constantes y en `componer()`. Se usan Montserrat y Roboto desde Google Fonts.
- La planilla arranca con los temas de las partes ya cargados, la semana actual y ningún nombre. En la vista previa, cada lugar vacío muestra "Nombre y apellido" en gris para que se vea completa; **ese texto no aparece en la imagen descargada**, donde un lugar vacío queda vacío. El programa no lleva palabras de introducción ni de conclusión. La fecha se dibuja arriba del primer divisor, a la izquierda. El título va centrado debajo del divisor y, debajo del título, Presidente y Oración en una fila alineada a la izquierda. El programa de entre semana termina con una Oración final, también a la izquierda. Las partes no llevan numeración (los datos guardados con "1.", "2." … se limpian solos al abrirlos).
- **Alineación de la imagen:** las líneas ocupan de 62 a 1178 px y todo lo demás respeta un margen interno de 30 px. Las barras de color y la fecha arrancan en x=92, y el texto de cada parte en x=103 (alineado con el título de la barra). Los nombres tienen una primera columna en x=700, que usan también los nombres solos, y una segunda en x=930 para el ayudante. Las constantes están al principio de la sección "Imagen" de `app.js`.
- Al elegir el lunes de la semana, el texto de la fecha se genera solo ("30-6 de diciembre"). Se puede corregir a mano.
- Se pueden agregar, quitar y reordenar partes y secciones, y cambiar el color de cada sección.
- **Bloques opcionales:** si alguno está activo, la línea negra que cerraba el programa pasa a ser el divisor y cada bloque se dibuja debajo y se cierra con su propia línea. Así, *Asignaciones* siempre tiene un divisor arriba. Si no hay ninguno activo, la imagen queda igual que antes. El fin de semana tiene un título editable (sin barra de color); *Asignaciones* tiene una barra con título y color editables. En ambos se pueden agregar, quitar y reordenar las filas. Cada fila admite un segundo nombre (por ejemplo, dos acomodadores).
- Los datos guardados con versiones anteriores se actualizan solos al abrirlos (por ejemplo, Conductor y Lector se unen en una fila).
- **"Nueva semana →"** (al final de la planilla) avanza 7 días y deja las partes, pero vacía los nombres (también los del fin de semana y las asignaciones).

## 4. Puesta en marcha

Activar GitHub Pages una sola vez: en el repo, **Settings → Pages**, *Source:* Deploy from a branch, la rama del sitio (hoy `claude/github-pages-site-ln6583`) y carpeta **`/docs`**.

Para probar en local:

```bash
python3 -m http.server -d docs 8000
# abrir http://localhost:8000/
```

## 5. Datos guardados en el navegador

| Clave de `localStorage` | Contenido |
|---|---|
| `programa-semanal:estado:v1` | Planilla actual (se guarda sola). |
| `programa-semanal:nombres:v1` | Lista de nombres para autocompletar. |

Son locales a cada navegador.

### Autocompletado por dispositivo
- El código del sitio no trae ninguna lista de nombres: arranca vacía en cada dispositivo.
- Cada nombre que se escribe en la planilla se agrega a la lista de ese dispositivo. También se aprenden los nombres de la planilla actual.
- La lista se puede editar a mano en "Lista de nombres para autocompletar".
- Un nombre cargado en un dispositivo no aparece en otro. Para llevarlos a otro dispositivo hay que copiar la lista a mano desde "Lista de nombres para autocompletar".

## 6. Privacidad

- La página no envía datos a ningún servidor: los nombres que se cargan quedan solo en el navegador de quien los escribe.
- **Un sitio de GitHub Pages es público en internet, aunque el repositorio sea privado.** Tiene `noindex` para que los buscadores no lo muestren, pero cualquiera que tenga el link puede abrirlo. El código no contiene nombres de personas: el modelo (`MODELO` en `app.js`) está en blanco y la lista de autocompletado se arma en cada dispositivo. Los nombres que alguien escriba nunca salen de su navegador. Los nombres que estaban como ejemplo en versiones anteriores siguen en el historial de commits del repositorio.
- Las páginas privadas con control de acceso solo existen en GitHub Enterprise Cloud.

## 7. Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| Se ve la versión vieja del sitio | Pages tarda uno o dos minutos; recargar con Ctrl+F5. |
| 404 en el sitio | En *Settings → Pages* la carpeta debe ser `/docs`, no `/ (root)`. |
| Se borró la planilla en curso | Se recuerda por navegador; usar otro navegador o borrar los datos del sitio la elimina. Lo que importa es descargar la imagen. |
