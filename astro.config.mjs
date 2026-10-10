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
  vite: { build: { assetsInlineLimit: 0, cssMinify: 'esbuild' } },
  // Saca los atributos style del HTML a un CSS (la CSP no permite estilos en línea).
  integrations: [estilosEnLinea()],
});
