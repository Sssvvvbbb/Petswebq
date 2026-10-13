// Carrusel de Instagram de la home (#homenajes): carga /instagram.json cuando la
// sección se acerca a la pantalla y muestra 2 publicaciones por vista (1 en el
// celular). No oculta contenido (no suma a __listos). Sin feed, deja un enlace al
// perfil. No avanza solo con movimiento reducido.
import { INSTAGRAM_URL } from '../data/sitio';

interface Publicacion { src: string; alt?: string; permalink?: string }

const seccion = document.getElementById('homenajes');
const pista = document.getElementById('igcTrack');
const puntos = document.getElementById('igcDots');
const carrusel = document.getElementById('igc');

if (seccion && pista && puntos && carrusel) {
    const ancho = matchMedia('(min-width:700px)');
    const quieto = matchMedia('(prefers-reduced-motion: reduce)');
    let pagina = 0;
    let temporizador: number | undefined;

    const porVista = () => (ancho.matches ? 2 : 1);
    const paginas = () => Math.ceil(pista.children.length / porVista());

    function ir(k: number) {
        pagina = (k + paginas()) % paginas();
        pista!.style.transform = `translateX(${-pagina * 100}%)`;
        Array.from(puntos!.children).forEach((p, j) => p.classList.toggle('on', j === pagina));
        // Solo se descargan las fotos de la vista actual y la siguiente.
        const n = porVista();
        pista!.querySelectorAll('img').forEach((img, j) => {
            if (img.dataset.src && j < (pagina + 2) * n) { img.src = img.dataset.src!; img.removeAttribute('data-src'); }
        });
    }
    function avanzar() {
        clearInterval(temporizador);
        if (quieto.matches || document.hidden) return;
        temporizador = window.setInterval(() => ir(pagina + 1), 6500);
    }
    function armarPuntos() {
        const n = porVista();
        const total = pista!.children.length;
        puntos!.replaceChildren(...Array.from({ length: paginas() }, (_, k) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', `Publicaciones ${k * n + 1}–${Math.min(total, (k + 1) * n)}`);
            b.addEventListener('click', () => { ir(k); avanzar(); });
            return b;
        }));
        ir(Math.min(pagina, paginas() - 1));
    }
    function sinFeed() {
        const a = document.createElement('a');
        a.href = INSTAGRAM_URL;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'btn btn-primary';
        a.textContent = 'Ver @_petsalcielo en Instagram ↗';
        carrusel!.replaceChildren(a);
        carrusel!.classList.add('igc-vacio');
    }
    function armar(publicaciones: Publicacion[]) {
        pista!.replaceChildren(...publicaciones.slice(0, 10).map(p => {
            const figura = document.createElement('figure');
            const img = document.createElement('img');
            img.dataset.src = p.src;
            img.alt = p.alt ? `Homenaje en Instagram: ${p.alt.slice(0, 120)}` : 'Homenaje publicado en Instagram';
            img.width = 640;
            img.height = 1138;
            img.decoding = 'async';
            // Marco blanco: tapa las líneas oscuras que traen los bordes de las imágenes.
            const marco = document.createElement(p.permalink ? 'a' : 'span');
            marco.className = 'igc-marco';
            if (marco instanceof HTMLAnchorElement) {
                marco.href = p.permalink!;
                marco.target = '_blank';
                marco.rel = 'noopener';
            }
            marco.appendChild(img);
            figura.appendChild(marco);
            return figura;
        }));
        carrusel!.querySelector('.igc-p')!.addEventListener('click', () => { ir(pagina - 1); avanzar(); });
        carrusel!.querySelector('.igc-n')!.addEventListener('click', () => { ir(pagina + 1); avanzar(); });
        ancho.addEventListener('change', armarPuntos);
        document.addEventListener('visibilitychange', avanzar);
        armarPuntos();
        avanzar();
    }

    const observador = new IntersectionObserver(entradas => {
        if (!entradas[0].isIntersecting) return;
        observador.disconnect();
        fetch('/instagram.json')
            .then(r => r.json())
            .then(datos => (datos.posts?.length ? armar(datos.posts) : sinFeed()))
            .catch(sinFeed);
    }, { rootMargin: '400px' });
    observador.observe(seccion);
}
