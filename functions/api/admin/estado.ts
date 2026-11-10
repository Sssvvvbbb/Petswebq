// GET /api/admin/estado: secciones administrables con sus fotos actuales en main
// (no lo publicado: así se ven también los cambios que aún se están publicando).
import { rama } from '../../../servidor/admin/github';
import { leerSeccion, secciones } from '../../../servidor/admin/secciones';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

export async function onRequestGet({ env, data }: Contexto): Promise<Response> {
    const ref = rama(env);
    const lista = await secciones(env, ref);
    const datos = await Promise.all(lista.map(async s => {
        const { sha, items } = await leerSeccion(env, s, ref);
        return { id: s.id, tipo: s.tipo, titulo: s.titulo, sha, items };
    }));
    return respuesta({ correo: data.correo, secciones: datos });
}
