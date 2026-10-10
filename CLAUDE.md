# PetsAlCielo — petsalcielo.cl

Sitio de un crematorio ecológico de mascotas en Puerto Montt (Chile). Está hecho con **Astro** (estático) y se publica en **Cloudflare Pages**. Todos los textos están en español de Chile.

## Comandos
- `npm run dev`: servidor local.
- `npm run build`: genera `dist/`. Configurar en Cloudflare Pages: build `npm run build`, output `dist`, `NODE_VERSION=22`.
- `npm run check`: compila y comprueba que cada imagen, video, fuente, JSON, enlace a página y ancla `/#id` exista con el nombre exacto (mayúsculas y tildes incluidas). También comprueba que el HTML funcione con la CSP (`scripts/check-csp.mjs`): sin `onclick` ni otros atributos de evento, sin atributos `style`, y cada `<script>` y `<style>` en línea con su hash en `_headers`. Correrlo antes de cada push. Los problemas en páginas que redirigen a la home salen como aviso.
- `npm run visual -- --referencia` y luego `npm run visual`: red de seguridad para cambios que no deberían cambiar lo que se ve. Compila, captura las 7 páginas a 320/390/768/1440 px (y sin JS), compara píxel por píxel con la referencia (diferencias en rojo en `.visual/diferencias`) y corre pruebas de funcionamiento y escenarios sin congelar: sin JS, script que falla, JS retrasado 6 s, JSON caídos, descargas de video sin pulsar y movimiento reducido. `--paginas=inicio,testimonios` limita las páginas. Usa el Chrome instalado (`CHROME_PATH` para otro).
- `npm run compare`: compara el DOM de cada página en `dist/` con el HTML anterior a Astro (commit `edfb11a`). Desde la migración hay cambios deliberados (menú unificado, horario, canonical, testimonios), así que las diferencias son esperables: sirve para revisar qué cambió. Para comprobar que un refactor no cambia nada, comparar estilos y capturas en el navegador antes y después.

## Rutas (NO CAMBIAR: están posicionadas en Google)
| Página | Archivo | URL | Canonical actual |
|---|---|---|---|
| Inicio | `src/pages/index.astro` | `/` | `https://petsalcielo.cl/` |
| Servicios | `src/pages/servicios.astro` (muestra `index.astro`) | `/servicios` | `/` |
| Nosotros | `src/pages/nosotros.astro` | `/nosotros` | `/` |
| Instalaciones | `src/pages/instalaciones.astro` (muestra `nosotros.astro`) | `/instalaciones` | `/` |
| Preguntas frecuentes | `src/pages/preguntas-frecuentes.astro` | `/preguntas-frecuentes` | `/preguntas-frecuentes` |
| Testimonios | `src/pages/testimonios.astro` | `/testimonios` | `/testimonios` |
| Regreso a casa | `src/pages/regreso-a-casa.astro` | `/regreso-a-casa` | `/regreso-a-casa` |

Datos que las páginas cargan con `fetch`, servidos desde `public/`:
- `/instagram.json`: feed que genera el bot.
- `/gallery/{instalaciones,jardin,urnas,despedida}.json`: galerías del modal. La tarjeta `mariposas` no tiene JSON: abre el video educativo de YouTube (`QA8nm3SR-wU`).
- `/Assets/testimonios/testimonios.json`: carrusel de testimonios.

## Reglas
- **No cambiar URLs ni nombres de archivos** en `src/pages/` ni en `public/`. `/Assets` va con A mayúscula, porque Cloudflare distingue mayúsculas en los archivos.
- `astro.config.mjs`: `build.format: 'file'` (genera `servicios.html`, que se sirve en `/servicios` sin barra final), `trailingSlash: 'never'` y `compressHTML: false`. No cambiar.
- **No crear `src/pages/404.astro`** sin decidirlo con el dueño. Sin 404.html, Cloudflare responde con la home y código 200 a cualquier ruta desconocida, **también a imágenes o videos que no existen**: el navegador recibe HTML y no puede mostrarlo. Por eso, toda ruta nueva a un archivo de `public/` hay que comprobarla (que exista con ese nombre exacto) y no basta con que responda 200.
- No usar `@astrojs/sitemap`: `public/sitemap.xml` es manual y solo lista `/`, `/testimonios` y `/preguntas-frecuentes`, todo en minúsculas y sin `www`.
- **`public/_redirects`**: `/servicios`, `/nosotros`, `/instalaciones` y `/regreso-a-casa` (con y sin `.html`, y sus versiones con mayúsculas) redirigen con 301 a `/`. `/Testimonios` y `/Preguntas-Frecuentes` redirigen a su versión en minúsculas. Los enlaces `/#...` no se tocan.
- **Scripts**: los `<script>` de páginas y componentes los empaqueta Astro en `/_astro/*.js` (módulos, se ejecutan al terminar de leer el HTML, en orden). `vite.build.assetsInlineLimit: 0` en `astro.config.mjs` evita que Astro meta los chicos dentro del HTML. No usar `is:inline` en scripts nuevos ni atributos `onclick`/`onmouseover`: la CSP los bloquea. Para WhatsApp al azar se usa `data-wa="<mensaje>"` y para abrir una galería `data-abre-galeria="<clave>"` (los maneja `src/scripts/enlaces.ts`); los hover van en CSS. El único script en línea es el de `MejoraProgresiva` (va con hash en la CSP).
- **CSS**: el de cada página está en `src/styles/` y la página lo importa en su frontmatter; Astro lo minifica (con esbuild, ver `astro.config.mjs`) y lo publica en `/_astro/*.css`, que el navegador guarda en caché. index usa `home.css` y nosotros, `nosotros.css` (servicios e instalaciones las muestran tal cual). **El orden importa**: el CSS de la página se importa antes que los componentes, porque `Menu` importa `menu.css` y sus reglas deben mandar; los archivos que antes estaban en `<style>` dentro del `<body>` (`home-galeria.css`, `nosotros-galeria*.css`) se importan después de los componentes. Siguen en línea en el `<head>` solo los `@font-face` y el estilo de `MejoraProgresiva`. Para comprobar que un cambio de CSS no altera nada, además de `npm run visual` sirve comparar el estilo calculado de cada elemento entre dos builds.
- **Los comentarios HTML dentro de slots se pierden** en Astro. Por eso no hay `BaseLayout` y cada página escribe su propio `<html>`, `<head>` y `<body>`.
- El HTML original tiene etiquetas mal cerradas que el compilador de Astro rechaza. Se emiten literales con `<Fragment set:html={"</div>"} />`. No "arreglarlas" sin revisar el resultado visual.
- **`public/_headers`**: es la única fuente de la CSP (incluye Google Analytics, `i.ytimg.com` y `frame-ancestors 'self'`) y de la `Permissions-Policy`. `script-src` no lleva `'unsafe-inline'` ni `'unsafe-eval'`: solo `'self'`, los dominios externos y los hashes `'sha256-...'` del script de `MejoraProgresiva` (uno por cada valor de `scripts`). Si se cambia ese script, `npm run check` muestra el hash nuevo. `style-src` tampoco lleva `'unsafe-inline'`: solo `'self'`, Google Fonts y los hashes de los dos `<style>` en línea (`@font-face` y `MejoraProgresiva`). Los atributos `style="..."` se pueden seguir escribiendo en el código: `integraciones/estilos-en-linea.mjs` (en `astro.config.mjs`, usa `parse5`) los pasa al compilar a `/_astro/estilos-en-linea.<hash>.css` con una clase `e-<hash>` que conserva la prioridad de un estilo en línea. En JavaScript no armar HTML con `style="..."` (en `innerHTML`) ni usar `setAttribute('style', …)`: la CSP los bloquea; usar `elemento.style` o clases. `npm run visual` aplica esta CSP en sus pruebas. Si se agrega un dominio externo nuevo, hay que sumarlo a la CSP y probar con `npx wrangler pages dev dist` (aplica `_headers` y `_redirects`), revisando que la consola no muestre errores "Content Security Policy". `immutable` va solo en `/_astro/*`. `/instagram.json` y `/gallery/*` no llevan caché larga. No crear reglas de cabeceras en el panel de Cloudflare (Rules > Transform Rules > Modify Response Header): reemplazan la CSP de `_headers` (la regla antigua "CSP with Google Tag domains" se borró el 2026-10-09).
- Rocket Loader de Cloudflare está apagado. No activarlo: reescribe los scripts.
- **testimonios ya no está congelado** (desde el 2026-10-09): `src/pages/testimonios.astro` se corrige como cualquier otra página. Usa los componentes comunes (`Menu`, `TopBar` y `Footer`, variantes `home` y `nosotros`) y sus secciones (ver abajo); su JS sigue en la página. Las reseñas de clientes son citas textuales: no corregirles la redacción.
- **Bot de Instagram**: `.github/workflows/instagram.yml` corre `update_instagram.py` cada 12 h (06:00 y 18:00 UTC). El script escribe `public/instagram.json` y `public/Assets/instagram/<id>.jpg` y hace commit en `main`. El `src` del JSON sigue siendo `/Assets/instagram/<id>.jpg`. Al final borra de `public/Assets/instagram/` las imágenes que ya no están entre las 10 publicaciones del feed (si la API no devuelve publicaciones, no borra nada). Omite como repetida una publicación con texto 90 % igual a otra subida dentro de 60 minutos. Cada imagen se descarga a un `.tmp` y solo queda si es una imagen completa; una publicación sin imagen se omite. Si la API falla, no trae publicaciones o ninguna imagen se descarga, no toca el feed y termina con error. Si las publicaciones no cambiaron, no reescribe el JSON (sin commit ni despliegue). El workflow hace `git pull --rebase` antes del push. Requiere el secret `IG_TOKEN`.
- **Caché del panel de Cloudflare** (Caching > Cache Rules): imágenes, fuentes, CSS y JS se guardan 30 días (en Cloudflare y en el navegador) y las páginas, 4 h en Cloudflare y 1 h en el navegador. Estas reglas mandan sobre `Cache-Control` de `_headers`. Por eso, después de publicar hay que purgar la caché (Caching > Purge, o por API), y una imagen reemplazada con el mismo nombre puede seguir viéndose antigua hasta 30 días en navegadores que ya la tenían.
- Git: no hacer push a `main` ni merges sin aprobación del dueño.
- **Despliegue**: desde el 2026-10-08 Cloudflare Pages omite (`is_skipped`) los despliegues que llegan por push desde GitHub, por una causa en Cloudflare que no se pudo resolver. Por eso `.github/workflows/deploy.yml` llama en cada push a `main` a un deploy hook de Pages (secret `CF_DEPLOY_HOOK`, hook `github-actions` del proyecto `petswebq`), y el bot de Instagram lo usa como workflow reutilizable después de su commit. Después espera hasta 15 min a que `https://petsalcielo.cl/version.txt` (generado por `src/pages/version.txt.ts` con `CF_PAGES_COMMIT_SHA`) muestre el commit; si no, queda en rojo. Los workflows tienen permisos mínimos (`permissions: {}`; el bot, solo `contents: write`). Después de un push del dueño hay que purgar la caché (ver "Caché del panel").
- **Flujo de trabajo**: no se usan ramas de prueba ni previews de Cloudflare. Se cambia en `main` local → `npm run build` → `npm run preview` (http://localhost:4321) → el dueño lo revisa en el visor de VS Code (Ctrl+Shift+P → "Simple Browser: Show") → con su OK, commit y push a `main` → comprobar petsalcielo.cl con `?v=<algo>` para saltar la caché. `astro preview` no aplica `public/_redirects`: las páginas que redirigen se ven igual en local.
- **Contenido sin depender del JS**: solo cuentan los scripts de los que depende que el contenido se vea: `src/scripts/revelar.ts` (animaciones `.reveal`/`.reveal-fog`, lo incluye `MejoraProgresiva`) y, en la FAQ, el acordeón (`faq/Grupo`). Terminan con `window.__listos = (window.__listos || 0) + 1;`. Por eso `scripts` es 1 en todas las páginas y 2 en la FAQ. Un script nuevo que oculte contenido hasta inicializarse debe sumar a `__listos` y subir `scripts`; los carruseles, Instagram y la galería no ocultan nada y no cuentan. La primera pantalla, el contacto (WhatsApp, teléfono, dirección) y el contenido principal de la página (las preguntas de la FAQ, el carrusel de testimonios) no llevan `reveal`. Los botones de WhatsApp llevan `href` real al número principal aunque `data-wa` sortee entre los dos.
- **Movimiento reducido**: ningún carrusel avanza solo si `prefers-reduced-motion: reduce`.
- **Videos de testimonios**: el HTML no lleva el archivo del video. Cada diapositiva muestra una portada (`<a class="testi-video" href="…webm" data-video="…webm">` con `<img data-poster="…-portada.webp">` y un botón) y el `<video>` se crea al pulsar. Las portadas se asignan al mostrarse la diapositiva actual y la siguiente. Al agregar un video, subir también su portada 400×711 WebP y ponerla en `poster` de `testimonios.json`.
- **Archivos reemplazados llevan nombre nuevo** (fuentes `…-latin.woff2`, `logo_para_web-360.webp`, `foto-kissita-600.webp`): Cloudflare guarda imágenes y fuentes 30 días en el navegador, y purgar Cloudflare no borra esa copia.
- **Fotos en varios tamaños**: las grandes tienen una versión chica con el ancho al final del nombre (`imagen_hero_…-800.webp`, `foto-mulan-…-640.webp`, `reviews/…-440.webp`, `reviews/carmen-gloria-diaz-1-1000.webp`) y el `<img>` (o `<source>`) las ofrece con `srcset`/`sizes` para que el celular baje la chica. La portada de la home se precarga con `imagesrcset` en `index.astro`. Si se reemplaza una foto, regenerar también sus versiones (con nombre nuevo).

## Componentes (`src/components/`)
| Componente | Uso |
|---|---|
| `Menu` | Menú del sitio: botón corazón + menú lateral + barra de escritorio. Su CSS es `src/styles/menu.css` (incluye el hover del ícono de Instagram de la barra superior). Su JS es `src/scripts/menu.ts` (abrir/cerrar el menú lateral, pegar la barra bajo la barra superior y dejar su alto en `--fixed-bars-h`, desvanecer ítems al bajar) y además incluye `src/scripts/enlaces.ts` (WhatsApp al azar y atajos a galerías). Lo usan las 7 páginas. Cerrado, el menú lateral queda oculto para el teclado; al abrirlo el foco pasa al botón de cierre y al cerrarlo vuelve al corazón |
| `SvgDefs` | Gradientes `g-roof/g-wall/g-door/g-win` + `#icon-house` (index, servicios) |
| `HeartButton` | Botón corazón del celular (lo usa `Menu`) |
| `Drawer` | Menú lateral (lo usa `Menu`). Props: `links`, `cta` (`aleatorio`/`fijo`), `logo?`, `deco` |
| `NavPrincipal` | Menú de escritorio (lo usa `Menu`). Props: `logoHref`, `corazon?`, `links`, `cta` |
| `TopBar` | Barra superior. `variant`: `home`/`nosotros`/`faq`/`regreso` |
| `HeroCarousel` | Cabecera con carrusel. `variant`: `home`/`nosotros`/`regreso` |
| `PageHero` | Cabecera con migas de pan (preguntas-frecuentes) |
| `Footer` | Pie. `variant`: `home`/`nosotros`/`faq`/`regreso` |
| `GalleryModal` | Modal `#glb-overlay`. Prop `fondo` (`oscuro`/`blur`) |
| `GoogleTag` | Google Analytics. La configuración queda en `dataLayer` de inmediato, pero gtag.js se descarga 3 s después del evento load (en un momento libre): cargado al inicio retrasaba 2 a 3 s el contenido principal en celulares, y justo después del load seguía bajando el puntaje de la home. Se pierden solo las visitas de menos de ~3 s |
| `Favicons` | Íconos del sitio |
| `MejoraProgresiva` | En el `<head>` de cada página, después del charset. Incluye `src/scripts/revelar.ts`. Prop `scripts`: cuántos scripts debe esperar (1; 2 en la FAQ). Marca `<html class="js">`; las animaciones `.reveal`/`.reveal-fog` y el acordeón cerrado de la FAQ solo se aplican con esa clase. Si a los 4 s no terminaron de inicializar todos los scripts, quita la clase y todo queda visible |

- Las variantes literales (`TopBar/`, `HeroCarousel/`, `Footer/`) guardan el HTML exacto de cada grupo de páginas: `TopBar` `home` = index y testimonios; `Footer` `nosotros` = nosotros y testimonios.
- **Secciones de la home** (`src/components/inicio/`), en orden: `Cifras`, `Servicios`, `Biblioteca`, `Homenajes` (Instagram), `SobreNosotros`, `VideoEducativo`, `Llamado` y `Contacto`. Los `<div class="divider">` entre secciones están en `index.astro`. Su CSS sigue en `home.css`.
- **Preguntas frecuentes**: las preguntas y respuestas están solo en `src/data/faq.ts` (grupos con `id`, ícono, título y preguntas; la respuesta es HTML). De ahí salen las preguntas visibles (componente `faq/Grupo`) y el JSON-LD `FAQPage` del `<head>` (texto plano, sin la etiqueta de color `faq-tag`), así que siempre coinciden. Para cambiar una pregunta se edita solo ese archivo; un grupo nuevo necesita además su botón en `faq/Categorias.astro` con el mismo `data-cat`. Otras secciones (`src/components/faq/`): `Categorias`, `Llamado` y `Contacto`.
- **Secciones de testimonios** (`src/components/testimonios/`): `Encabezado`, `Carrusel`, `ResenasGoogle`, `EnMemoria` y `Agradecimiento`.
- **JavaScript**: las páginas no tienen `<script>` propios; cada componente lleva el de su sección (Astro lo empaqueta y la página carga solo los que usa). `HeroCarousel/Home` (portada de la home y pétalos), `HeroCarousel/Nosotros` y `/Regreso` (`src/scripts/portada-simple.ts`), `inicio/Biblioteca` (precarga de galerías), `inicio/Homenajes` y nosotros (`src/scripts/instagram.ts`), `GalleryModal` (galería), `testimonios/Carrusel`, `testimonios/ResenasGoogle`, `faq/Grupo` (acordeón) y `faq/Categorias` (filtro). Comunes en `src/scripts/`: `menu.ts`, `enlaces.ts`, `revelar.ts` y `petalos.ts`.
- Datos compartidos en `src/data/sitio.ts`:
  - WhatsApp: principal **56998461172**, secundario **56940082594**. `waFijo()` arma el enlace al principal; con `data-wa` el script común elige uno de los dos al azar.
  - Instagram: `@_petsalcielo`.
  - Facebook: `cremaciondemascotasenpuertomontt`.
  - GA4: **G-GMK6NF1B3Z**.

## Colores (`:root`)
Las páginas definen la paleta completa: preguntas-frecuentes, nosotros, instalaciones, testimonios y regreso-a-casa. index y servicios definen solo un subconjunto (marcado con \*).

| Token | Valor | Token | Valor |
|---|---|---|---|
| `--mint`\* | `#A8E6D6` | `--pastel-pink` | `#D99EC9` |
| `--mint-light` | `#ECBBB8` | `--pastel-lav` | `#F1A7F1` |
| `--lavender`\* | `#CBAEF2` | `--pastel-peach` | `#FEB9A3` |
| `--teal`\* | `#29A798` | `--steel-blue` | `#80CED7` |
| `--sky` | `#A2E9D7` | `--deep-blue` | `#007EA7` |
| `--sky-bright` | `#6CD2F5` | `--soft-purple` | `#A8BBEB` |
| `--peach` | `#EADDB7` | `--mauve` | `#D387AB` |
| `--coral` | `#F4918F` | `--text-dark`\* | `#3d4a5c` |
| `--blush` | `#E08890` | `--text-mid`\* | `#5a6878` |
| `--lilac` | `#A98CEB` | `--text-soft`\* | `#8a9aaa` |
| `--rose-a`\* | `#EEA5E9` | `--white`\* | `#ffffff` |
| `--ice`\* | `#B7F0F5` | `--bg`\* | `#faf8f9` |
| `--crimson` | `#D34D73` | | |
| `--amber` | `#F0C982` | | |

Otros: degradé de los botones Instagram/Testimonios `linear-gradient(135deg,#7DD6EE,#4BBEDD)`; ícono de Instagram `#F5D0E8 → #E3B0D8 → #D4A4CC → #CDBAF0`. El sitio fuerza modo claro (`color-scheme: only light`).

## Tipografías
- **DM Sans**: texto (`'DM Sans', sans-serif`), variable 100–900, normal e itálica.
- **Cormorant Garamond**: títulos (`'Cormorant Garamond', serif`), variable 300–700, normal e itálica.
- Archivos locales en `public/Assets/Fonts/*-latin.woff2`: recortados al latín (Basic, Latin-1, Latin Extended-A, puntuación general, flechas, €, ₂, ™, ★, ♥, ✕). Emojis y otros símbolos salen de las fuentes del sistema. Los `.woff2` sin `-latin` son los originales completos (ya no se enlazan; se pueden borrar más adelante) con `@font-face` inline y `preload`. nosotros, instalaciones y regreso-a-casa además cargan Google Fonts.

## Problemas conocidos (se conservaron a propósito en la migración)
- servicios, nosotros e instalaciones tienen canonical `/` (y redirigen a la home). servicios muestra la home; instalaciones, nosotros.
- Horario en los datos estructurados (JSON-LD): atención 24/7 se escribe `"opens": "00:00", "closes": "23:59"`. `00:00`–`00:00` significa "cerrado" para Google.
- regreso-a-casa bloquea el zoom en el celular (`user-scalable=no`).
