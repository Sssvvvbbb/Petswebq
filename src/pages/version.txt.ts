// /version.txt: commit publicado. Lo consulta .github/workflows/deploy.yml para
// comprobar que Cloudflare terminó de publicar. CF_PAGES_COMMIT_SHA lo define
// Cloudflare Pages al compilar; en local queda "local".
export const GET = () => new Response(process.env.CF_PAGES_COMMIT_SHA ?? 'local');
