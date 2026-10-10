// Comportamientos comunes de los enlaces, sin onclick en el HTML (la CSP no
// permite scripts en línea). Se escuchan en el documento, así que sirven para
// cualquier elemento de la página. Lo incluye el componente Menu (todas las páginas).
//
// - data-wa="<mensaje codificado>": abre WhatsApp con uno de los dos números al
//   azar en otra pestaña. El href del enlace apunta al número principal, por si
//   el JS no carga.
// - data-abre-galeria="<clave>": abre la galería de esa tarjeta del mosaico
//   (.mosaic-item[data-gallery=<clave>]). Con Enter o Espacio en elementos que no
//   son botones (las tarjetas de servicio con role="button").
import { WHATSAPP_PRINCIPAL, WHATSAPP_SECUNDARIO } from '../data/sitio';

function abrirGaleria(clave: string) {
  document.querySelector<HTMLElement>(`.mosaic-item[data-gallery="${clave}"]`)?.click();
}

document.addEventListener('click', e => {
  const el = (e.target as Element).closest<HTMLElement>('[data-wa], [data-abre-galeria]');
  if (!el) return;
  if (el.dataset.wa !== undefined) {
    e.preventDefault();
    const numero = Math.random() < 0.5 ? WHATSAPP_PRINCIPAL : WHATSAPP_SECUNDARIO;
    window.open(`https://wa.me/${numero}?text=${el.dataset.wa}`, '_blank', 'noopener');
  } else {
    abrirGaleria(el.dataset.abreGaleria!);
  }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = (e.target as Element).closest<HTMLElement>('[data-abre-galeria]');
  if (!el || el.tagName === 'BUTTON') return; // un <button> ya genera el click
  e.preventDefault();
  abrirGaleria(el.dataset.abreGaleria!);
});
