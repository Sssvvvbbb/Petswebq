// GET /api/admin/estado: secciones administrables con sus fotos actuales en main
// (no lo publicado: así se ven también los cambios que aún se están publicando).
import { rama } from '../../../servidor/admin/github';
import { leerPublicada, leerSeccion, secciones, seccionesPrueba } from '../../../servidor/admin/secciones';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

export async function onRequestGet({ request, env, data }: Contexto): Promise<Response> {
    if (data.prueba) {
        const prueba = { activos: env.ASSETS!, origen: new URL(request.url).origin };
        const datos = await Promise.all(seccionesPrueba().map(s => leerPublicada(prueba, s).then(({ sha, items }) => ({ id: s.id, tipo: s.tipo, titulo: s.titulo, sha, items })).catch(() => null)));
        return respuesta({ correo: data.correo, prueba: true, secciones: datos.filter(Boolean) });
    }
    const ref = rama(env);
    const lista = await secciones(env, ref);
    const datos = await Promise.all(lista.map(async s => {
        const { sha, items } = await leerSeccion(env, s, ref);
        return { id: s.id, tipo: s.tipo, titulo: s.titulo, sha, items };
    }));
    return respuesta({ correo: data.correo, pruebaReal: data.pruebaReal || undefined, secciones: datos });
}
