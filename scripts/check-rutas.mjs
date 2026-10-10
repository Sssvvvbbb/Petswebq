// Comprueba que cada archivo y enlace interno que usa el sitio exista con el
// nombre exacto (mayúsculas y tildes incluidas).
//
// Por qué: sin 404.html, Cloudflare responde con la home y código 200 a
// cualquier ruta que no existe, y Windows no distingue mayúsculas. Un nombre
// mal escrito no da error ni en local ni en producción: la imagen
// simplemente no se ve.
//
// Revisa las páginas de dist/ (sin los comentarios HTML) y los JSON que las
// páginas cargan con fetch: src, href, srcset, poster, data-src, metas con
// URL de petsalcielo.cl, url(...) del CSS y rutas '/Assets/...' o
// '/gallery/...' escritas dentro de los <script> (en línea o en /_astro/*.js). También revisa enlaces a
// páginas (sin .html ni barra final) y anclas /#id.
//
// Las páginas que _redirects manda a la home se informan como aviso, no
// como error, porque nadie las ve.
//
// Uso: npm run check (compila y revisa). Sale con código 1 si hay errores.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'parse5';

const DIST = 'dist';
const PUBLIC = 'public';
const SITIO = 'https://petsalcielo.cl';
const JSONS = ['instagram.json', 'gallery/instalaciones.json', 'gallery/jardin.json', 'gallery/urnas.json', 'gallery/despedida.json', 'Assets/testimonios/testimonios.json'];

if (!existsSync(DIST)) {
  console.error('No existe dist/. Ejecute primero npm run build (o use npm run check, que compila).');
  process.exit(1);
}

// Archivos de dist/ (public/ copiado + lo generado) con su nombre real. Se
// compara contra esta lista y no con existsSync, porque en Windows existsSync
// no distingue mayúsculas.
const archivos = new Set();
(function recorrer(dir, base) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = base + '/' + e.name;
    if (e.isDirectory()) recorrer(join(dir, e.name), rel);
    else archivos.add(rel);
  }
})(DIST, '');

const paginas = readdirSync(DIST).filter(f => f.endsWith('.html'));
const rutaDePagina = f => (f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, ''));
const rutasPagina = new Set(paginas.map(rutaDePagina));

// Páginas que _redirects manda a la home (sus problemas son solo avisos).
const redirigidas = new Set();
if (existsSync(join(PUBLIC, '_redirects'))) {
  for (const linea of readFileSync(join(PUBLIC, '_redirects'), 'utf8').split('\n')) {
    const [desde, hacia] = linea.trim().split(/\s+/);
    if (desde && hacia === '/' && rutasPagina.has(desde)) redirigidas.add(desde);
  }
}

// ids de cada página, para comprobar anclas.
const ids = {};
const docs = {};
for (const f of paginas) {
  docs[f] = parse(readFileSync(join(DIST, f), 'utf8'));
  const set = new Set();
  (function caminar(n) {
    for (const a of n.attrs || []) if (a.name === 'id') set.add(a.value);
    for (const h of n.childNodes || []) caminar(h);
    if (n.content) caminar(n.content);
  })(docs[f]);
  ids[rutaDePagina(f)] = set;
}

const errores = [];
const avisos = [];

function revisar(valor, origen, paginaActual) {
  let u = valor.trim();
  if (!u || u.startsWith('data:') || /^(mailto|tel|javascript|blob):/i.test(u)) return;
  if (u.startsWith(SITIO)) u = u.slice(SITIO.length) || '/';
  else if (/^(https?:)?\/\//i.test(u)) return; // externo
  if (u === '#') return;

  const [sinHash, ancla] = u.split('#');
  const camino = sinHash.split('?')[0];
  let problema = null;

  if (camino === '' && ancla !== undefined) {
    // #id en la misma página
    if (paginaActual && !ids[paginaActual].has(ancla)) problema = `ancla #${ancla} no existe en ${paginaActual}`;
  } else if (!camino.startsWith('/')) {
    problema = 'ruta relativa (debe empezar con /)';
  } else if (camino === '/' || rutasPagina.has(camino)) {
    if (ancla && !ids[camino].has(ancla)) problema = `ancla #${ancla} no existe en ${camino}`;
  } else if (/\.html$/.test(camino) || (camino.length > 1 && camino.endsWith('/'))) {
    problema = 'enlace a página con .html o barra final';
  } else {
    let decodificado;
    try { decodificado = decodeURIComponent(camino); } catch { decodificado = camino; }
    if (!archivos.has(decodificado)) problema = 'el archivo no existe con ese nombre exacto';
  }
  if (!problema) return;
  const linea = `${origen}: ${valor} → ${problema}`;
  (paginaActual && redirigidas.has(paginaActual) ? avisos : errores).push(linea);
}

const ATRIBUTOS = new Set(['src', 'href', 'poster', 'data-src', 'data-poster', 'data-video', 'data-mp4']);
for (const f of paginas) {
  const ruta = rutaDePagina(f);
  (function caminar(n) {
    if (n.nodeName === '#comment') return;
    for (const a of n.attrs || []) {
      if (ATRIBUTOS.has(a.name)) revisar(a.value, f, ruta);
      else if (a.name === 'srcset') a.value.split(',').forEach(p => revisar(p.trim().split(/\s+/)[0], f, ruta));
      else if (a.name === 'content' && a.value.startsWith(SITIO)) revisar(a.value, f, ruta);
      else if (a.name === 'style') for (const m of a.value.matchAll(/url\(\s*['"]?([^'")]+)/g)) revisar(m[1], f, ruta);
    }
    if (n.nodeName === '#text' && n.parentNode) {
      const padre = n.parentNode.nodeName;
      if (padre === 'style') for (const m of n.value.matchAll(/url\(\s*['"]?([^'")]+)/g)) revisar(m[1], f, ruta);
      if (padre === 'script') for (const m of n.value.matchAll(/['"`](\/(?:Assets|gallery)\/[^'"`]*\.[a-z0-9]{2,5})['"`]/gi)) revisar(m[1], f, ruta);
    }
    for (const h of n.childNodes || []) caminar(h);
    if (n.content) caminar(n.content);
  })(docs[f]);
}

// Scripts que empaqueta Astro (/_astro/*.js, con sus imports): mismas rutas
// '/Assets/...' y '/gallery/...' que se revisan dentro de los <script> en línea.
// Si solo los cargan páginas que redirigen, sus problemas son avisos.
const RUTA_EN_JS = /['"`](\/(?:Assets|gallery)\/[^'"`]*\.[a-z0-9]{2,5})['"`]/gi;
const paginasDeJs = new Map();
function seguirJs(archivo, ruta) {
  const lista = paginasDeJs.get(archivo) || [];
  if (lista.includes(ruta)) return;
  paginasDeJs.set(archivo, lista.concat(ruta));
  const codigo = readFileSync(join(DIST, archivo), 'utf8');
  for (const m of codigo.matchAll(/(?:import|from)\s*["']\.\/([^"']+\.js)["']/g)) seguirJs('_astro/' + m[1], ruta);
}
for (const f of paginas) {
  (function caminar(n) {
    if (n.nodeName === 'script') {
      const src = (n.attrs || []).find(a => a.name === 'src')?.value || '';
      if (src.startsWith('/_astro/')) seguirJs(src.slice(1), rutaDePagina(f));
    }
    for (const h of n.childNodes || []) caminar(h);
    if (n.content) caminar(n.content);
  })(docs[f]);
}
for (const [archivo, rutas] of paginasDeJs) {
  const visible = rutas.find(r => !redirigidas.has(r)) || rutas[0];
  for (const m of readFileSync(join(DIST, archivo), 'utf8').matchAll(RUTA_EN_JS)) revisar(m[1], archivo, visible);
}

for (const j of JSONS) {
  const p = join(PUBLIC, j);
  if (!existsSync(p)) { errores.push(`${j}: el JSON no existe`); continue; }
  const texto = readFileSync(p, 'utf8');
  try { JSON.parse(texto); } catch (e) { errores.push(`${j}: JSON inválido (${e.message})`); continue; }
  for (const m of texto.matchAll(/"(?:src|poster|mp4)"\s*:\s*"([^"]+)"/g)) revisar(m[1], j, null);
}

if (avisos.length) {
  console.log(`Avisos en páginas que redirigen a la home (${avisos.length}):`);
  avisos.forEach(a => console.log('  · ' + a));
}
if (errores.length) {
  console.log(`\n✗ ${errores.length} problema(s):`);
  errores.forEach(e => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log(`\n✓ Rutas correctas en ${paginas.length} páginas, ${paginasDeJs.size} scripts y ${JSONS.length} JSON.`);
