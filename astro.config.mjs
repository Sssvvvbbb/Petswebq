// @ts-check
import { defineConfig } from 'astro/config';

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
});
