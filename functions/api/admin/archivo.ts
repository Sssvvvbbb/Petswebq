// GET /api/admin/archivo?ruta=/Assets/...webp: una foto tal como está en main.
// /admin la usa solo si la foto aún no está publicada (recién subida).
import { leerCrudo } from '../../../servidor/admin/github';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

export async function onRequestGet({ request, env }: Contexto): Promise<Response> {
    const ruta = new URL(request.url).searchParams.get('ruta') || '';
    if (!/^\/Assets\/[\p{L}\p{N}_\-./]+\.webp$/u.test(ruta) || ruta.includes('..')) return respuesta({ error: 'Ruta inválida' }, 400);
    const r = await leerCrudo(env, 'public' + ruta);
    if (!r.ok) return respuesta({ error: 'No encontrada' }, 404);
    return new Response(r.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=600' } });
}
