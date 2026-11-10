// @ts-check
import { defineConfig } from 'astro/config';
import estilosEnLinea from './integraciones/estilos-en-linea.mjs';

// Configuración pensada para que las URLs y el HTML generado sean idénticos
// al sitio estático anterior. Ver CLAUDE.md antes de cambiar algo aquí.
export default defineConfig({
  site: 'https://petsalcielo.cl',
  output: 'static',
  // 'file' genera servicios.html (no servicios/index.html): Cloudflare Pages
  // sirve /servicios sin barra final, igual que antes.
  build: { format: 'file' },
  trailingSlash: 'never',
  // No reescribir espacios en blanco del HTML.
  compressHTML: false,
  // Sin barra de herramientas de desarrollo inyectada en el HTML de dev.
  devToolbar: { enabled: false },
  // Los <script> que empaqueta Astro van siempre en archivos /_astro/*.js, aunque
  // sean chicos: la CSP no permite scripts en línea (ver public/_headers).
  // CSS minificado con esbuild: lightningcss (el de Vite por defecto) borra
  // `backdrop-filter` cuando le sigue `-webkit-backdrop-filter`, y Chrome pierde
  // el desenfoque del menú y de las tarjetas.
  // assetFileNames repite la regla de Astro (vite-build-config.js: el nombre de página
  // llega como "<página>@_@astro" y se corta en "@_@") y solo cambia el CSS de /admin a
  // panel-fotos.<hash>.css: la regla de Cloudflare que protege /admin bloquea toda
  // dirección con "admin" salvo las exactas del panel (ver CLAUDE.md, "/admin").
  vite: {
    build: {
      assetsInlineLimit: 0,
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          assetFileNames(info) {
            const nombre = info.names?.[0] ?? '';
            const pagina = nombre.includes('@_@') ? nombre.split('@_@')[0] : null;
            if (pagina === 'admin') return '_astro/panel-fotos.[hash][extname]';
            return pagina ? `_astro/${pagina}.[hash][extname]` : '_astro/[name].[hash][extname]';
          },
        },
      },
    },
  },
  // Saca los atributos style del HTML a un CSS (la CSP no permite estilos en línea).
  integrations: [estilosEnLinea()],
});
