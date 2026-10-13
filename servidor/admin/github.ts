// Lectura y escritura del repositorio con la API de GitHub. Cada guardado de /admin
// es UN commit en main (fotos + JSON juntos), igual que el bot de Instagram; el push
// dispara .github/workflows/deploy.yml, que publica el sitio.
import type { Env } from './tipos';

export class ErrorGitHub extends Error {
    constructor(public status: number, mensaje: string) { super(mensaje); }
}

const repo = (env: Env) => (env.GITHUB_REPO || 'Sssvvvbbb/Petswebq').trim();
export const rama = (env: Env) => (env.GITHUB_BRANCH || 'main').trim();

// Ruta de archivo para la URL de la API (cada segmento codificado, "/" se conserva).
const rutaApi = (ruta: string) => ruta.split('/').map(encodeURIComponent).join('/');

export async function gh(env: Env, ruta: string, init: RequestInit = {}, accept = 'application/vnd.github+json'): Promise<Response> {
    const r = await fetch(`${(env.GITHUB_API || 'https://api.github.com').replace(/\/+$/, '')}/repos/${repo(env)}${ruta}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: accept,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'petsalcielo-admin',
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
    });
    return r;
}

async function ghJson<T>(env: Env, ruta: string, init: RequestInit = {}): Promise<T> {
    const r = await gh(env, ruta, init);
    if (!r.ok) throw new ErrorGitHub(r.status, `GitHub ${r.status} en ${init.method || 'GET'} ${ruta.split('?')[0]}: ${(await r.text()).slice(0, 200)}`);
    return r.json() as Promise<T>;
}

const decodificar = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

export function base64(bytes: Uint8Array): string {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
}

// Último commit de la rama y su árbol.
export async function cabeza(env: Env): Promise<{ commit: string; arbol: string }> {
    const ref = await ghJson<{ object: { sha: string } }>(env, `/git/ref/heads/${rama(env)}`);
    const c = await ghJson<{ tree: { sha: string } }>(env, `/git/commits/${ref.object.sha}`);
    return { commit: ref.object.sha, arbol: c.tree.sha };
}

// Archivo de texto en un commit (o rama): contenido y sha del blob.
export async function leerTexto(env: Env, ruta: string, ref: string): Promise<{ sha: string; texto: string }> {
    const f = await ghJson<{ sha: string; content: string; encoding: string }>(env, `/contents/${rutaApi(ruta)}?ref=${encodeURIComponent(ref)}`);
    return { sha: f.sha, texto: decodificar(f.content) };
}

export async function listar(env: Env, carpeta: string, ref: string): Promise<{ name: string; type: string }[]> {
    return ghJson(env, `/contents/${rutaApi(carpeta)}?ref=${encodeURIComponent(ref)}`);
}

// Archivo binario tal cual (para ver fotos recién subidas que aún no se publican).
export function leerCrudo(env: Env, ruta: string): Promise<Response> {
    return gh(env, `/contents/${rutaApi(ruta)}?ref=${encodeURIComponent(rama(env))}`, {}, 'application/vnd.github.raw+json');
}

export async function crearBlob(env: Env, bytes: Uint8Array): Promise<string> {
    const b = await ghJson<{ sha: string }>(env, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: base64(bytes), encoding: 'base64' }) });
    return b.sha;
}

export interface Entrada { path: string; sha?: string; content?: string }

// Crea el commit sobre `padre` y mueve la rama (sin forzar). Devuelve null si la
// rama avanzó mientras tanto (otro commit, p. ej. el bot de Instagram): quien llama
// vuelve a leer y reintenta.
export async function commit(env: Env, padre: { commit: string; arbol: string }, entradas: Entrada[], mensaje: string): Promise<string | null> {
    const arbol = await ghJson<{ sha: string }>(env, '/git/trees', {
        method: 'POST',
        body: JSON.stringify({ base_tree: padre.arbol, tree: entradas.map(e => ({ path: e.path, mode: '100644', type: 'blob', ...(e.sha ? { sha: e.sha } : { content: e.content }) })) }),
    });
    const c = await ghJson<{ sha: string }>(env, '/git/commits', {
        method: 'POST',
        body: JSON.stringify({ message: mensaje, tree: arbol.sha, parents: [padre.commit] }),
    });
    const r = await gh(env, `/git/refs/heads/${rama(env)}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha, force: false }) });
    if (r.status === 422) return null;
    if (!r.ok) throw new ErrorGitHub(r.status, `GitHub ${r.status} al mover la rama: ${(await r.text()).slice(0, 200)}`);
    return c.sha;
}
