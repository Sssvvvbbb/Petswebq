// Panel de /admin: elegir la sección (galería de la Biblioteca o testimonios), ver
// sus fotos, agregar fotos (se convierten a WebP en el navegador, ver webp.ts),
// ordenarlas, editar su descripción, quitarlas y guardar. Guardar manda la lista
// final a /api/admin/guardar, que hace un commit en main; el sitio se publica solo
// en unos minutos (.github/workflows/deploy.yml). En las vistas previas (*.pages.dev)
// la API está en modo de prueba: todo funciona igual, pero no se guarda nada.
import { convertir, type Convertida } from './webp';

interface ItemSrv { src: string; alt?: string; mini?: string; poster?: string; type?: string }
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

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const aviso = $('adAviso'), editor = $('adEditor'), lista = $('adLista') as HTMLOListElement;
const guardarBtn = $<HTMLButtonElement>('adGuardar'), descartarBtn = $<HTMLButtonElement>('adDescartar');
const entrada = $<HTMLInputElement>('adArchivos'), posicion = $<HTMLSelectElement>('adPosicion');

let secciones: SeccionSrv[] = [];
let actual: SeccionSrv | null = null;
let filas: Fila[] = [];
let original = '';
let contador = 0;
let ocupado = false;
let cola: Promise<void> = Promise.resolve();

const suave = (): ScrollBehavior => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const kb = (n: number) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

function avisar(texto: string, tipo: 'ok' | 'error' | 'info' = 'info') {
    aviso.textContent = texto;
    aviso.className = 'ad-aviso ad-' + tipo;
    aviso.hidden = !texto;
    if (texto && tipo !== 'info') aviso.scrollIntoView({ block: 'nearest', behavior: suave() });
}

async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
    let r: Response;
    try {
        r = await fetch('/api/admin/' + ruta, { ...init, credentials: 'same-origin', headers: { 'X-Admin': '1' } });
    } catch {
        // Con la sesión de Access vencida, la API redirige al inicio de sesión de otro dominio y fetch falla.
        throw new Error('Se perdió la conexión o venció tu sesión. Recarga la página para volver a entrar.');
    }
    const d = await r.json().catch(() => null) as (T & { error?: string }) | null;
    if (!r.ok || !d) throw new Error(d?.error || `Error ${r.status}. Recarga la página.`);
    return d;
}

// Lista final como la recibe el servidor: compara si hay algo sin guardar.
const pedido = () => filas.filter(f => !f.quitada).map(f => (f.nuevo ? { nuevo: f.nuevo, alt: f.alt.trim() } : { src: f.src!, alt: f.alt.trim() }));
const cambiado = () => !!actual && JSON.stringify(pedido()) !== original;

function miniatura(f: Fila): HTMLElement {
    const marco = document.createElement('div');
    marco.className = 'ad-foto';
    const url = f.vista || f.item?.mini || (f.item?.type === 'video' ? f.item.poster : f.item?.src);
    if (f.error) {
        marco.textContent = '⚠';
    } else if (!url) {
        marco.textContent = f.nuevo ? 'Convirtiendo…' : 'Video';
    } else {
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        // Una foto recién guardada aún no está publicada: se pide al repositorio.
        img.addEventListener('error', () => {
            if (url.startsWith('/Assets/') && !img.dataset.repo) { img.dataset.repo = '1'; img.src = '/api/admin/archivo?ruta=' + encodeURIComponent(url); }
        });
        img.src = url;
        marco.appendChild(img);
    }
    if (actual?.tipo === 'testimonios') marco.classList.add('ad-vertical');
    return marco;
}

function boton(texto: string, acc: string, i: number, etiqueta: string, desactivado = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ad-mini-btn';
    b.textContent = texto;
    b.dataset.acc = acc;
    b.dataset.i = String(i);
    b.setAttribute('aria-label', etiqueta);
    b.disabled = desactivado;
    return b;
}

function fila(f: Fila, i: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'ad-item' + (f.quitada ? ' ad-quitada' : '') + (f.nuevo ? ' ad-nueva' : '') + (f.error ? ' ad-falla' : '');
    li.appendChild(miniatura(f));

    const cuerpo = document.createElement('div');
    cuerpo.className = 'ad-cuerpo';
    const marcas = document.createElement('p');
    marcas.className = 'ad-marcas';
    const n = filas.slice(0, i + 1).filter(x => !x.quitada).length;
    marcas.textContent = f.quitada ? 'Se quitará al guardar' : `Posición ${n}`;
    if (f.nuevo) { const s = document.createElement('span'); s.className = 'ad-chip'; s.textContent = 'Nueva'; marcas.prepend(s); }
    if (f.item?.type === 'video') { const s = document.createElement('span'); s.className = 'ad-chip ad-chip-video'; s.textContent = 'Video'; marcas.prepend(s); }
    cuerpo.appendChild(marcas);

    if (f.error) {
        const p = document.createElement('p');
        p.className = 'ad-error';
        p.textContent = `${f.archivo?.name}: ${f.error}`;
        cuerpo.appendChild(p);
    } else {
        const id = 'adAlt' + i;
        const lab = document.createElement('label');
        lab.htmlFor = id;
        lab.textContent = 'Descripción de la foto';
        const inp = document.createElement('input');
        inp.id = id;
        inp.type = 'text';
        inp.maxLength = 200;
        inp.value = f.alt;
        inp.disabled = f.quitada;
        inp.placeholder = actual?.tipo === 'testimonios' ? 'Ej.: Testimonio de la familia de Luna' : 'Ej.: Ánfora de madera con huellitas';
        inp.dataset.i = String(i);
        cuerpo.append(lab, inp);
        if (f.nuevo && f.conv) {
            const p = document.createElement('p');
            p.className = 'ad-info';
            p.textContent = `${f.archivo!.name} · ${kb(f.archivo!.size)} → WebP ${f.conv.ancho}×${f.conv.alto}, ${kb(f.conv.src.size)}`;
            cuerpo.appendChild(p);
        }
        if (f.conv?.aviso) {
            const p = document.createElement('p');
            p.className = 'ad-nota';
            p.textContent = f.conv.aviso;
            cuerpo.appendChild(p);
        }
    }
    li.appendChild(cuerpo);

    const acc = document.createElement('div');
    acc.className = 'ad-acciones';
    if (!f.quitada && !f.error) {
        acc.append(boton('↑', 'subir', i, 'Mover antes', i === 0), boton('↓', 'bajar', i, 'Mover después', i === filas.length - 1));
    }
    acc.appendChild(f.quitada ? boton('Deshacer', 'volver', i, 'No quitar esta foto') : boton(f.nuevo ? 'Descartar' : 'Quitar', 'quitar', i, 'Quitar esta foto'));
    li.appendChild(acc);
    return li;
}

function dibujar() {
    lista.replaceChildren(...filas.map(fila));
    const activas = filas.filter(f => !f.quitada && !f.error);
    const nuevas = activas.filter(f => f.nuevo).length;
    const quitadas = filas.filter(f => f.quitada && !f.nuevo).length;
    const partes = [`${activas.length} foto${activas.length === 1 ? '' : 's'}`];
    if (nuevas) partes.push(`${nuevas} nueva${nuevas === 1 ? '' : 's'}`);
    if (quitadas) partes.push(`${quitadas} por quitar`);
    $('adResumen').textContent = partes.join(' · ');
    const hay = cambiado();
    guardarBtn.disabled = ocupado || !hay;
    descartarBtn.disabled = ocupado || !hay;
}

function abrir(id: string) {
    const s = secciones.find(x => x.id === id);
    if (!s) return;
    if (actual && actual.id !== id && cambiado() && !confirm('Tienes cambios sin guardar en esta sección. ¿Descartarlos?')) return;
    actual = s;
    filas.forEach(f => f.vista && f.nuevo && URL.revokeObjectURL(f.vista));
    filas = s.items.map(item => ({ src: item.src, item, alt: item.alt || '', quitada: false }));
    original = JSON.stringify(pedido());
    document.querySelectorAll<HTMLButtonElement>('.ad-op').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    $('adTitulo').textContent = s.titulo;
    $('adAyuda').textContent = s.tipo === 'testimonios'
        ? 'Fotos del carrusel de petsalcielo.cl/testimonios. Se recortan al centro en formato vertical (9:16). Los videos se pueden ordenar o quitar, pero no subir desde aquí.'
        : 'Fotos de esta galería de la Biblioteca. Cada foto se guarda en WebP en tres tamaños (galería, pantalla y miniatura).';
    posicion.value = s.tipo === 'testimonios' ? 'inicio' : 'final';
    editor.hidden = false;
    avisar('');
    dibujar();
    editor.scrollIntoView({ block: 'start', behavior: suave() });
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
        c.textContent = `${s.items.length} ${s.tipo === 'testimonios' ? 'testimonio' : 'foto'}${s.items.length === 1 ? '' : 's'}`;
        b.append(t, c);
        grupos[s.tipo].appendChild(b);
    }
}

async function cargar(seguir?: string) {
    const d = await api<{ correo: string; prueba?: boolean; secciones: SeccionSrv[] }>('estado');
    $('adPrueba').hidden = !d.prueba;
    secciones = d.secciones;
    $('adCorreo').textContent = d.correo ? 'Sesión: ' + d.correo : '';
    actual = null;
    opciones();
    $('adPaso1').hidden = false;
    if (seguir) abrir(seguir);
}

function agregar(archivos: FileList | File[]) {
    if (!actual || ocupado) return;
    const imagenes = Array.from(archivos).filter(a => a.type.startsWith('image/') || /\.(hei[cf]|jpe?g|png|webp|gif|avif)$/i.test(a.name));
    if (!imagenes.length) { avisar('Elige archivos de imagen (JPG, PNG, WebP o HEIC).', 'error'); return; }
    const nuevas = imagenes.map(archivo => ({ nuevo: 'n' + contador++, archivo, alt: '', quitada: false }) as Fila);
    if (posicion.value === 'inicio') filas.unshift(...nuevas); else filas.push(...nuevas);
    avisar('');
    dibujar();
    const tipo = actual.tipo;
    for (const f of nuevas) {
        // Una por una: así no se agota la memoria del celular con varias fotos grandes.
        cola = cola.then(async () => {
            try {
                f.conv = await convertir(f.archivo!, tipo);
                f.vista = URL.createObjectURL(f.conv.mini || f.conv.src);
            } catch (e) {
                f.error = e instanceof Error ? e.message : 'No se pudo convertir.';
            }
            if (filas.includes(f)) dibujar();
        });
    }
}

async function guardar() {
    if (!actual || ocupado) return;
    await cola;
    const s = actual;
    filas = filas.filter(f => !f.error || f.quitada);
    const activas = filas.filter(f => !f.quitada);
    const sinTexto = activas.filter(f => f.nuevo && !f.alt.trim());
    if (sinTexto.length) {
        dibujar();
        avisar('Escribe una descripción para cada foto nueva (ayuda a Google y a quienes usan lector de pantalla).', 'error');
        const i = filas.indexOf(sinTexto[0]);
        document.getElementById('adAlt' + i)?.focus();
        return;
    }
    if (!activas.length && !confirm('La sección quedará vacía. ¿Guardar igual?')) return;
    const quitadas = filas.filter(f => f.quitada && !f.nuevo).length;
    if (quitadas && !confirm(`Se quitará${quitadas > 1 ? 'n' : ''} ${quitadas} foto${quitadas > 1 ? 's' : ''} del sitio. ¿Continuar?`)) return;

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
    guardarBtn.textContent = 'Guardando…';
    avisar('Guardando… no cierres esta página.');
    try {
        const r = await api<{ nuevas: number; quitadas: number; prueba?: boolean }>('guardar', { method: 'POST', body: fd });
        original = JSON.stringify(pedido());
        if (r.prueba) {
            avisar(`✓ Prueba correcta: ${r.nuevas} foto${r.nuevas === 1 ? '' : 's'} nueva${r.nuevas === 1 ? '' : 's'} y ${r.quitadas} quitada${r.quitadas === 1 ? '' : 's'}. En modo de prueba no se guardó nada; en petsalcielo.cl/admin se habría publicado.`, 'ok');
            return;
        }
        const donde = s.tipo === 'testimonios' ? 'petsalcielo.cl/testimonios' : `la galería "${s.titulo}" de la Biblioteca`;
        avisar(`✓ Guardado${r.nuevas ? ` (${r.nuevas} foto${r.nuevas > 1 ? 's' : ''} nueva${r.nuevas > 1 ? 's' : ''})` : ''}. Se verá en ${donde} en 2 a 5 minutos, cuando termine de publicarse.`, 'ok');
        ocupado = false;
        const mensaje = aviso.textContent!;
        await cargar(s.id);
        avisar(mensaje, 'ok');
    } catch (e) {
        avisar(e instanceof Error ? e.message : 'No se pudo guardar.', 'error');
    } finally {
        ocupado = false;
        guardarBtn.textContent = 'Guardar y publicar';
        dibujar();
    }
}

document.addEventListener('click', e => {
    const op = (e.target as Element).closest<HTMLButtonElement>('.ad-op');
    if (op) { abrir(op.dataset.id!); return; }
    const b = (e.target as Element).closest<HTMLButtonElement>('.ad-mini-btn');
    if (!b || ocupado) return;
    const i = +b.dataset.i!;
    const f = filas[i];
    switch (b.dataset.acc) {
        case 'subir': if (i > 0) [filas[i - 1], filas[i]] = [filas[i], filas[i - 1]]; break;
        case 'bajar': if (i < filas.length - 1) [filas[i + 1], filas[i]] = [filas[i], filas[i + 1]]; break;
        case 'quitar':
            if (f.nuevo) { filas.splice(i, 1); if (f.vista) URL.revokeObjectURL(f.vista); } else f.quitada = true;
            break;
        case 'volver': f.quitada = false; break;
    }
    dibujar();
    // El foco vuelve al mismo botón en su nueva posición (para mover varias veces seguidas).
    const j = b.dataset.acc === 'subir' ? i - 1 : b.dataset.acc === 'bajar' ? i + 1 : i;
    lista.querySelector<HTMLButtonElement>(`[data-acc="${b.dataset.acc}"][data-i="${j}"]:not(:disabled)`)?.focus();
});
lista.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.i === undefined) return;
    filas[+t.dataset.i].alt = t.value;
    const hay = cambiado();
    guardarBtn.disabled = ocupado || !hay;
    descartarBtn.disabled = ocupado || !hay;
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
descartarBtn.addEventListener('click', () => { if (actual && confirm('¿Descartar los cambios sin guardar?')) { const id = actual.id; actual = null; abrir(id); } });
addEventListener('beforeunload', e => { if (cambiado() || ocupado) e.preventDefault(); });

cargar().catch(e => avisar(e instanceof Error ? e.message : 'No se pudo cargar.', 'error'));
