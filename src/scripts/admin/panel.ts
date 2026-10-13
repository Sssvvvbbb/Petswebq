// Panel de /admin: elegir dónde van las fotos (galería de la Biblioteca o página de
// testimonios), agregarlas (se convierten a WebP en el navegador, ver webp.ts),
// ordenarlas arrastrándolas (con el mouse, o manteniendo el dedo encima en el
// celular), escribir qué se ve en cada una, quitarlas y guardar. Guardar manda la
// lista final a /api/admin/guardar, que hace un commit en main; el sitio se publica
// solo en unos minutos (.github/workflows/deploy.yml). En las vistas previas
// (*.pages.dev) la API está en modo de prueba: todo funciona igual, pero no se guarda.
// Textos sin palabras técnicas: lo usa la administradora del sitio.
import { convertir, type Convertida } from './webp';

interface ItemSrv { src: string; alt?: string; mini?: string; grande?: string; poster?: string; type?: string }
interface SeccionSrv { id: string; tipo: 'galeria' | 'testimonios'; titulo: string; sha: string; items: ItemSrv[] }
interface Fila {
    src?: string;
    item?: ItemSrv;
    nuevo?: string;
    archivo?: File;
    conv?: Convertida;
    vista?: string;
    error?: string;
    alt: string;
    quitada: boolean;
}

// Ícono y frase de cada sección (las secciones nuevas usan el ícono de foto).
const ICONOS: Record<string, string> = {
    'galeria:instalaciones': 'i-casa',
    'galeria:jardin': 'i-equipo',
    'galeria:urnas': 'i-anfora',
    'galeria:relicarios': 'i-relicario',
    'galeria:despedida': 'i-paloma',
    testimonios: 'i-burbuja',
};
const subtitulo = (s: SeccionSrv) => (s.id === 'galeria:relicarios' ? 'Pronto en la página' : s.tipo === 'testimonios' ? 'Fotos del carrusel' : 'Galería');

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const aviso = $('adAviso'), editor = $('adEditor'), lista = $('adLista') as HTMLOListElement;
const guardarBtn = $<HTMLButtonElement>('adGuardar'), descartarBtn = $<HTMLButtonElement>('adDescartar');
const entrada = $<HTMLInputElement>('adArchivos');

let secciones: SeccionSrv[] = [];
let actual: SeccionSrv | null = null;
let filas: Fila[] = [];
let original = '';
let contador = 0;
let ocupado = false;
let cola: Promise<void> = Promise.resolve();
const deFila = new WeakMap<HTMLElement, Fila>();

const suave = (): ScrollBehavior => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const plural = (n: number, una: string, varias: string) => `${n} ${n === 1 ? una : varias}`;

function avisar(texto: string, tipo: 'ok' | 'error' | 'info' = 'info') {
    aviso.textContent = texto;
    aviso.className = 'ad-aviso ad-' + tipo;
    aviso.hidden = !texto;
    if (texto && tipo !== 'info') aviso.scrollIntoView({ block: 'center', behavior: suave() });
}

async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
    let r: Response;
    try {
        r = await fetch('/api/admin/' + ruta, { ...init, credentials: 'same-origin', headers: { 'X-Admin': '1' } });
    } catch {
        // Con la sesión de Access vencida, la API redirige al inicio de sesión de otro dominio y fetch falla.
        throw new Error('Se cortó la conexión o hay que volver a entrar. Recarga la página.');
    }
    const d = await r.json().catch(() => null) as (T & { error?: string }) | null;
    if (!r.ok || !d) throw new Error(d?.error || 'Algo salió mal. Recarga la página.');
    return d;
}

// Lista final como la recibe el servidor: sirve también para saber si hay algo sin guardar.
const pedido = () => filas.filter(f => !f.quitada && !f.error).map(f => (f.nuevo ? { nuevo: f.nuevo, alt: f.alt.trim() } : { src: f.src!, alt: f.alt.trim() }));
const cambiado = () => !!actual && JSON.stringify(pedido()) !== original;

function svgUso(id: string, clase?: string) {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    if (clase) s.setAttribute('class', clase);
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS(ns, 'use');
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
}

function miniatura(f: Fila): HTMLElement {
    const marco = document.createElement('div');
    marco.className = 'ad-foto';
    const it = f.item;
    const url = f.vista || (it?.type === 'video' ? it.poster : it?.grande || it?.src);
    if (f.error) {
        marco.textContent = '😕';
    } else if (!url) {
        if (f.nuevo) { const g = document.createElement('span'); g.className = 'ad-giro'; marco.appendChild(g); } else marco.textContent = 'Video';
    } else {
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.decoding = 'async';
        img.loading = 'lazy';
        // Una foto recién guardada aún no está publicada: se pide al repositorio.
        img.addEventListener('error', () => {
            if (url.startsWith('/Assets/') && !img.dataset.repo) { img.dataset.repo = '1'; img.src = '/api/admin/archivo?ruta=' + encodeURIComponent(url); }
        });
        img.src = url;
        marco.appendChild(img);
    }
    return marco;
}

function tarjeta(f: Fila, i: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'ad-item' + (f.quitada ? ' ad-quitada' : '') + (f.nuevo ? ' ad-nueva' : '') + (f.error ? ' ad-falla' : '');
    deFila.set(li, f);
    if (!f.quitada && !f.error) {
        li.tabIndex = 0;
        li.setAttribute('aria-roledescription', 'foto que se puede mover');
    }

    const arriba = document.createElement('div');
    arriba.className = 'ad-pos';
    const num = document.createElement('b');
    arriba.appendChild(num);
    if (f.nuevo && !f.error) { const s = document.createElement('span'); s.className = 'ad-chip'; s.textContent = 'Nueva'; arriba.appendChild(s); }
    if (f.item?.type === 'video') { const s = document.createElement('span'); s.className = 'ad-chip ad-chip-video'; s.textContent = 'Video'; arriba.appendChild(s); }
    li.append(arriba, miniatura(f));

    if (f.error) {
        const p = document.createElement('p');
        p.className = 'ad-error';
        p.textContent = f.error;
        li.appendChild(p);
    } else {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.maxLength = 200;
        inp.value = f.alt;
        inp.disabled = f.quitada;
        inp.placeholder = '¿Qué se ve en la foto?';
        inp.setAttribute('aria-label', '¿Qué se ve en la foto?');
        inp.dataset.i = String(i);
        li.appendChild(inp);
        if (f.conv?.aviso) {
            const p = document.createElement('p');
            p.className = 'ad-nota';
            p.textContent = f.conv.aviso;
            li.appendChild(p);
        }
    }

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ad-quitar';
    b.dataset.acc = f.quitada ? 'volver' : 'quitar';
    b.dataset.i = String(i);
    b.append(svgUso(f.quitada ? 'i-volver' : 'i-basura'), document.createTextNode(f.quitada ? 'No quitar' : 'Quitar'));
    li.appendChild(b);
    return li;
}

// Números de posición (las fotos quitadas no cuentan) y textos para lectores de pantalla.
function numerar() {
    let n = 0;
    lista.querySelectorAll<HTMLLIElement>('.ad-item').forEach(li => {
        const f = deFila.get(li)!;
        const b = li.querySelector('.ad-pos b')!;
        if (f.quitada) { b.textContent = '✕'; li.setAttribute('aria-label', 'Foto que se va a quitar'); return; }
        if (f.error) { b.textContent = '!'; return; }
        b.textContent = String(++n);
        li.setAttribute('aria-label', `Foto ${n}. Para moverla, usa las flechas del teclado.`);
    });
}

function botones() {
    const hay = cambiado();
    guardarBtn.disabled = ocupado || !hay;
    descartarBtn.disabled = ocupado || !hay;
}

function dibujar() {
    lista.replaceChildren(...filas.map(tarjeta));
    numerar();
    const activas = filas.filter(f => !f.quitada && !f.error);
    const nuevas = activas.filter(f => f.nuevo).length;
    const quitadas = filas.filter(f => f.quitada && !f.nuevo).length;
    const partes = [plural(activas.length, 'foto', 'fotos')];
    if (nuevas) partes.push(plural(nuevas, 'nueva', 'nuevas'));
    if (quitadas) partes.push(`${quitadas} para quitar`);
    $('adResumen').textContent = partes.join(' · ');
    botones();
}

function abrir(id: string) {
    const s = secciones.find(x => x.id === id);
    if (!s) return;
    if (actual && actual.id !== id && cambiado() && !confirm('Hay cambios sin guardar aquí. ¿Salir sin guardarlos?')) return;
    actual = s;
    filas.forEach(f => f.vista && URL.revokeObjectURL(f.vista));
    filas = s.items.map(item => ({ src: item.src, item, alt: item.alt || '', quitada: false }));
    original = JSON.stringify(pedido());
    document.querySelectorAll<HTMLButtonElement>('.ad-op').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    $('adTitulo').textContent = s.titulo;
    $('adIcono').setAttribute('href', '#' + (ICONOS[s.id] || 'i-foto'));
    $('adAyuda').textContent = s.tipo === 'testimonios'
        ? 'Estas fotos salen en la página de testimonios.'
        : s.id === 'galeria:relicarios'
            ? 'Estas fotos saldrán en la galería de relicarios.'
            : `Estas fotos salen en la galería “${s.titulo}”.`;
    lista.classList.toggle('ad-vertical', s.tipo === 'testimonios');
    editor.hidden = false;
    avisar('');
    dibujar();
    // Al inicio del paso 2 (su título), no más abajo.
    requestAnimationFrame(() => editor.scrollIntoView({ block: 'start', behavior: suave() }));
}

function opciones() {
    const grupos = { galeria: $('adGalerias'), testimonios: $('adTestimonios') };
    Object.values(grupos).forEach(g => g.replaceChildren());
    for (const s of secciones) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ad-op';
        b.dataset.id = s.id;
        b.setAttribute('aria-pressed', String(actual?.id === s.id));
        const t = document.createElement('strong');
        t.textContent = s.titulo;
        const c = document.createElement('span');
        c.textContent = `${subtitulo(s)} · ${plural(s.items.length, 'foto', 'fotos')}`;
        b.append(svgUso(ICONOS[s.id] || 'i-foto'), t, c);
        grupos[s.tipo].appendChild(b);
    }
}

async function cargar(seguir?: string) {
    const d = await api<{ correo: string; prueba?: boolean; secciones: SeccionSrv[] }>('estado');
    $('adPrueba').hidden = !d.prueba;
    secciones = d.secciones;
    $('adCorreo').textContent = d.prueba ? '' : d.correo ? 'Hola, ' + d.correo : '';
    actual = null;
    opciones();
    $('adCargando').hidden = true;
    $('adPaso1').hidden = false;
    if (seguir) abrir(seguir);
}

function agregar(archivos: FileList | File[]) {
    if (!actual || ocupado) return;
    const imagenes = Array.from(archivos).filter(a => a.type.startsWith('image/') || /\.(hei[cf]|jpe?g|png|webp|gif|avif)$/i.test(a.name));
    if (!imagenes.length) { avisar('Eso no es una foto. Elige una foto, por favor.', 'error'); return; }
    // Las nuevas quedan primero, a la vista; después se pueden mover.
    const nuevas = imagenes.map(archivo => ({ nuevo: 'n' + contador++, archivo, alt: '', quitada: false }) as Fila);
    filas.unshift(...nuevas);
    avisar('');
    dibujar();
    const tipo = actual.tipo;
    for (const f of nuevas) {
        // Una por una: así no se agota la memoria del celular con varias fotos grandes.
        cola = cola.then(async () => {
            try {
                f.conv = await convertir(f.archivo!, tipo);
                f.vista = URL.createObjectURL(f.conv.grande || f.conv.src);
            } catch (e) {
                f.error = e instanceof Error ? e.message : 'No se pudo abrir esta foto.';
            }
            if (filas.includes(f) && !arrastre) dibujar();
        });
    }
}

async function guardar() {
    if (!actual || ocupado) return;
    const s = actual;
    if (filas.some(f => f.nuevo && !f.conv && !f.error)) {
        guardarBtn.disabled = true;
        $('adGuardarTxt').textContent = 'Preparando fotos…';
        await cola;
        $('adGuardarTxt').textContent = 'Guardar';
    }
    filas = filas.filter(f => !f.error);
    const activas = filas.filter(f => !f.quitada);
    const sinTexto = activas.filter(f => f.nuevo && !f.alt.trim());
    if (sinTexto.length) {
        dibujar();
        avisar(sinTexto.length === 1 ? 'Falta escribir qué se ve en la foto nueva.' : 'Falta escribir qué se ve en las fotos nuevas.', 'error');
        sinTexto.forEach(f => lista.querySelector<HTMLInputElement>(`input[data-i="${filas.indexOf(f)}"]`)?.classList.add('ad-falta'));
        lista.querySelector<HTMLInputElement>('input.ad-falta')?.focus();
        return;
    }
    if (!activas.length && !confirm('No quedará ninguna foto aquí. ¿Guardar igual?')) return;
    const quitadas = filas.filter(f => f.quitada && !f.nuevo).length;
    if (quitadas && !confirm(`Vas a quitar ${plural(quitadas, 'foto', 'fotos')} de la página. ¿Seguro?`)) return;

    const fd = new FormData();
    fd.set('seccion', s.id);
    fd.set('sha', s.sha);
    fd.set('lista', JSON.stringify(pedido()));
    for (const f of activas) {
        if (!f.nuevo || !f.conv) continue;
        fd.set(`${f.nuevo}:src`, f.conv.src, `${f.nuevo}.webp`);
        if (f.conv.grande) fd.set(`${f.nuevo}:grande`, f.conv.grande, `${f.nuevo}-1100.webp`);
        if (f.conv.mini) fd.set(`${f.nuevo}:mini`, f.conv.mini, `${f.nuevo}-140.webp`);
    }
    ocupado = true;
    dibujar();
    $('adGuardarTxt').textContent = 'Guardando…';
    avisar('Guardando… espera un poquito y no cierres la página.');
    try {
        const r = await api<{ nuevas: number; quitadas: number; prueba?: boolean }>('guardar', { method: 'POST', body: fd });
        original = JSON.stringify(pedido());
        if (r.prueba) {
            avisar('¡Muy bien! 🎉 Todo funcionó. Como esto es una prueba, la página de verdad no cambió.', 'ok');
            return;
        }
        ocupado = false;
        await cargar(s.id);
        avisar('¡Listo! 🎉 Las fotos aparecerán en la página en unos minutos.', 'ok');
    } catch (e) {
        avisar(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo otra vez.', 'error');
    } finally {
        ocupado = false;
        $('adGuardarTxt').textContent = 'Guardar';
        botones();
    }
}

// ── Mover fotos: con el mouse se arrastran; con el dedo, se mantienen presionadas
// un momento (así deslizar sigue haciendo scroll) y luego se arrastran. ──
interface Arrastre { li: HTMLLIElement; id: number; sx: number; sy: number; gx: number; gy: number; x: number; y: number; tactil: boolean; activo: boolean; timer?: number; raf?: number }
let arrastre: Arrastre | null = null;

function ubicar() {
    if (!arrastre) return;
    const { li, x, y, gx, gy } = arrastre;
    li.style.transform = '';
    const r = li.getBoundingClientRect();
    li.style.transform = `translate(${x - gx - r.left}px, ${y - gy - r.top}px) scale(1.04)`;
}

function reordenar() {
    if (!arrastre) return;
    const { li, x, y } = arrastre;
    const bajo = document.elementFromPoint(x, y)?.closest<HTMLLIElement>('.ad-item');
    if (!bajo || bajo === li || !lista.contains(bajo)) return;
    const hijos = Array.from(lista.children);
    const desde = hijos.indexOf(li), hasta = hijos.indexOf(bajo);
    lista.insertBefore(li, hasta > desde ? bajo.nextSibling : bajo);
    filas = Array.from(lista.children, el => deFila.get(el as HTMLElement)!);
    numerar();
    ubicar();
}

// Si el dedo o el mouse llega cerca del borde de la pantalla, la página se desplaza sola.
function desplazar() {
    if (!arrastre?.activo) return;
    const { y } = arrastre;
    const arriba = 110, abajo = innerHeight - 150;
    const v = y < arriba ? -(arriba - y) / 5 : y > abajo ? (y - abajo) / 5 : 0;
    if (v) { scrollBy(0, Math.max(-24, Math.min(24, v))); ubicar(); reordenar(); }
    arrastre.raf = requestAnimationFrame(desplazar);
}

function empezar() {
    if (!arrastre) return;
    arrastre.activo = true;
    arrastre.li.classList.add('ad-arrastrando');
    document.body.classList.add('ad-moviendo');
    if (arrastre.tactil) navigator.vibrate?.(15);
    ubicar();
    arrastre.raf = requestAnimationFrame(desplazar);
}

function soltar() {
    if (!arrastre) return;
    const a = arrastre;
    clearTimeout(a.timer);
    if (a.raf) cancelAnimationFrame(a.raf);
    arrastre = null;
    document.body.classList.remove('ad-moviendo');
    if (a.activo) {
        a.li.classList.remove('ad-arrastrando');
        a.li.style.transform = '';
        dibujar();
        lista.querySelectorAll<HTMLLIElement>('.ad-item')[filas.indexOf(deFila.get(a.li)!)]?.focus({ preventScroll: true });
    }
}

lista.addEventListener('pointerdown', e => {
    if (ocupado || arrastre || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const t = e.target as Element;
    const li = t.closest<HTMLLIElement>('.ad-item');
    if (!li || t.closest('input, button') || li.classList.contains('ad-quitada') || li.classList.contains('ad-falla')) return;
    const r = li.getBoundingClientRect();
    arrastre = { li, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, gx: e.clientX - r.left, gy: e.clientY - r.top, tactil: e.pointerType !== 'mouse', activo: false };
    if (arrastre.tactil) arrastre.timer = window.setTimeout(empezar, 320);
});
addEventListener('pointermove', e => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    arrastre.x = e.clientX; arrastre.y = e.clientY;
    if (!arrastre.activo) {
        const d = Math.hypot(e.clientX - arrastre.sx, e.clientY - arrastre.sy);
        if (arrastre.tactil) { if (d > 10) soltar(); return; } // movió el dedo antes: es scroll
        if (d < 6) return;
        empezar();
    }
    e.preventDefault();
    ubicar();
    reordenar();
});
addEventListener('pointerup', soltar);
addEventListener('pointercancel', soltar);
// Con el dedo, una vez que la foto "se levantó", la página no debe desplazarse.
addEventListener('touchmove', e => { if (arrastre?.activo) e.preventDefault(); }, { passive: false });
// Mantener el dedo encima no debe abrir el menú del navegador.
lista.addEventListener('contextmenu', e => { if ((e.target as Element).closest('.ad-item') && !(e.target as Element).closest('input')) e.preventDefault(); });

// Teclado: flechas para mover la foto enfocada.
lista.addEventListener('keydown', e => {
    const li = e.target as HTMLElement;
    if (!li.classList?.contains('ad-item') || ocupado) return;
    const paso = ({ ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 } as Record<string, number>)[e.key];
    if (!paso) return;
    e.preventDefault();
    const i = filas.indexOf(deFila.get(li)!), j = i + paso;
    if (j < 0 || j >= filas.length) return;
    [filas[i], filas[j]] = [filas[j], filas[i]];
    dibujar();
    lista.querySelectorAll<HTMLLIElement>('.ad-item')[j]?.focus();
});

document.addEventListener('click', e => {
    const op = (e.target as Element).closest<HTMLButtonElement>('.ad-op');
    if (op) { abrir(op.dataset.id!); return; }
    const b = (e.target as Element).closest<HTMLButtonElement>('.ad-quitar');
    if (!b || ocupado) return;
    const i = +b.dataset.i!;
    const f = filas[i];
    if (b.dataset.acc === 'quitar') {
        if (f.nuevo) { filas.splice(i, 1); if (f.vista) URL.revokeObjectURL(f.vista); } else f.quitada = true;
    } else f.quitada = false;
    dibujar();
});
lista.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.i === undefined) return;
    filas[+t.dataset.i].alt = t.value;
    t.classList.remove('ad-falta');
    botones();
});
entrada.addEventListener('change', () => { if (entrada.files) agregar(entrada.files); entrada.value = ''; });
const zona = $('adZona');
zona.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('ad-sobre'); });
zona.addEventListener('dragleave', () => zona.classList.remove('ad-sobre'));
zona.addEventListener('drop', e => {
    e.preventDefault();
    zona.classList.remove('ad-sobre');
    if (e.dataTransfer?.files) agregar(e.dataTransfer.files);
});
guardarBtn.addEventListener('click', guardar);
descartarBtn.addEventListener('click', () => { if (actual && confirm('¿Deshacer todos los cambios que no guardaste?')) { const id = actual.id; actual = null; abrir(id); } });
addEventListener('beforeunload', e => { if (cambiado() || ocupado) e.preventDefault(); });

cargar().catch(e => { $('adCargando').textContent = e instanceof Error ? e.message : 'No se pudo cargar. Recarga la página.'; });
