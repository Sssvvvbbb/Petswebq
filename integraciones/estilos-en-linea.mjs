// Integración de Astro: saca los atributos style="..." del HTML compilado.
//
// Por qué: la CSP de public/_headers no lleva 'unsafe-inline' en style-src, así
// que el navegador ignora cualquier atributo style del HTML. En el código fuente
// se pueden seguir escribiendo (el sitio tiene muchos, heredados del HTML
// original): al terminar el build, cada valor distinto pasa a una regla de
// /_astro/estilos-en-linea.<hash>.css y el elemento recibe su clase e-<hash>.
//
// La regla imita la prioridad de un style en línea: el selector
// .e-x:not(#_):not(#_):not(#_) pesa como 3 ids, más que cualquier selector
// del sitio, y el CSS se carga al final. Igual que un style en línea, pierde
// contra un !important de las hojas de estilo (salvo que el style también lo
// lleve). Lo que el JS cambie con elemento.style sigue funcionando: la CSP no lo
// bloquea y manda sobre las clases.
//
// No toca el HTML dentro de <script>, <style> ni comentarios. npm run check
// (scripts/check-csp.mjs) comprueba que no quede ningún style en el HTML.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parse } from 'parse5';

const hash = (texto, n) => createHash('sha256').update(texto).digest('hex').slice(0, n);
const PESO = ':not(#_):not(#_):not(#_)'; // ningún elemento tiene id="_"

export default function estilosEnLinea() {
  return {
    name: 'estilos-en-linea',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const paginas = readdirSync(dist).filter(f => f.endsWith('.html'));
        const reglas = new Map(); // valor del style → clase
        const cambios = [];
        for (const f of paginas) {
          const html = readFileSync(join(dist, f), 'utf8');
          const doc = parse(html, { sourceCodeLocationInfo: true });
          const ediciones = []; // [inicio, fin, texto nuevo]
          (function caminar(n) {
            const estilo = n.attrs?.find(a => a.name === 'style');
            if (estilo && n.sourceCodeLocation?.attrs) {
              const valor = estilo.value.trim().replace(/;\s*$/, '');
              if (/[{}<]/.test(valor)) throw new Error(`${f}: style con caracteres no permitidos: ${valor}`);
              if (valor) {
                if (!reglas.has(valor)) reglas.set(valor, 'e-' + hash(valor, 8));
                const clase = reglas.get(valor);
                const locs = n.sourceCodeLocation.attrs;
                const ls = locs.style;
                // quita el atributo style (con el espacio que lo precede)
                let ini = ls.startOffset;
                while (ini > 0 && /\s/.test(html[ini - 1])) ini--;
                ediciones.push([ini, ls.endOffset, '']);
                const claseAttr = n.attrs.find(a => a.name === 'class');
                if (claseAttr) {
                  const lc = locs.class;
                  const texto = html.slice(lc.startOffset, lc.endOffset);
                  const m = texto.match(/^class\s*=\s*(["']?)([\s\S]*?)\1$/);
                  const comilla = m[1] || '"';
                  ediciones.push([lc.startOffset, lc.endOffset, `class=${comilla}${m[2]} ${clase}${comilla}`]);
                } else {
                  ediciones.push([ls.endOffset, ls.endOffset, ` class="${clase}"`]);
                }
              } else {
                let ini = n.sourceCodeLocation.attrs.style.startOffset;
                while (ini > 0 && /\s/.test(html[ini - 1])) ini--;
                ediciones.push([ini, n.sourceCodeLocation.attrs.style.endOffset, '']);
              }
            }
            if (n.nodeName === 'script' || n.nodeName === 'style') return;
            for (const h of n.childNodes || []) caminar(h);
            if (n.content) caminar(n.content);
          })(doc);
          cambios.push([f, html, ediciones]);
        }
        const css = [...reglas].map(([valor, clase]) => `.${clase}${PESO}{${valor}}`).join('\n') + '\n';
        const archivo = `_astro/estilos-en-linea.${hash(css, 8)}.css`;
        mkdirSync(join(dist, '_astro'), { recursive: true });
        writeFileSync(join(dist, archivo), '/* Generado por integraciones/estilos-en-linea.mjs: atributos style del HTML */\n' + css);
        let total = 0;
        for (const [f, html, ediciones] of cambios) {
          let salida = html;
          // de atrás hacia adelante, para no mover las posiciones pendientes
          for (const [ini, fin, texto] of ediciones.sort((a, b) => b[0] - a[0] || b[1] - a[1])) salida = salida.slice(0, ini) + texto + salida.slice(fin);
          total += ediciones.filter(e => e[2] === '' ).length;
          salida = salida.replace('</head>', `<link rel="stylesheet" href="/${archivo}">\n</head>`);
          writeFileSync(join(dist, f), salida);
        }
        logger.info(`${total} atributos style → ${reglas.size} reglas en /${archivo}`);
      },
    },
  };
}
