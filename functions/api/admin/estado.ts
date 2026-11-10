// GET /api/admin/estado: secciones administrables con sus fotos actuales en main
// (no lo publicado: así se ven también los cambios que aún se están publicando).
// Cada foto que todavía no está en el sitio publicado lleva `pendiente: true`: el panel
// la pide a /api/admin/archivo y nunca a su dirección pública. Pedirla antes de tiempo
// hace que Cloudflare guarde la página de inicio con el nombre de la foto por 30 días
// (sin 404.html, una ruta que no existe responde la home), y la foto queda rota.
// Además, el encuadre de las fotos de las reseñas (servidor/admin/encuadre.ts).
import { leerEncuadre } from '../../../servidor/admin/encuadre';
import { rama } from '../../../servidor/admin/github';
import { leerSeccion, secciones, type Seccion } from '../../../servidor/admin/secciones';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

// Fotos (src) del JSON de la sección en el despliegue que está sirviendo el sitio. Se
// lee por ASSETS (dentro de Pages, sin pasar por la caché de Cloudflare). null si no se
// pudo leer: entonces todas se tratan como pendientes.
async function publicadas(ctx: Contexto, s: Seccion): Promise<Set<string> | null> {
    try {
        const r = await ctx.env.ASSETS!.fetch(new Request(new URL(s.ruta.slice('public'.length), ctx.request.url)));
        if (!r.ok || !(r.headers.get('Content-Type') || '').includes('json')) return null;
        const datos = await r.json() as { fotos?: { src?: string }[] } | { src?: string }[];
        const items = Array.isArray(datos) ? datos : datos.fotos || [];
        return new Set(items.map(it => it?.src).filter((x): x is string => typeof x === 'string'));
    } catch {
        return null;
    }
}

export async function onRequestGet(ctx: Contexto): Promise<Response> {
    const { env, data } = ctx;
    const ref = rama(env);
    const lista = await secciones(env, ref);
    const [datos, encuadre] = await Promise.all([Promise.all(lista.map(async s => {
        const [{ sha, items }, enSitio] = await Promise.all([leerSeccion(env, s, ref), publicadas(ctx, s)]);
        return { id: s.id, tipo: s.tipo, titulo: s.titulo, sha, items: items.map(it => (enSitio?.has(it.src) ? it : { ...it, pendiente: true })) };
    })), leerEncuadre(env, ref)]);
    return respuesta({ correo: data.correo, secciones: datos, encuadre });
}
