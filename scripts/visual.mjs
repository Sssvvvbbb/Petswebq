// Red de seguridad para cambios que no deberían cambiar lo que se ve.
//
//   npm run visual -- --referencia   guarda capturas de referencia (antes del cambio)
//   npm run visual                   captura de nuevo, compara y prueba funciones
//   npm run visual -- --paginas=inicio,testimonios   limita las páginas
//
// Compila el sitio, lo sirve con astro preview en
// el puerto 4340 y lo recorre con el Chrome instalado (CHROME_PATH para usar
// otro).
//
// Capturas (en .visual/, fuera de git):
//   - cada página a 320, 390, 768 y 1440 px de ancho, página completa;
//   - sin JavaScript a 390 y 1440 px, para ver qué queda si el JS falla.
// Para que dos capturas del mismo sitio salgan idénticas se congela lo que
// cambia solo: Math.random con semilla fija, sin temporizadores largos
// (carruseles automáticos), sin animaciones ni transiciones y con todo el
// contenido "reveal" visible.
//
// Pruebas de funcionamiento (con temporizadores normales), a 390 y 1440 px:
// errores de consola y de CSP, imágenes rotas, scroll horizontal, enlaces de
// WhatsApp sin destino real, menú lateral (abrir, cerrar, foco), galerías de
// la home, filtros y acordeón de la FAQ y carrusel de testimonios.
//
// Sale con código 1 si alguna captura difiere más que el umbral (--umbral=0.05,
// en % de píxeles) o si falla una prueba.
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync, rmSync, writeFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

// Los binarios nativos (Astro, sharp) se cargan por su ruta real: si node_modules
// es un enlace a otra carpeta (worktree), Smart App Control de Windows bloquea
// la carga por la ruta del enlace aunque el archivo sea el mismo.
const real = p => realpathSync.native(join('node_modules', p));
const sharp = createRequire(real('sharp/package.json'))('sharp');
const ASTRO = real('astro/bin/astro.mjs');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const PUERTO = 4340;
const BASE = `http://localhost:${PUERTO}`;
const DIR = '.visual';
const MODO = args.referencia ? 'referencia' : 'actual';
const UMBRAL = Number(args.umbral ?? 0.05);
const ANCHOS = [320, 390, 768, 1440];
const ANCHOS_SIN_JS = [390, 1440];

let paginas;
const nombre = p => (p === '/' ? 'inicio' : p.slice(1));

function buscarChrome() {
  const candidatos = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const c = candidatos.find(existsSync);
  if (!c) throw new Error('No encontré Chrome. Indique la ruta con CHROME_PATH.');
  return c;
}

async function levantarServidor() {
  const proc = spawn(process.execPath, [ASTRO, 'preview', '--port', String(PUERTO), '--root', process.cwd()], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + '/')).ok) return proc; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('astro preview no respondió en el puerto ' + PUERTO);
}
function bajarServidor(proc) {
  proc.kill();
}

// Se ejecuta antes que los scripts de la página: azar con semilla y sin temporizadores largos.
function congelar() {
  let s = 12345;
  Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const si = window.setInterval, st = window.setTimeout;
  window.setInterval = (fn, ms, ...r) => (ms >= 1500 ? 0 : si(fn, ms, ...r));
  window.setTimeout = (fn, ms, ...r) => (ms >= 1500 ? 0 : st(fn, ms, ...r));
}

// nosotros, instalaciones y regreso-a-casa cargan además Google Fonts (las mismas
// familias que hay en local). Según cuánto tarde Google, la captura sale antes o
// después del cambio de fuente: en las capturas se bloquea y se usan las locales.
async function sinFuentesExternas(page) {
  await page.setRequestInterception(true);
  page.on('request', r => (/fonts\.(googleapis|gstatic)\.com/.test(r.url()) ? r.abort() : r.continue()));
}

async function prepararCaptura(page) {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.evaluate(async () => {
    document.querySelectorAll('.reveal,.reveal-fog').forEach(e => e.classList.add('visible'));
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
    window.scrollTo(0, 0);
    document.querySelectorAll('video').forEach(v => v.pause());
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; })));
    await Promise.all([...document.images].map(i => (i.decode ? i.decode().catch(() => {}) : null)));
  });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 500));
}

async function capturar(browser) {
  const out = join(DIR, MODO);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const p of paginas) {
    for (const ancho of ANCHOS) {
      const page = await browser.newPage();
      await page.setViewport({ width: ancho, height: 900, isMobile: ancho < 768, hasTouch: ancho < 768 });
      await page.evaluateOnNewDocument(congelar);
      await sinFuentesExternas(page);
      await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 60000 });
      await prepararCaptura(page);
      await page.screenshot({ path: join(out, `${nombre(p)}-${ancho}.png`), fullPage: true });
      await page.close();
    }
    for (const ancho of ANCHOS_SIN_JS) {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      // Sin JS no se puede forzar la carga diferida, y cuáles imágenes "lazy" alcanzan
      // a cargar en una captura de página completa depende del momento: el HTML se
      // entrega con loading="eager". También se bloquea Google Fonts (ver arriba).
      const html = (await (await fetch(BASE + p)).text()).replace(/loading="lazy"/g, 'loading="eager"');
      await page.setRequestInterception(true);
      page.on('request', r => {
        if (r.isNavigationRequest()) return r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
        if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) return r.abort();
        r.continue();
      });
      await page.setViewport({ width: ancho, height: 900, isMobile: ancho < 768 });
      await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 60000 });
      // Puppeteer puede evaluar aunque la página no ejecute JS: espera las fuentes.
      await page.evaluate(() => document.fonts.ready.then(() => document.fonts.size)).catch(() => {});
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: join(out, `${nombre(p)}-${ancho}-sin-js.png`), fullPage: true });
      await page.close();
    }
    process.stdout.write('.');
  }
  console.log(` ${paginas.length} páginas capturadas en ${out}`);
}

async function comparar() {
  const ref = join(DIR, 'referencia'), act = join(DIR, 'actual'), dif = join(DIR, 'diferencias');
  if (!existsSync(ref)) { console.log('No hay referencia: ejecute antes npm run visual -- --referencia'); return false; }
  rmSync(dif, { recursive: true, force: true });
  mkdirSync(dif, { recursive: true });
  let ok = true;
  for (const f of readdirSync(act).filter(f => f.endsWith('.png'))) {
    if (!existsSync(join(ref, f))) { ok = false; console.log(`  ✗ ${f}: no hay captura de referencia (¿se generó con otras páginas?)`); continue; }
    const [a, b] = await Promise.all([join(ref, f), join(act, f)].map(x => sharp(x).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
    const w = a.info.width, alto = Math.min(a.info.height, b.info.height);
    const marca = Buffer.from(b.data.subarray(0, w * alto * 4));
    let distintos = 0, primera = -1;
    for (let i = 0; i < w * alto * 4; i += 4) {
      const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
      if (d > 30) { distintos++; if (primera < 0) primera = Math.floor(i / 4 / w); marca[i] = 255; marca[i + 1] = 0; marca[i + 2] = 0; marca[i + 3] = 255; }
    }
    const pct = (100 * distintos) / (w * alto);
    // El navegador a veces redondea el alto total en 1-2 px sin cambiar nada visible.
    const dAlto = Math.abs(a.info.height - b.info.height);
    const cambioAlto = dAlto > 2;
    if (dAlto && !cambioAlto && pct <= UMBRAL) console.log(`  · ${f}: alto ${a.info.height} → ${b.info.height} (redondeo, se ignora)`);
    if (pct > UMBRAL || cambioAlto) {
      ok = false;
      await sharp(marca, { raw: { width: w, height: alto, channels: 4 } }).png().toFile(join(dif, f));
      console.log(`  ✗ ${f}: ${pct.toFixed(3)} % de píxeles distintos (desde y=${primera})${cambioAlto ? `, alto ${a.info.height} → ${b.info.height}` : ''}`);
    }
  }
  if (ok) console.log('  ✓ Todas las capturas coinciden con la referencia.');
  else console.log(`  Diferencias marcadas en rojo en ${dif}`);
  return ok;
}

async function probar(browser) {
  const fallas = [], avisos = [];
  for (const p of paginas) {
    for (const ancho of [390, 1440]) {
      const page = await browser.newPage();
      await page.setViewport({ width: ancho, height: 900, isMobile: ancho < 768, hasTouch: ancho < 768 });
      const donde = `${p} @${ancho}`;
      page.on('pageerror', e => fallas.push(`${donde}: error de JavaScript: ${e.message}`));
      page.on('console', m => { if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) fallas.push(`${donde}: consola: ${m.text().slice(0, 160)}`); });
      // Los enlaces externos (WhatsApp, Instagram, Maps) se abren en otra pestaña: no se siguen.
      await page.goto(BASE + p, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 800));

      const r = await page.evaluate(() => ({
        desborde: document.documentElement.scrollWidth - window.innerWidth,
        rotas: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.getAttribute('src')),
        waSinDestino: [...document.querySelectorAll('a[href="#"]')].filter(a => /wa\.me/.test(a.getAttribute('onclick') || '')).length,
      }));
      if (r.desborde > 1) fallas.push(`${donde}: scroll horizontal de ${r.desborde}px`);
      r.rotas.forEach(s => fallas.push(`${donde}: imagen rota ${s}`));
      if (r.waSinDestino) avisos.push(`${donde}: ${r.waSinDestino} botón(es) de WhatsApp con href="#" (sin destino si falla el JS)`);

      // Menú lateral (celular)
      if (ancho < 768 && await page.$('#heartBtn')) {
        await page.evaluate(() => window.scrollTo(0, 0));
        const cerrado = await page.evaluate(() => { const c = document.getElementById('drawerClose'); c.focus(); return { vis: getComputedStyle(document.getElementById('drawer')).visibility, foco: document.activeElement === c }; });
        if (cerrado.foco) avisos.push(`${donde}: con el menú cerrado, su botón de cierre recibe el foco del teclado`);
        await page.click('#heartBtn'); await new Promise(r => setTimeout(r, 500));
        const abierto = await page.evaluate(() => document.getElementById('drawer').classList.contains('open'));
        if (!abierto) fallas.push(`${donde}: el menú lateral no se abre`);
        await page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 500));
        if (await page.evaluate(() => document.getElementById('drawer').classList.contains('open'))) fallas.push(`${donde}: Escape no cierra el menú`);
      }

      // Galerías (home y páginas que las tengan)
      for (const clave of await page.$$eval('.mosaic-item[data-gallery]', els => els.map(e => e.dataset.gallery))) {
        await page.evaluate(k => document.querySelector(`.mosaic-item[data-gallery="${k}"]`).click(), clave);
        await new Promise(r => setTimeout(r, 1200));
        const n = await page.evaluate(() => document.querySelectorAll('#glb-track .glb-slide img, #glb-track iframe').length);
        if (!n) fallas.push(`${donde}: la galería "${clave}" abre vacía`);
        await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 500));
      }

      // FAQ: acordeón y filtros
      if (await page.$('.faq-question')) {
        await page.evaluate(() => document.querySelector('.faq-question').click());
        if (await page.evaluate(() => document.querySelector('.faq-question').getAttribute('aria-expanded')) !== 'true') fallas.push(`${donde}: la primera pregunta no se abre`);
        for (const cat of await page.$$eval('.cat-btn', els => els.map(e => e.dataset.cat))) {
          await page.evaluate(c => document.querySelector(`.cat-btn[data-cat="${c}"]`).click(), cat);
          const visibles = await page.evaluate(() => [...document.querySelectorAll('.faq-item')].filter(i => i.offsetParent !== null).length);
          if (!visibles) fallas.push(`${donde}: el filtro "${cat}" no muestra preguntas`);
        }
      }

      // Carrusel de testimonios
      if (await page.$('#testiSlidesContainer')) {
        const n = await page.evaluate(() => document.getElementById('testiSlidesContainer').children.length);
        if (!n) fallas.push(`${donde}: el carrusel de testimonios está vacío`);
      }
      await page.close();
    }
  }
  avisos.forEach(a => console.log('  · ' + a));
  fallas.forEach(f => console.log('  ✗ ' + f));
  if (!fallas.length) console.log('  ✓ Pruebas de funcionamiento sin fallas.');
  return !fallas.length;
}

// Escenarios con el sitio funcionando normal (nada congelado), a 390 px, en las
// páginas públicas. Complementan las capturas: ahí se congelan carruseles y
// animaciones, y eso puede esconder descargas anticipadas o contenido oculto.
const esperar = ms => new Promise(r => setTimeout(r, ms));
const bloquesOcultos = page => page.evaluate(() =>
  [...document.querySelectorAll('.reveal,.reveal-fog')].filter(e => parseFloat(getComputedStyle(e).opacity) < 0.5).length);
const enlacesWhatsApp = page => page.evaluate(() => document.querySelectorAll('a[href*="wa.me"]').length);

async function abrir(browser, ruta, { sinJs = false, antes } = {}) {
  const page = await browser.newPage();
  if (sinJs) await page.setJavaScriptEnabled(false);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  page.errores = [];
  page.on('pageerror', e => page.errores.push(e.message));
  if (antes) await antes(page);
  await page.goto(BASE + ruta, { waitUntil: 'load', timeout: 60000 });
  return page;
}

// Envuelve cada <script> en línea de la página en un setTimeout que lo ejecuta en
// el ámbito global con 6 s de retraso. Se excluyen JSON-LD, los scripts externos y
// los marcados con data-inmediato (el marcador de la clase "js" del <head>).
function retrasarScripts(html) {
  return html.replace(/<script(?![^>]*(?:application\/ld\+json|\ssrc=|data-inmediato))([^>]*)>([\s\S]*?)<\/script>/g,
    (m, attrs, codigo) => `<script${attrs}>setTimeout(function(){(0,eval)(${JSON.stringify(codigo).replace(/<\//g, '<\\/')})},6000)</script>`);
}

async function escenarios(browser, lista) {
  const fallas = [], avisos = [];
  for (const p of lista) {
    // 1. Sin JavaScript: contenido, contacto y respuestas de la FAQ.
    let page = await abrir(browser, p, { sinJs: true });
    let n = await bloquesOcultos(page);
    if (n) fallas.push(`${p} sin JS: ${n} bloque(s) de contenido invisibles`);
    if (!(await enlacesWhatsApp(page))) fallas.push(`${p} sin JS: ningún enlace de WhatsApp con destino real`);
    const cerradas = await page.evaluate(() => [...document.querySelectorAll('.faq-answer')].filter(a => a.getBoundingClientRect().height < 5).length);
    if (cerradas) fallas.push(`${p} sin JS: ${cerradas} respuesta(s) de la FAQ no se pueden leer`);
    await page.close();

    // 2. El script de la página falla al inicializarse (sin IntersectionObserver).
    page = await abrir(browser, p, { antes: pg => pg.evaluateOnNewDocument(() => { window.IntersectionObserver = undefined; }) });
    await esperar(5000);
    n = await bloquesOcultos(page);
    if (n) fallas.push(`${p} con el script fallando: ${n} bloque(s) invisibles a los 5 s`);
    await page.close();

    // 3. JavaScript retrasado 6 s: visible antes de que llegue y sin volver a ocultarse después.
    const html = retrasarScripts(await (await fetch(BASE + p)).text());
    page = await abrir(browser, p, {
      antes: async pg => {
        await pg.setRequestInterception(true);
        pg.on('request', r => (r.isNavigationRequest() ? r.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : r.continue()));
      },
    });
    await esperar(4500);
    n = await bloquesOcultos(page);
    if (n) fallas.push(`${p} con JS retrasado 6 s: ${n} bloque(s) invisibles a los 4,5 s`);
    await esperar(3500);
    const n2 = await bloquesOcultos(page);
    if (n2 > n) fallas.push(`${p} con JS retrasado 6 s: al llegar el script se ocultaron ${n2 - n} bloque(s) que ya se veían`);
    page.errores.forEach(e => avisos.push(`${p} con JS retrasado: error ${e.slice(0, 120)}`));
    await page.close();

    // 4. JSON caídos (testimonios, galerías, Instagram): la página sigue funcionando.
    page = await abrir(browser, p, {
      antes: async pg => {
        await pg.setRequestInterception(true);
        pg.on('request', r => (/(testimonios\.json|\/gallery\/[^/]+\.json|instagram\.json)/.test(r.url()) ? r.respond({ status: 500, body: '' }) : r.continue()));
      },
    });
    await esperar(2500);
    page.errores.forEach(e => fallas.push(`${p} con JSON caídos: error de JavaScript ${e.slice(0, 120)}`));
    if (await page.$('#testiSlidesContainer')) {
      const hijos = await page.evaluate(() => document.querySelectorAll('#testiSlidesContainer .testi-slide').length);
      if (!hijos) fallas.push(`${p} con JSON caídos: el carrusel de testimonios queda vacío`);
    }
    await page.close();

    // 5. Videos: nada de .webm antes de pulsar reproducir; portadas solo de lo que se muestra.
    const pedidos = [];
    page = await abrir(browser, p, { antes: pg => { pg.on('request', r => pedidos.push(r.url())); } });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await esperar(13000); // da tiempo a que el carrusel avance dos veces
    const videos = pedidos.filter(u => /\.(webm|mp4)(\?|$)/.test(u));
    if (videos.length) fallas.push(`${p}: ${videos.length} descarga(s) de video sin pulsar reproducir (${[...new Set(videos.map(u => u.split('/').pop()))].join(', ')})`);
    const portadas = pedidos.filter(u => /-portada\.webp/.test(u)).length;
    if (portadas > 2) avisos.push(`${p}: se descargaron ${portadas} portadas de video sin mostrarlas`);
    await page.close();

    // 6. Movimiento reducido: los carruseles no avanzan solos.
    page = await abrir(browser, p, { antes: pg => pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]) });
    const estado = () => page.evaluate(() => [
      [...document.querySelectorAll('.carousel-dots .dot')].findIndex(d => d.classList.contains('active')),
      document.getElementById('testiCounter')?.textContent ?? '',
    ].join('|'));
    const antes = await estado();
    await esperar(9000);
    if ((await estado()) !== antes) avisos.push(`${p} con movimiento reducido: un carrusel avanzó solo`);
    await page.close();
  }
  avisos.forEach(a => console.log('  · ' + a));
  fallas.forEach(f => console.log('  ✗ ' + f));
  if (!fallas.length) console.log('  ✓ Escenarios sin fallas.');
  return !fallas.length;
}

// Dos ejecuciones a la vez se pisan la carpeta de referencia: se usa un candado.
const CANDADO = join(DIR, 'en-curso.lock');
mkdirSync(DIR, { recursive: true });
if (existsSync(CANDADO)) {
  console.error(`Ya hay un npm run visual en curso (${CANDADO}). Si no es así, borre ese archivo.`);
  process.exit(1);
}
writeFileSync(CANDADO, String(process.pid));
process.on('exit', () => rmSync(CANDADO, { force: true }));
console.log('Compilando...');
await new Promise((ok, mal) => spawn(process.execPath, [ASTRO, 'build', '--root', process.cwd()], { stdio: 'ignore' })
  .on('exit', c => (c === 0 ? ok() : mal(new Error('astro build falló (código ' + c + ')')))));
// --paginas acepta "inicio,testimonios" o "/,/testimonios". Se queda con el último
// segmento porque Git Bash convierte "/nosotros" en "C:/Program Files/Git/nosotros".
paginas = args.paginas
  ? String(args.paginas).split(',').map(x => x.split('/').pop()).map(x => (x === '' || x === 'inicio' ? '/' : '/' + x))
  : readdirSync('dist').filter(f => f.endsWith('.html')).map(f => (f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, '')));
const servidor = await levantarServidor();
const sitioPublico = ['/', '/testimonios', '/preguntas-frecuentes'].filter(p => paginas.includes(p));
const browser = await puppeteer.launch({ executablePath: buscarChrome(), headless: true });
let ok = true;
try {
  console.log(`Capturas (${MODO}):`);
  await capturar(browser);
  if (MODO === 'actual') {
    console.log('Comparación con la referencia:');
    ok = (await comparar()) && ok;
  }
  console.log('Pruebas de funcionamiento:');
  ok = (await probar(browser)) && ok;
  console.log('Escenarios sin congelar (JS retrasado o con fallas, JSON caído, videos, movimiento reducido):');
  ok = (await escenarios(browser, sitioPublico)) && ok;
} finally {
  rmSync(CANDADO, { force: true });
  await browser.close();
  bajarServidor(servidor);
}
writeFileSync(join(DIR, `ultimo-${MODO}.txt`), new Date().toISOString());
process.exit(ok ? 0 : 1);
