// Secciones que se administran desde /admin y cómo se guarda cada una.
// - Galerías de la Biblioteca: public/gallery/<clave>.json ({ "fotos": [...] }).
//   Cada foto nueva va en la carpeta de su galería (public/Assets/biblioteca/<carpeta>/)
//   en tres tamaños (como las del rediseño): <nombre>.webp (hasta 1600 px),
//   <nombre>-1100.webp y <nombre>-140.webp (miniatura cuadrada), y en el JSON con src,
//   grande, mini y alt. El sitio actual usa solo src y alt; el rediseño, también grande y mini.
// - Testimonios de la página web (/testimonios): public/Assets/pagina-web-testimonios/
//   testimonios/testimonios.json (lista). Las fotos van en esa carpeta como
//   testimonio-<fecha>-<azar>.webp, recortadas a 9:16. Los videos existentes se pueden
//   mover o quitar, pero no se suben desde aquí.
// Las fotos llegan ya convertidas a WebP por el navegador (src/scripts/admin/).
import type { Env } from './tipos';
import { cabeza, commit, crearBlob, leerTexto, listar, rama } from './github';

export class ErrorUsuario extends Error {
    constructor(mensaje: string, public status = 400) { super(mensaje); }
}

// Galerías en el orden en que se muestran, con su nombre en /admin y su carpeta.
// Una galería nueva (otro JSON en public/gallery/) usa biblioteca/<clave>.
const GALERIAS: Record<string, { titulo: string; carpeta: string }> = {
    instalaciones: { titulo: 'Nuestros servicios', carpeta: 'servicios' },
    jardin: { titulo: 'Nuestro equipo e instalaciones', carpeta: 'equipo' },
    urnas: { titulo: 'Ánforas', carpeta: 'anforas' },
    relicarios: { titulo: 'Relicarios', carpeta: 'relicarios' },
    despedida: { titulo: 'Testimonios de la Biblioteca', carpeta: 'testimonios' },
};
const ORDEN = Object.keys(GALERIAS);
export const carpetaGaleria = (clave: string) => `/Assets/biblioteca/${GALERIAS[clave]?.carpeta || clave}`;

export interface Seccion { id: string; tipo: 'galeria' | 'testimonios'; titulo: string; ruta: string }

export async function secciones(env: Env, ref = rama(env)): Promise<Seccion[]> {
    const claves = (await listar(env, 'public/gallery', ref))
        .filter(f => f.type === 'file' && /^[a-z0-9-]{1,40}\.json$/.test(f.name))
        .map(f => f.name.slice(0, -5))
        .sort((a, b) => (ORDEN.indexOf(a) + 1 || 99) - (ORDEN.indexOf(b) + 1 || 99));
    return [
        ...claves.map(c => ({ id: 'galeria:' + c, tipo: 'galeria' as const, titulo: GALERIAS[c]?.titulo || c, ruta: `public/gallery/${c}.json` })),
        { id: 'testimonios', tipo: 'testimonios', titulo: 'Testimonios de la página web', ruta: 'public/Assets/pagina-web-testimonios/testimonios/testimonios.json' },
    ];
}

type Item = Record<string, unknown> & { src: string; alt?: string };

// Lee el JSON de una sección: los elementos y el objeto completo (para conservar
// cualquier otro campo al reescribirlo).
export async function leerSeccion(env: Env, s: Seccion, ref: string) {
    const { sha, texto } = await leerTexto(env, s.ruta, ref);
    const datos = JSON.parse(texto);
    const items: Item[] = s.tipo === 'galeria' ? datos.fotos : datos;
    if (!Array.isArray(items)) throw new Error(`${s.ruta} no tiene el formato esperado`);
    return { sha, datos, items: items.filter(it => it && typeof it.src === 'string') };
}

// Modo de prueba (vistas previas en *.pages.dev, sin Access ni token): las secciones
// se leen de los JSON publicados en el propio despliegue y nada se escribe.
export interface Prueba { activos: { fetch(r: Request): Promise<Response> }; origen: string }

export function seccionesPrueba(): Seccion[] {
    return [
        ...ORDEN.map(c => ({ id: 'galeria:' + c, tipo: 'galeria' as const, titulo: GALERIAS[c].titulo, ruta: `public/gallery/${c}.json` })),
        { id: 'testimonios', tipo: 'testimonios', titulo: 'Testimonios de la página web', ruta: 'public/Assets/pagina-web-testimonios/testimonios/testimonios.json' },
    ];
}

export async function leerPublicada(prueba: Prueba, s: Seccion) {
    const r = await prueba.activos.fetch(new Request(prueba.origen + s.ruta.slice('public'.length)));
    const datos = JSON.parse(await r.text()); // un JSON que no existe llega como HTML y falla aquí
    const items: Item[] = s.tipo === 'galeria' ? datos.fotos : datos;
    if (!Array.isArray(items)) throw new Error(`${s.ruta} no tiene el formato esperado`);
    return { sha: 'publicado', datos, items: items.filter(it => it && typeof it.src === 'string') };
}

export const limpiarAlt = (x: unknown) =>
    String(x ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

// Tamaños máximos de cada versión (en bytes). El navegador las deja muy por debajo.
const LIMITES: Record<string, number> = { src: 3_000_000, grande: 1_500_000, mini: 80_000 };

async function webp(form: FormData, campo: string, limite: number): Promise<Uint8Array> {
    const f = form.get(campo);
    if (!f || typeof f === 'string') throw new ErrorUsuario(`Falta el archivo ${campo}`);
    if (f.size > limite) throw new ErrorUsuario(`El archivo ${campo} pesa demasiado (${Math.round(f.size / 1024)} KB)`);
    const b = new Uint8Array(await f.arrayBuffer());
    const ascii = (i: number) => String.fromCharCode(...b.subarray(i, i + 4));
    if (b.length < 16 || ascii(0) !== 'RIFF' || ascii(8) !== 'WEBP') throw new ErrorUsuario(`El archivo ${campo} no es WebP`);
    return b;
}

const sello = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const azar = () => Array.from(crypto.getRandomValues(new Uint8Array(3)), b => b.toString(16).padStart(2, '0')).join('');

interface Pedido { src?: unknown; nuevo?: unknown; alt?: unknown }

// Guarda la sección con la lista que manda /admin (orden final; cada elemento es
// una foto existente {src, alt} o una nueva {nuevo: "n0", alt} con sus archivos en
// el formulario). `base` es el sha del JSON que se cargó: si alguien más lo cambió
// entretanto, no se pisa (409).
export async function guardar(env: Env, form: FormData, prueba?: Prueba): Promise<{ commit: string; nuevas: number; quitadas: number; prueba?: boolean }> {
    const id = String(form.get('seccion') || '');
    const base = String(form.get('sha') || '');
    let pedido: Pedido[];
    try { pedido = JSON.parse(String(form.get('lista') || '')); } catch { throw new ErrorUsuario('Lista inválida'); }
    if (!Array.isArray(pedido) || pedido.length > 300) throw new ErrorUsuario('Lista inválida');

    const s = (prueba ? seccionesPrueba() : await secciones(env)).find(x => x.id === id);
    if (!s) throw new ErrorUsuario('Sección desconocida');

    // Fotos nuevas: se validan y suben como blobs una sola vez (sirven en los reintentos).
    const stamp = sello();
    const archivos: { path: string; sha: string }[] = [];
    const nuevas = new Map<string, Item>();
    const subir = (b: Uint8Array) => (prueba ? Promise.resolve('') : crearBlob(env, b));
    for (const p of pedido) {
        if (p?.nuevo === undefined) continue;
        const n = String(p.nuevo);
        if (!/^n\d{1,3}$/.test(n) || nuevas.has(n)) throw new ErrorUsuario('Foto nueva inválida');
        if (nuevas.size >= 20) throw new ErrorUsuario('Puedes guardar hasta 20 fotos nuevas de una vez. Guarda estas y luego agrega las demás.');
        const alt = limpiarAlt(p.alt);
        if (!alt) throw new ErrorUsuario('Falta escribir qué se ve en una foto nueva.');
        if (s.tipo === 'galeria') {
            const clave = id.slice('galeria:'.length);
            const carpeta = carpetaGaleria(clave);
            const nombre = `${carpeta}/${carpeta.split('/').pop()}-${stamp}-${azar()}`;
            const v: Record<string, string> = { src: `${nombre}.webp`, grande: `${nombre}-1100.webp`, mini: `${nombre}-140.webp` };
            for (const [campo, url] of Object.entries(v)) {
                archivos.push({ path: 'public' + url, sha: await subir(await webp(form, `${n}:${campo}`, LIMITES[campo])) });
            }
            nuevas.set(n, { ...v, alt });
        } else {
            const url = `/Assets/pagina-web-testimonios/testimonios/testimonio-${stamp}-${azar()}.webp`;
            archivos.push({ path: 'public' + url, sha: await subir(await webp(form, `${n}:src`, 1_500_000)) });
            nuevas.set(n, { type: 'image', src: url, mp4: '', poster: '', alt });
        }
    }

    for (let intento = 0; intento < 3; intento++) {
        const padre = prueba ? null : await cabeza(env);
        const actual = prueba ? await leerPublicada(prueba, s) : await leerSeccion(env, s, padre!.commit);
        if (actual.sha !== base) throw new ErrorUsuario('Alguien cambió estas fotos hace un ratito. Recarga la página y vuelve a intentarlo.', 409);

        const porSrc = new Map(actual.items.map(it => [it.src, it]));
        const usadas = new Set<string>();
        const lista: Item[] = pedido.map(p => {
            if (p?.nuevo !== undefined) return nuevas.get(String(p.nuevo))!;
            const src = String(p?.src ?? '');
            const it = porSrc.get(src);
            if (!it || usadas.has(src)) throw new ErrorUsuario('Las fotos cambiaron. Recarga la página y vuelve a intentarlo.');
            usadas.add(src);
            const alt = limpiarAlt(p.alt);
            return { ...it, alt: alt || it.alt || '' };
        });
        const quitadas = actual.items.length - usadas.size;
        const datos = s.tipo === 'galeria' ? { ...actual.datos, fotos: lista } : lista;
        const partes = [nuevas.size && `+${nuevas.size} foto${nuevas.size > 1 ? 's' : ''}`, quitadas && `-${quitadas} quitada${quitadas > 1 ? 's' : ''}`].filter(Boolean);
        const mensaje = `Admin: ${s.titulo}${partes.length ? ` (${partes.join(', ')})` : ' (orden y descripciones)'}\n\nGuardado desde petsalcielo.cl/admin.`;

        if (prueba) return { commit: 'prueba', nuevas: nuevas.size, quitadas, prueba: true };
        const hecho = await commit(env, padre!, [...archivos, { path: s.ruta, content: JSON.stringify(datos, null, 2) + '\n' }], mensaje);
        if (hecho) return { commit: hecho, nuevas: nuevas.size, quitadas };
    }
    throw new ErrorUsuario('Hay mucho movimiento ahora. Espera un momento y vuelve a guardar.', 503);
}
