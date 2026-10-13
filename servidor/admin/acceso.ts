// Verifica que quien llama a /api/admin/* entró por Cloudflare Access con un correo
// autorizado. Cloudflare Access (Zero Trust) protege /admin y /api/admin/* y agrega
// a cada petición el JWT firmado `Cf-Access-Jwt-Assertion`; aquí se comprueba su
// firma (RS256, claves públicas del equipo), la audiencia (AUD de la aplicación),
// el emisor, la expiración y que el correo esté en ADMIN_EMAILS. Si Access no está
// configurado o falta una variable, nada pasa (falla cerrado).
import type { Env } from './tipos';

export class NoAutorizado extends Error {}

const texto = new TextEncoder();

function b64url(s: string): Uint8Array {
    const b = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
    return Uint8Array.from(atob(b), c => c.charCodeAt(0));
}
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s)));

// https://<equipo>.cloudflareaccess.com, sin barra final.
export function dominioEquipo(env: Env): string {
    const d = (env.ACCESS_TEAM_DOMAIN || '').trim().replace(/\/+$/, '');
    return d.startsWith('https://') ? d : 'https://' + d;
}

// Claves públicas del equipo, guardadas 1 h en la memoria del worker. Si llega un
// `kid` desconocido (Cloudflare rota las claves), se vuelven a pedir.
let cache: { equipo: string; hasta: number; claves: Map<string, CryptoKey> } | null = null;

async function clave(equipo: string, kid: string): Promise<CryptoKey> {
    if (!cache || cache.equipo !== equipo || cache.hasta < Date.now() || !cache.claves.has(kid)) {
        const r = await fetch(`${equipo}/cdn-cgi/access/certs`);
        if (!r.ok) throw new Error('No se pudieron leer las claves de Cloudflare Access');
        const { keys } = await r.json() as { keys: (JsonWebKey & { kid: string })[] };
        const claves = new Map<string, CryptoKey>();
        for (const k of keys) {
            claves.set(k.kid, await crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
        }
        cache = { equipo, hasta: Date.now() + 3600_000, claves };
    }
    const k = cache.claves.get(kid);
    if (!k) throw new NoAutorizado('Clave de acceso desconocida');
    return k;
}

function tokenDe(req: Request): string | null {
    const h = req.headers.get('Cf-Access-Jwt-Assertion');
    if (h) return h;
    const m = (req.headers.get('Cookie') || '').match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    return m ? m[1] : null;
}

// Devuelve el correo de quien entró, o lanza NoAutorizado.
export async function verificarAcceso(req: Request, env: Env): Promise<string> {
    const token = tokenDe(req);
    if (!token) throw new NoAutorizado('Falta el inicio de sesión de Cloudflare Access');
    const partes = token.split('.');
    if (partes.length !== 3) throw new NoAutorizado('Token mal formado');
    const [h, p, firma] = partes;
    const cab = json(h), datos = json(p);
    if (cab.alg !== 'RS256' || typeof cab.kid !== 'string') throw new NoAutorizado('Token con algoritmo no admitido');

    const equipo = dominioEquipo(env);
    const valida = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', await clave(equipo, cab.kid), b64url(firma), texto.encode(`${h}.${p}`));
    if (!valida) throw new NoAutorizado('Firma inválida');

    const ahora = Date.now() / 1000;
    const aud: string[] = Array.isArray(datos.aud) ? datos.aud : [datos.aud];
    if (!aud.includes(env.ACCESS_AUD!.trim())) throw new NoAutorizado('Token de otra aplicación');
    if (datos.iss !== equipo) throw new NoAutorizado('Emisor desconocido');
    if (typeof datos.exp !== 'number' || datos.exp < ahora) throw new NoAutorizado('Sesión vencida: recarga la página');
    if (typeof datos.nbf === 'number' && datos.nbf > ahora + 60) throw new NoAutorizado('Token aún no válido');

    const correo = String(datos.email || '').toLowerCase();
    const permitidos = (env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
    if (!correo || !permitidos.includes(correo)) throw new NoAutorizado('Este correo no tiene acceso');
    return correo;
}
