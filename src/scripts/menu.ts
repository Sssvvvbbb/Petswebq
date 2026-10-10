// Comportamiento del menú del sitio (componente Menu), común a todas las páginas.
// Antes estaba copiado en el <script> de cada página.
//
// - Menú lateral (celular): el corazón lo abre; la ✕, el fondo oscuro, un enlace
//   o Escape lo cierran. Al abrir, el foco del teclado pasa al botón de cierre y
//   al cerrar vuelve al corazón. Cerrado queda oculto también para el teclado
//   (visibility en menu.css).
// - La barra de navegación se pega justo debajo de la barra superior (su alto
//   cambia con el ancho) y deja en --fixed-bars-h el alto de las dos barras
//   juntas, que usa el encabezado de /testimonios.
// - En celular, al bajar más de 10 px se desvanecen los ítems 2 a 5 de la barra
//   (quedan el corazón y Contactar).
const heartBtn = document.getElementById('heartBtn')!;
const drawer = document.getElementById('drawer')!;
const drawerOverlay = document.getElementById('drawerOverlay')!;
const drawerClose = document.getElementById('drawerClose')!;

function openDrawer() {
  drawer.classList.add('open');
  drawerOverlay.classList.add('open');
  heartBtn.setAttribute('aria-expanded', 'true');
  drawerClose.focus(); // el foco del teclado entra al menú
}
function closeDrawer() {
  drawer.classList.remove('open');
  if (drawer.contains(document.activeElement)) heartBtn.focus(); // y vuelve al botón corazón
  drawerOverlay.classList.remove('open');
  heartBtn.setAttribute('aria-expanded', 'false');
}
heartBtn.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);
document.querySelectorAll('.drawer-link').forEach(l => l.addEventListener('click', closeDrawer));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

// Barra de navegación pegada bajo la barra superior
const topBar = document.querySelector<HTMLElement>('.top-bar');
const navEl = document.querySelector<HTMLElement>('nav');
function snapNav() {
  if (!topBar || !navEl) return;
  const topBarH = topBar.getBoundingClientRect().height;
  navEl.style.top = topBarH + 'px';
  document.documentElement.style.setProperty('--fixed-bars-h', (topBarH + navEl.getBoundingClientRect().height) + 'px');
}
snapNav();
window.addEventListener('resize', snapNav);

// Ítems de la barra que se desvanecen al bajar (celular)
const mobileNavItems = document.querySelectorAll('.nav-menu li:nth-child(2), .nav-menu li:nth-child(3), .nav-menu li:nth-child(4), .nav-menu li:nth-child(5)');
let scrolled = false;
window.addEventListener('scroll', () => {
  if (window.innerWidth > 768) return;
  if (window.scrollY > 10 && !scrolled) {
    scrolled = true;
    mobileNavItems.forEach(li => li.classList.add('nav-hidden'));
  } else if (window.scrollY <= 10 && scrolled) {
    scrolled = false;
    mobileNavItems.forEach(li => li.classList.remove('nav-hidden'));
  }
}, { passive: true });
