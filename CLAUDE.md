# PetsAlCielo — petsalcielo.cl

Sitio de un crematorio ecológico de mascotas en Puerto Montt (Chile). Está hecho con **Astro** (estático) y se publica en **Cloudflare Pages**. Todos los textos están en español de Chile.

## Comandos
- `npm run dev`: servidor local.
- `npm run build`: genera `dist/`. Configurar en Cloudflare Pages: build `npm run build`, output `dist`, `NODE_VERSION=22`.
- `npm run compare`: compara el DOM de cada página en `dist/` con el HTML anterior a Astro (commit `edfb11a`). Desde la migración hay cambios deliberados (menú unificado, horario, canonical, testimonios), así que las diferencias son esperables: sirve para revisar qué cambió. Para comprobar que un refactor no cambia nada, comparar estilos y capturas en el navegador antes y después.

## Rutas (NO CAMBIAR: están posicionadas en Google)
| Página | Archivo | URL | Canonical actual |
|---|---|---|---|
| Inicio | `src/pages/index.astro` | `/` | `https://petsalcielo.cl/` |
| Servicios | `src/pages/servicios.astro` | `/servicios` | `/` |
| Nosotros | `src/pages/nosotros.astro` | `/nosotros` | `/` |
| Instalaciones | `src/pages/instalaciones.astro` | `/instalaciones` | `/` |
| Preguntas frecuentes | `src/pages/preguntas-frecuentes.astro` | `/preguntas-frecuentes` | `/preguntas-frecuentes` |
| Testimonios | `src/pages/testimonios.astro` | `/testimonios` | `/testimonios` |
| Regreso a casa | `src/pages/regreso-a-casa.astro` | `/regreso-a-casa` | `/regreso-a-casa` |

Datos que las páginas cargan con `fetch`, servidos desde `public/`:
- `/instagram.json`: feed que genera el bot.
- `/gallery/{instalaciones,jardin,urnas,mariposas,despedida}.json`: galerías del modal.
- `/Assets/testimonios/testimonios.json`: carrusel de testimonios.

## Reglas
- **No cambiar URLs ni nombres de archivos** en `src/pages/` ni en `public/`. `/Assets` va con A mayúscula, porque Cloudflare distingue mayúsculas en los archivos.
- `astro.config.mjs`: `build.format: 'file'` (genera `servicios.html`, que se sirve en `/servicios` sin barra final), `trailingSlash: 'never'` y `compressHTML: false`. No cambiar.
- **No crear `src/pages/404.astro`** sin decidirlo con el dueño. Sin 404.html, Cloudflare responde con la home y código 200 a cualquier ruta desconocida, **también a imágenes o videos que no existen**: el navegador recibe HTML y no puede mostrarlo. Por eso, toda ruta nueva a un archivo de `public/` hay que comprobarla (que exista con ese nombre exacto) y no basta con que responda 200.
- No usar `@astrojs/sitemap`: `public/sitemap.xml` es manual y solo lista `/`, `/testimonios` y `/preguntas-frecuentes`, todo en minúsculas y sin `www`.
- **`public/_redirects`**: `/servicios`, `/nosotros`, `/instalaciones` y `/regreso-a-casa` (con y sin `.html`, y sus versiones con mayúsculas) redirigen con 301 a `/`. `/Testimonios` y `/Preguntas-Frecuentes` redirigen a su versión en minúsculas. Los enlaces `/#...` no se tocan.
- Todo `<style>` y `<script>` de página lleva `is:inline`. Astro no procesa el CSS/JS y no genera archivos en `/_astro/`.
- **Los comentarios HTML dentro de slots se pierden** en Astro. Por eso no hay `BaseLayout` y cada página escribe su propio `<html>`, `<head>` y `<body>`.
- El HTML original tiene etiquetas mal cerradas que el compilador de Astro rechaza. Se emiten literales con `<Fragment set:html={"</div>"} />`. No "arreglarlas" sin revisar el resultado visual.
- **`public/_headers`**: el bloque `/*` con la CSP es el original; solo se agregan bloques, nunca se reemplaza. `immutable` va solo en `/_astro/*`. `/instagram.json` y `/gallery/*` no llevan caché larga.
- **testimonios está congelado**: `src/pages/testimonios.astro` es el HTML original, sin componentes, hasta su rediseño. Únicas correcciones aprobadas: horario 23:59, primer slide del carrusel como `testimonio-01.webp` (el `.webm` no existía) y se quitaron las fotos de perfil inexistentes de las reseñas (se ve la inicial). Su menú es el modelo del componente `Menu`.
- **Bot de Instagram**: `.github/workflows/instagram.yml` corre `update_instagram.py` cada 12 h (06:00 y 18:00 UTC). El script escribe `public/instagram.json` y `public/Assets/instagram/<id>.jpg` y hace commit en `main`. El `src` del JSON sigue siendo `/Assets/instagram/<id>.jpg`. Requiere el secret `IG_TOKEN`.
- Git: no hacer push a `main` ni merges sin aprobación del dueño.

## Componentes (`src/components/`)
| Componente | Uso |
|---|---|
| `Menu` | Menú del sitio, igual al de testimonios: botón corazón + menú lateral + barra de escritorio, con su `<style is:inline>`. Lo usan todas las páginas menos testimonios (que tiene el original) |
| `SvgDefs` | Gradientes `g-roof/g-wall/g-door/g-win` + `#icon-house` (index, servicios) |
| `HeartButton` | Botón corazón del celular (lo usa `Menu`) |
| `Drawer` | Menú lateral (lo usa `Menu`). Props: `links`, `cta` (`aleatorio`/`fijo`), `logo?`, `deco`, `acentos` |
| `NavPrincipal` | Menú de escritorio (lo usa `Menu`). Props: `logoHref`, `corazon?`, `links`, `cta` |
| `TopBar` | Barra superior. `variant`: `home`/`nosotros`/`faq`/`regreso` |
| `HeroCarousel` | Cabecera con carrusel. `variant`: `home`/`nosotros`/`regreso` |
| `PageHero` | Cabecera con migas de pan (preguntas-frecuentes) |
| `Footer` | Pie. `variant`: `home`/`nosotros`/`faq`/`regreso` |
| `GalleryModal` | Modal `#glb-overlay`. Prop `fondo` (`oscuro`/`blur`) |
| `GoogleTag` | gtag.js. Prop `comillas` (`dobles` en nosotros/instalaciones) |
| `Favicons` | Íconos del sitio |

- Las variantes literales (`TopBar/`, `HeroCarousel/`, `Footer/`) guardan el HTML exacto de cada grupo de páginas: `home` = index + servicios, `nosotros` = nosotros + instalaciones.
- El JavaScript (menú, carruseles, Instagram, galería) sigue en el `<script is:inline>` de cada página. Si se separa en varios `<script>`, cambia el DOM.
- Datos compartidos en `src/data/sitio.ts`:
  - WhatsApp: principal **56998461172**, secundario **56940082594**. `waAleatorio()` elige uno de los dos al azar; `waFijo()` usa el principal.
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
- Archivos locales en `public/Assets/Fonts/*.woff2` con `@font-face` inline y `preload`. nosotros, instalaciones y regreso-a-casa además cargan Google Fonts.

## Problemas conocidos (se conservaron a propósito en la migración)
- servicios, nosotros e instalaciones tienen canonical `/`. nosotros e instalaciones son idénticas.
- nosotros e instalaciones (que redirigen a la home) enlazan `foto-mulán-…-insipiracion…webp`, que no existe (el archivo real es `foto-mulan-…-inspiracion…webp`).
- Horario en los datos estructurados (JSON-LD): atención 24/7 se escribe `"opens": "00:00", "closes": "23:59"`. `00:00`–`00:00` significa "cerrado" para Google.
- La CSP de producción (con Google Analytics) viene del panel de Cloudflare, no de `_headers`. El `_headers` del repo no incluye los dominios de GA.
- `Assets/shared.css`, `index.css` y `faq.css` no se usan. `Assets/Fonts/uwu` es un archivo basura.
- Rocket Loader de Cloudflare está activo y reescribe scripts y `onclick`.
- regreso-a-casa bloquea el zoom en el celular (`user-scalable=no`).
