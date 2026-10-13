// Variables del proyecto en Cloudflare Pages (Settings > Variables and Secrets).
// En local van en .dev.vars (no se sube a Git). Ver CLAUDE.md, sección "/admin".
export interface Env {
    ACCESS_TEAM_DOMAIN?: string; // https://<equipo>.cloudflareaccess.com
    ACCESS_AUD?: string;         // "Application Audience (AUD) Tag" de la aplicación de Access
    ADMIN_EMAILS?: string;       // correos autorizados, separados por coma
    GITHUB_TOKEN?: string;       // token fine-grained: solo este repo, Contents: Read and write (secreto)
    GITHUB_REPO?: string;        // dueño/repo (por defecto Sssvvvbbb/Petswebq)
    GITHUB_BRANCH?: string;      // por defecto main
    ADMIN_LOCAL?: string;        // "1" solo en .dev.vars: salta Access en localhost
    GITHUB_API?: string;         // solo para pruebas locales (API simulada); por defecto https://api.github.com
}

export interface Contexto {
    request: Request;
    env: Env;
    data: { correo?: string };
    next: () => Promise<Response>;
}

export const respuesta = (datos: unknown, status = 200) =>
    new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
