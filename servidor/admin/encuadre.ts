// Encuadre de las fotos de las reseñas de Google de /testimonios: qué parte de cada
// foto se ve cuando no cabe entera en su recuadro, una posición para el celular y otra
// para el computador. Se guarda en src/data/resenas-encuadre.json (lo lee
// TarjetaResena al compilar) como { "<src>": { "movil": [x, y], "escritorio": [x, y] } },
// en % (50 = centro). Cada guardado es un commit en main, como las fotos.
import type { Env } from './tipos';
import { cabeza, commit, leerTexto, rama } from './github';
import { ErrorUsuario } from './secciones';

export const RUTA_ENCUADRE = 'src/data/resenas-encuadre.json';
const FOTO = /^\/Assets\/pagina-web-testimonios\/reviews\/[a-z0-9-]{1,80}\.webp$/;
const VISTAS = ['movil', 'escritorio'] as const;

export type Encuadre = Record<string, Partial<Record<(typeof VISTAS)[number], [number, number]>>>;

export async function leerEncuadre(env: Env, ref: string): Promise<{ sha: string; datos: Encuadre }> {
    const { sha, texto } = await leerTexto(env, RUTA_ENCUADRE, ref);
    const datos = JSON.parse(texto);
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw new Error(`${RUTA_ENCUADRE} no tiene el formato esperado`);
    return { sha, datos };
}

// Solo fotos de reseñas, solo las dos vistas y solo números enteros de 0 a 100.
function validar(x: unknown): Encuadre {
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw new ErrorUsuario('Encuadre inválido');
    const entradas = Object.entries(x as Record<string, unknown>);
    if (entradas.length > 100) throw new ErrorUsuario('Encuadre inválido');
    const limpio: Encuadre = {};
    for (const [src, v] of entradas) {
        if (!FOTO.test(src) || !v || typeof v !== 'object' || Array.isArray(v)) throw new ErrorUsuario('Encuadre inválido');
        const fila: Encuadre[string] = {};
        for (const [vista, p] of Object.entries(v as Record<string, unknown>)) {
            if (!(VISTAS as readonly string[]).includes(vista) || !Array.isArray(p) || p.length !== 2 || !p.every(n => Number.isInteger(n) && n >= 0 && n <= 100)) throw new ErrorUsuario('Encuadre inválido');
            fila[vista as (typeof VISTAS)[number]] = [p[0], p[1]];
        }
        if (Object.keys(fila).length) limpio[src] = fila;
    }
    return limpio;
}

export async function guardarEncuadre(env: Env, form: FormData): Promise<{ commit: string }> {
    const base = String(form.get('sha') || '');
    let datos: Encuadre;
    try { datos = validar(JSON.parse(String(form.get('encuadre') || ''))); } catch (e) {
        if (e instanceof ErrorUsuario) throw e;
        throw new ErrorUsuario('Encuadre inválido');
    }
    for (let intento = 0; intento < 3; intento++) {
        const padre = await cabeza(env);
        const actual = await leerEncuadre(env, padre.commit);
        if (actual.sha !== base) throw new ErrorUsuario('Alguien cambió el encuadre hace un ratito. Recarga la página y vuelve a intentarlo.', 409);
        const mensaje = `Admin: encuadre de las fotos de las reseñas\n\nGuardado desde /admin (rama ${rama(env)}).`;
        const hecho = await commit(env, padre, [{ path: RUTA_ENCUADRE, content: JSON.stringify(datos, null, 2) + '\n' }], mensaje);
        if (hecho) return { commit: hecho };
    }
    throw new ErrorUsuario('Hay mucho movimiento ahora. Espera un momento y vuelve a guardar.', 503);
}
