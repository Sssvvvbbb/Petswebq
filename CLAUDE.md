# PetsAlCielo — petsalcielo.cl

Sitio de un crematorio ecológico de mascotas en Puerto Montt (Chile). Está hecho con **Astro** (estático) y se publica en **Cloudflare Pages**. Todos los textos están en español de Chile.

## Comandos
- `npm run dev`: servidor local.
- `npm run build`: genera `dist/`. Configurar en Cloudflare Pages: build `npm run build`, output `dist`, `NODE_VERSION=22`.
- `npm run compare`: compara el DOM de cada página en `dist/` con el HTML original de `main` (anterior a la migración). **Correrlo antes de cada commit** mientras la migración no esté publicada: tiene que dar `Total: 0 diferencias`. Una vez publicada, se apunta a otra referencia con `COMPARE_REF=<commit>`.

## Rutas (NO CAMBIAR: están posicionadas en Google)
| Página | Archivo | URL | Canonical actual |
|---|---|---|---|
| Inicio | `src/pages/index.astro` | `/` | `https://petsalcielo.cl/` |
| Servicios | `src/pages/servicios.astro` | `/servicios` | `/` |
| Nosotros | `src/pages/nosotros.astro` | `/nosotros` | `/` |
| Instalaciones | `src/pages/instalaciones.astro` | `/instalaciones` | `/` |
| Preguntas frecuentes | `src/pages/preguntas-frecuentes.astro` | `/preguntas-frecuentes` | `/preguntas-frecuentes` |
| Testimonios | `src/pages/testimonios.astro` | `/testimonios` | `/testimonios` |
| Regreso a casa | `src/pages/regreso-a-casa.astro` | `/regreso-a-casa` | `/RegresoACasa` |

Datos que las páginas cargan con `fetch`, servidos desde `public/`:
- `/instagram.json`: feed que genera el bot.
- `/gallery/{instalaciones,jardin,urnas,mariposas,despedida}.json`: galerías del modal.
- `/Assets/testimonios/testimonios.json`: carrusel de testimonios.

## Reglas
- **No cambiar URLs ni nombres de archivos** en `src/pages/` ni en `public/`. `/Assets` va con A mayúscula, porque Cloudflare distingue mayúsculas en los archivos.
- `astro.config.mjs`: `build.format: 'file'` (genera `servicios.html`, que se sirve en `/servicios` sin barra final), `trailingSlash: 'never'` y `compressHTML: false`. No cambiar.
- **No crear `src/pages/404.astro`**. Sin 404.html, Cloudflare responde con la home a las rutas desconocidas, y de eso dependen las URLs con mayúsculas del sitemap (`/Servicios`, `/RegresoACasa`…).
- No usar `@astrojs/sitemap`: `public/sitemap.xml` es manual.
- Todo `<style>` y `<script>` de página lleva `is:inline`. Astro no procesa el CSS/JS y no genera archivos en `/_astro/`.
- **Los comentarios HTML dentro de slots se pierden** en Astro. Por eso no hay `BaseLayout` y cada página escribe su propio `<html>`, `<head>` y `<body>`.
- El HTML original tiene etiquetas mal cerradas que el compilador de Astro rechaza. Se emiten literales con `<Fragment set:html={"</div>"} />`. No "arreglarlas" sin revisar el resultado visual.
- **`public/_headers`**: el bloque `/*` con la CSP es el original; solo se agregan bloques, nunca se reemplaza. `immutable` va solo en `/_astro/*`. `/instagram.json` y `/gallery/*` no llevan caché larga.
- **testimonios está congelado**: `src/pages/testimonios.astro` es el HTML original tal cual, sin componentes, hasta su rediseño posterior a la migración.
- **Bot de Instagram**: `.github/workflows/instagram.yml` corre `update_instagram.py` cada 12 h (06:00 y 18:00 UTC). El script escribe `public/instagram.json` y `public/Assets/instagram/<id>.jpg` y hace commit en `main`. El `src` del JSON sigue siendo `/Assets/instagram/<id>.jpg`. Requiere el secret `IG_TOKEN`.
- Git: no hacer push a `main` ni merges sin aprobación del dueño.

## Componentes (`src/components/`)
| Componente | Uso |
|---|---|
| `SvgDefs` | Gradientes `g-roof/g-wall/g-door/g-win` + `#icon-house` (index, servicios) |
| `HeartButton` | Botón corazón del celular. Prop `acentos` (preguntas-frecuentes) |
| `Drawer` | Menú lateral. Props: `links`, `cta` (`aleatorio`/`fijo`), `logo?`, `deco`, `acentos` |
| `NavPrincipal` | Menú de escritorio. Props: `logoHref`, `corazon?`, `links`, `cta` |
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
- `sitemap.xml` usa `https://www.petsalcielo.cl/Servicios`, `/RegresoACasa`, etc. Esas URLs no existen: Cloudflare las responde con la home (soft 404), y `www` redirige a la versión sin `www`.
- servicios, nosotros e instalaciones tienen canonical `/`. nosotros e instalaciones son idénticas.
- Recursos referenciados que no existen. Sin 404, cada uno descarga la home (~127 KB):
  - en testimonios: `Assets/reviews/*-perfil.webp`, `nombre-apellido-1.webp` y `Assets/testimonios/testimonio-01.webm`;
  - en nosotros e instalaciones: `foto-mulán-…-insipiracion…webp`.
- La CSP de producción (con Google Analytics) viene del panel de Cloudflare, no de `_headers`. El `_headers` del repo no incluye los dominios de GA.
- `Assets/shared.css`, `index.css` y `faq.css` no se usan. `Assets/Fonts/uwu` es un archivo basura.
- Rocket Loader de Cloudflare está activo y reescribe scripts y `onclick`.
- regreso-a-casa bloquea el zoom en el celular (`user-scalable=no`).
