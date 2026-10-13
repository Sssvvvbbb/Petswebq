// POST /api/admin/guardar (multipart): guarda una sección en un commit en main.
// Ver servidor/admin/secciones.ts.
import { ErrorUsuario, guardar } from '../../../servidor/admin/secciones';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

export async function onRequestPost({ request, env, data }: Contexto): Promise<Response> {
    try {
        const prueba = data.prueba ? { activos: env.ASSETS!, origen: new URL(request.url).origin } : undefined;
        const r = await guardar(env, await request.formData(), prueba, data.pruebaReal ? Number(env.PRUEBA_MAX_DIA || 30) : undefined);
        // Cloudflare no publica solo los push de GitHub (ver CLAUDE.md, "Despliegue"):
        // si hay deploy hook, se avisa para que compile y publique la rama.
        if (!prueba && env.DEPLOY_HOOK) await fetch(env.DEPLOY_HOOK, { method: 'POST' }).catch(() => {});
        return respuesta({ ...r, pruebaReal: data.pruebaReal || undefined });
    } catch (e) {
        if (e instanceof ErrorUsuario) return respuesta({ error: e.message }, e.status);
        console.error(e);
        return respuesta({ error: 'No se pudo guardar: ' + (e instanceof Error ? e.message : String(e)) }, 502);
    }
}
