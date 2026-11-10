// POST /api/admin/guardar (multipart): guarda una sección en un commit en main.
// El push dispara .github/workflows/deploy.yml, que publica el sitio.
// Ver servidor/admin/secciones.ts (fotos) y encuadre.ts (seccion=encuadre: el encuadre
// de las fotos de las reseñas).
import { guardarEncuadre } from '../../../servidor/admin/encuadre';
import { ErrorUsuario, guardar } from '../../../servidor/admin/secciones';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

export async function onRequestPost({ request, env }: Contexto): Promise<Response> {
    try {
        const form = await request.formData();
        return respuesta(await (form.get('seccion') === 'encuadre' ? guardarEncuadre(env, form) : guardar(env, form)));
    } catch (e) {
        if (e instanceof ErrorUsuario) return respuesta({ error: e.message }, e.status);
        console.error(e);
        return respuesta({ error: 'No se pudo guardar: ' + (e instanceof Error ? e.message : String(e)) }, 502);
    }
}
