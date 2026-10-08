// Compara cada página generada en dist/ con el HTML original del sitio
// estático (rama main, antes de la migración a Astro).
//
// Criterio: DOM idéntico. Ambos HTML se parsean con parse5 (el algoritmo
// HTML5 que usan los navegadores) y se comparan serializados, normalizando
// solo espacios en blanco. Así se ignoran diferencias de escritura que no
// cambian lo que ve el navegador (p. ej. <path/> vs <path></path>, o "<"
// escrito como &lt; dentro de un atributo), pero cualquier cambio real de
// etiquetas, atributos o texto se reporta.
//
// Uso: npm run build && npm run compare
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { parse, serialize } from 'parse5';

// Referencia: commit con los HTML originales (COMPARE_REF para cambiarlo).
const REF = process.env.COMPARE_REF || 'main';

// página generada -> archivo original
const PAGES = {
  'index.html': 'index.html',
  'servicios.html': 'servicios.html',
  'nosotros.html': 'nosotros.html',
  'instalaciones.html': 'instalaciones.html',
  'preguntas-frecuentes.html': 'preguntas-frecuentes.html',
  'testimonios.html': 'testimonios.html',
  'regreso-a-casa.html': 'regreso-a-casa',
};

const dom = (html) =>
  serialize(parse(html.replace(/\r\n?/g, '\n')))
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

let total = 0;
for (const [built, original] of Object.entries(PAGES)) {
  const builtPath = `dist/${built}`;
  if (!existsSync(builtPath)) {
    console.log(`✗ ${built}: no existe en dist/`);
    total++;
    continue;
  }
  const a = dom(execFileSync('git', ['show', `${REF}:${original}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const b = dom(readFileSync(builtPath, 'utf8'));
  if (a === b) {
    console.log(`✓ ${built}: 0 diferencias`);
    continue;
  }
  total++;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  console.log(`✗ ${built}: difiere desde el carácter ${i}`);
  console.log(`  original: …${a.slice(Math.max(0, i - 80), i + 200)}…`);
  console.log(`  astro   : …${b.slice(Math.max(0, i - 80), i + 200)}…`);
}

console.log(total === 0 ? '\nTotal: 0 diferencias' : `\nTotal: ${total} página(s) con diferencias`);
process.exit(total === 0 ? 0 : 1);
