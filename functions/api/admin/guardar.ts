// POST /api/admin/guardar (multipart): guarda una sección en un commit en main.
// Ver servidor/admin/secciones.ts.
import { ErrorUsuario, guardar } from '../../../servidor/admin/secciones';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

export async function onRequestPost({ request, env }: Contexto): Promise<Response> {
    try {
        return respuesta(await guardar(env, await request.formData()));
    } catch (e) {
        if (e instanceof ErrorUsuario) return respuesta({ error: e.message }, e.status);
        console.error(e);
        return respuesta({ error: 'No se pudo guardar: ' + (e instanceof Error ? e.message : String(e)) }, 502);
    }
}
