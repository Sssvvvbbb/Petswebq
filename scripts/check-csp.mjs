// Comprueba que el HTML de dist/ funcione con la CSP de public/_headers, que no
// permite scripts ni estilos en línea ('unsafe-inline' no está en script-src ni
// en style-src):
//
// - ningún atributo de evento (onclick, onmouseover...) ni enlace javascript:.
//   Los comportamientos van en scripts que empaqueta Astro (ver src/scripts/);
// - cada <script> en línea que se ejecuta (hoy solo el de MejoraProgresiva) tiene
//   su hash 'sha256-...' en script-src. Si se cambia ese script, este chequeo
//   muestra el hash nuevo para reemplazarlo en _headers;
// - ningún atributo style="..." (integraciones/estilos-en-linea.mjs los pasa a
//   un CSS al compilar) y cada <style> en línea (@font-face y MejoraProgresiva)
//   con su hash en style-src.
//
// Los JSON-LD (type="application/ld+json") no se ejecutan y la CSP no los afecta.
// Uso: npm run check (compila y revisa). Sale con código 1 si hay errores.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const csp = (readFileSync('public/_headers', 'utf8').match(/^\/\*\s*\n(?:[ \t]+.*\n)*?[ \t]+Content-Security-Policy:[ \t]*(.+)$/m) || [])[1];
if (!csp) { console.error('✗ No encontré la Content-Security-Policy de "/*" en public/_headers'); process.exit(1); }
const scriptSrc = (csp.match(/script-src([^;]*)/) || [])[1] || '';
const styleSrc = (csp.match(/style-src([^;]*)/) || [])[1] || '';
const errores = [];
if (/'unsafe-inline'/.test(scriptSrc)) errores.push("script-src volvió a incluir 'unsafe-inline'");
if (/'unsafe-inline'/.test(styleSrc)) errores.push("style-src volvió a incluir 'unsafe-inline'");

for (const f of readdirSync('dist').filter(f => f.endsWith('.html'))) {
  const html = readFileSync('dist/' + f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of html.matchAll(/<[a-z][^>]*?\s(on[a-z]+)\s*=/gi)) errores.push(`${f}: atributo ${m[1]}= (la CSP lo bloquea; usar un script de src/scripts/)`);
  if (/href\s*=\s*["']?\s*javascript:/i.test(html)) errores.push(`${f}: enlace javascript: (la CSP lo bloquea)`);
  for (const m of html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type\s*=\s*["']?application\/ld\+json/.test(m[1])) continue;
    const hash = `'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`;
    if (!scriptSrc.includes(hash)) errores.push(`${f}: script en línea sin su hash en script-src. Agregar ${hash} (y quitar el hash antiguo si ya no se usa): ${m[2].trim().slice(0, 70)}…`);
  }
  for (const m of html.matchAll(/<[a-z][^>]*?\sstyle\s*=/gi)) errores.push(`${f}: atributo style= que quedó en el HTML: ${m[0].slice(0, 80)}`);
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const hash = `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`;
    if (!styleSrc.includes(hash)) errores.push(`${f}: <style> en línea sin su hash en style-src. Agregar ${hash} (y quitar el hash antiguo si ya no se usa): ${m[1].trim().slice(0, 70)}…`);
  }
}
errores.forEach(e => console.log('  ✗ ' + e));
if (errores.length) process.exit(1);
console.log('✓ El HTML es compatible con la CSP (sin scripts ni estilos en línea fuera de los hashes).');
