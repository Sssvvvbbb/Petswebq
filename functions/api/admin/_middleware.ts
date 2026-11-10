// Toda petición a /api/admin/* pasa por aquí. Barreras (decisiones del dueño, ver
// CLAUDE.md "/admin"):
// - Dos reglas del panel de Cloudflare (WAF): el interruptor que enciende y apaga el
//   panel, y otra que bloquea siempre toda variante de la dirección. Solo cubren
//   petsalcielo.cl: en *.pages.dev (vistas previas y la dirección interna de
//   producción) la API no responde.
// - Cloudflare Access (código al correo) protege /admin y /api/admin/*; aquí se vuelve a
//   verificar su JWT y que el correo esté en ADMIN_EMAILS (servidor/admin/acceso.ts).
// - Solo responde en las direcciones exactas (RUTAS): el enrutador de Pages también
//   acepta variantes como /API/Admin/Estado o /api/admin/estado/.
// - Para escribir, la petición debe venir de la misma página (Origin propio y cabecera
//   X-Admin, que un formulario ajeno no puede enviar).
// Si falta alguna variable, todo queda cerrado (503).
import { NoAutorizado, verificarAcceso } from '../../../servidor/admin/acceso';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

const RUTAS = ['/api/admin/estado', '/api/admin/guardar', '/api/admin/archivo'];

export async function onRequest(ctx: Contexto): Promise<Response> {
    const { request, env } = ctx;
    const url = new URL(request.url);
    // Pruebas locales (.dev.vars): sin Access, solo en localhost.
    const local = env.ADMIN_LOCAL === '1' && ['localhost', '127.0.0.1'].includes(url.hostname);
    let res: Response;
    try {
        if (!RUTAS.includes(url.pathname)) {
            res = new Response('Not found', { status: 404 });
        } else if (url.hostname.endsWith('.pages.dev')) {
            res = respuesta({ error: 'El panel solo funciona en petsalcielo.cl/admin.' }, 403);
        } else if (!local && (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ADMIN_EMAILS)) {
            res = respuesta({ error: 'El acceso a /admin aún no está configurado en Cloudflare.' }, 503);
        } else if (!env.GITHUB_TOKEN) {
            res = respuesta({ error: 'Falta GITHUB_TOKEN en Cloudflare Pages.' }, 503);
        } else {
            ctx.data.correo = local ? 'local@localhost' : await verificarAcceso(request, env);
            if (request.method !== 'GET' && (request.headers.get('Origin') !== url.origin || request.headers.get('X-Admin') !== '1')) {
                res = respuesta({ error: 'Petición de otro origen' }, 403);
            } else {
                res = await ctx.next();
            }
        }
    } catch (e) {
        if (!(e instanceof NoAutorizado)) throw e;
        res = respuesta({ error: e.message }, 403);
    }
    res = new Response(res.body, res);
    if (!res.headers.has('Cache-Control')) res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
}
