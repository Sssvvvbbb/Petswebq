// Toda petición a /api/admin/* pasa por aquí: exige Cloudflare Access con un correo
// autorizado (servidor/admin/acceso.ts), y para escribir, que venga de la misma
// página (Origin propio y cabecera X-Admin, que un formulario ajeno no puede enviar).
// En las vistas previas (*.pages.dev) no hay Access ni token: la API funciona en modo
// de prueba, que lee lo publicado en ese despliegue y nunca escribe en el repositorio.
import { NoAutorizado, verificarAcceso } from '../../../servidor/admin/acceso';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

export async function onRequest(ctx: Contexto): Promise<Response> {
    const { request, env } = ctx;
    const url = new URL(request.url);
    let res: Response;
    try {
        if (url.hostname.endsWith('.pages.dev')) {
            ctx.data.prueba = true;
            ctx.data.correo = 'modo de prueba (no se guarda nada)';
        } else if (env.ADMIN_LOCAL === '1' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
            ctx.data.correo = 'local@localhost';
        } else {
            if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ADMIN_EMAILS) return respuesta({ error: 'El acceso a /admin aún no está configurado en Cloudflare.' }, 503);
            ctx.data.correo = await verificarAcceso(request, env);
        }
        if (!ctx.data.prueba && !env.GITHUB_TOKEN) return respuesta({ error: 'Falta GITHUB_TOKEN en Cloudflare Pages.' }, 503);
        if (request.method !== 'GET' && (request.headers.get('Origin') !== url.origin || request.headers.get('X-Admin') !== '1')) {
            return respuesta({ error: 'Petición de otro origen' }, 403);
        }
        res = await ctx.next();
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
