// Toda petición a /api/admin/* pasa por aquí: exige Cloudflare Access con un correo
// autorizado (servidor/admin/acceso.ts), y para escribir, que venga de la misma
// página (Origin propio y cabecera X-Admin, que un formulario ajeno no puede enviar).
// En las vistas previas (*.pages.dev) no hay Access. Por defecto la API funciona en
// modo de prueba: lee lo publicado en ese despliegue y nunca escribe. Excepción: el
// sitio de prueba (PRUEBA_HOST, p. ej. index.petswebq.pages.dev) escribe de verdad,
// pero solo en su rama (GITHUB_BRANCH, nunca main), hasta PRUEBA_HASTA, con un máximo
// de fotos por día y pidiendo la clave ADMIN_CLAVE_PRUEBA para guardar (cabecera X-Clave).
import { NoAutorizado, verificarAcceso } from '../../../servidor/admin/acceso';
import { respuesta, type Contexto } from '../../../servidor/admin/tipos';

export async function onRequest(ctx: Contexto): Promise<Response> {
    const { request, env } = ctx;
    const url = new URL(request.url);
    let res: Response;
    try {
        if (url.hostname.endsWith('.pages.dev')) {
            const rama = (env.GITHUB_BRANCH || '').trim();
            const hasta = Date.parse((env.PRUEBA_HASTA || '') + 'T23:59:59-03:00');
            if (env.PRUEBA_HOST && url.hostname === env.PRUEBA_HOST.trim() && env.ADMIN_CLAVE_PRUEBA && env.GITHUB_TOKEN && rama && rama !== 'main' && Date.now() < hasta) {
                ctx.data.pruebaReal = true;
                ctx.data.correo = 'sitio de prueba';
                if (request.method !== 'GET' && request.headers.get('X-Clave') !== env.ADMIN_CLAVE_PRUEBA) {
                    return respuesta({ error: 'La clave no es correcta. Escríbala de nuevo.', clave: true }, 401);
                }
            } else {
                ctx.data.prueba = true;
                ctx.data.correo = 'modo de prueba (no se guarda nada)';
            }
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
