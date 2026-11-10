// Encuadre de las fotos de las reseñas de Google (#adEncuadre en /admin): qué parte de
// cada foto se ve cuando no cabe entera en su recuadro, una posición para el celular y
// otra para el computador (servidor/admin/encuadre.ts lo guarda en
// src/data/resenas-encuadre.json; TarjetaResena lo pone en --pos-m y --pos-e).
// La vista previa es la propia página /testimonios en un marco (?encuadre: no avanza
// sola) de 390 o 1280 px de ancho, achicado si no cabe, así se ve igual que en el sitio,
// con el reparto de las fotos en filas de ResenasGoogle. Las fotos se arrastran dentro
// del marco (es del mismo sitio): solo hacia donde la foto no cabe entera (si llena el
// alto, solo a los lados, y al revés); una foto que se ve completa no se mueve.
type Vista = 'movil' | 'escritorio';
export type Encuadre = Record<string, Partial<Record<Vista, [number, number]>>>;
type Api = <T>(ruta: string, init?: RequestInit) => Promise<T>;

const ANCHO: Record<Vista, number> = { movil: 390, escritorio: 1280 };
const PROP: Record<Vista, string> = { movil: '--pos-m', escritorio: '--pos-e' };
const CURSOR = { x: 'ew-resize', y: 'ns-resize' } as const;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function crearEncuadre(api: Api) {
    const seccion = $('adEncuadre'), marco = $('adMarco'), vistaPrevia = $<HTMLIFrameElement>('adVista');
    const aviso = $('adEncAviso'), pista = $('adEncPista').querySelector('span')!;
    const guardarBtn = $<HTMLButtonElement>('adEncGuardar'), descartarBtn = $<HTMLButtonElement>('adEncDescartar');
    let datos: Encuadre = {}, sha = '', original = '{}';
    let vista: Vista = 'movil';
    let ocupado = false;
    let cargada = false;

    const cambiado = () => JSON.stringify(datos) !== original;
    const doc = () => (cargada ? vistaPrevia.contentDocument : null);
    const fotos = () => Array.from(doc()?.querySelectorAll<HTMLImageElement>('#gMain .g-photos img') ?? []);
    const posicion = (src: string, v: Vista): [number, number] => datos[src]?.[v] ?? [50, 50];

    function avisar(texto: string, tipo: 'ok' | 'error' | 'info' = 'info') {
        aviso.textContent = texto;
        aviso.className = 'ad-aviso ad-' + tipo;
        aviso.hidden = !texto;
    }
    function botones() {
        guardarBtn.disabled = ocupado || !cambiado();
        descartarBtn.disabled = ocupado || !cambiado();
        const n = Object.keys(datos).length;
        $('adEncResumen').textContent = cambiado() ? 'Cambios sin guardar' : n ? `${n} ${n === 1 ? 'foto ajustada' : 'fotos ajustadas'}` : '';
    }

    // Hacia dónde se puede mover una foto: 'y' si llena el ancho y le sobra alto, 'x' al revés.
    function eje(img: HTMLImageElement): { eje: 'x' | 'y'; sobra: number } | null {
        const r = img.getBoundingClientRect();
        const p = img.naturalWidth / img.naturalHeight || +img.getAttribute('width')! / +img.getAttribute('height')!;
        if (!r.width || !r.height || !p) return null;
        const caja = r.width / r.height;
        if (caja > p * 1.01) return { eje: 'y', sobra: r.width / p - r.height };
        if (caja < p / 1.01) return { eje: 'x', sobra: r.height * p - r.width };
        return null;
    }

    // Lo guardado (y lo cambiado sin guardar) manda sobre lo publicado, que puede ir atrasado.
    function aplicar() {
        for (const img of fotos()) {
            const src = img.getAttribute('src')!;
            for (const v of ['movil', 'escritorio'] as Vista[]) {
                const [x, y] = posicion(src, v);
                img.style.setProperty(PROP[v], `${x}% ${y}%`);
            }
        }
        marcar();
    }
    // Borde punteado y cursor en las fotos que se pueden mover.
    function marcar() {
        for (const img of fotos()) {
            const e = eje(img);
            img.style.cursor = e ? CURSOR[e.eje] : 'not-allowed';
            img.style.outline = e ? '3px dashed rgba(143,111,224,.95)' : '';
            img.style.outlineOffset = '-3px';
            img.style.touchAction = e ? 'none' : '';
        }
    }
    function explicar(img: HTMLImageElement | null) {
        if (!img) { pista.textContent = 'Pon el cursor o el dedo sobre una foto.'; return; }
        const e = eje(img);
        pista.textContent = !e ? 'Esta foto se ve completa: no hay nada que mover.'
            : e.eje === 'x' ? 'Esta foto se mueve hacia los lados ↔' : 'Esta foto se mueve hacia arriba y hacia abajo ↕';
    }

    // Muestra en el marco solo las reseñas (de la grilla a las flechas), sin la barra del
    // menú ni los botones fijos de la página, y lo achica si no cabe.
    function encuadrar() {
        const d = doc();
        if (!d || seccion.hidden) return;
        const ancho = ANCHO[vista];
        const escala = Math.min(1, marco.clientWidth / ancho);
        vistaPrevia.style.width = ancho + 'px';
        vistaPrevia.style.transform = `scale(${escala})`;
        for (let paso = 0; paso < 2; paso++) {
            d.querySelectorAll<HTMLElement>('body *').forEach(el => {
                const pos = getComputedStyle(el).position;
                if (pos === 'fixed' || pos === 'sticky') el.style.display = 'none';
            });
            const grilla = d.getElementById('gGrid'), control = d.querySelector('#resenas-google .g-ctrl');
            if (!grilla || !control) return;
            const sy = vistaPrevia.contentWindow!.scrollY;
            const arriba = grilla.getBoundingClientRect().top + sy - 16;
            const abajo = control.getBoundingClientRect().bottom + sy + 16;
            vistaPrevia.style.height = Math.ceil(abajo - arriba) + 'px';
            marco.style.height = Math.ceil((abajo - arriba) * escala) + 'px';
            vistaPrevia.contentWindow!.scrollTo(0, arriba);
        }
        marcar();
    }
    const reencuadrar = () => requestAnimationFrame(() => requestAnimationFrame(() => { encuadrar(); setTimeout(encuadrar, 300); }));

    function preparar() {
        const d = vistaPrevia.contentDocument;
        if (!d?.getElementById('gGrid')) { avisar('No se pudo mostrar la página de testimonios. Recarga la página.', 'error'); return; }
        cargada = true;
        d.documentElement.style.overflow = 'hidden';
        d.querySelectorAll<HTMLElement>('.reveal, .reveal-fog').forEach(el => el.classList.add('visible'));
        d.addEventListener('contextmenu', e => e.preventDefault());
        d.addEventListener('dragstart', e => e.preventDefault());
        // Al cambiar de reseña con las flechas o los puntos.
        d.addEventListener('click', () => setTimeout(marcar, 60));
        vistaPrevia.contentWindow!.addEventListener('resize', reencuadrar);
        let arrastre: { img: HTMLImageElement; id: number; eje: 'x' | 'y'; sobra: number; desde: number; inicio: [number, number] } | null = null;
        d.addEventListener('pointerover', e => { if (!arrastre) explicar((e.target as Element).closest?.('#gMain .g-photos img') as HTMLImageElement | null); });
        d.addEventListener('pointerdown', e => {
            const img = (e.target as Element).closest?.('#gMain .g-photos img') as HTMLImageElement | null;
            if (!img || ocupado) return;
            explicar(img);
            const m = eje(img);
            if (!m) return;
            e.preventDefault();
            img.setPointerCapture(e.pointerId);
            arrastre = { img, id: e.pointerId, ...m, desde: m.eje === 'x' ? e.clientX : e.clientY, inicio: posicion(img.getAttribute('src')!, vista) };
        });
        d.addEventListener('pointermove', e => {
            if (!arrastre || e.pointerId !== arrastre.id) return;
            const { img, eje: ej, sobra, desde, inicio } = arrastre;
            // Arrastrar hacia la derecha muestra lo que estaba a la izquierda: baja el %.
            const delta = ((ej === 'x' ? e.clientX : e.clientY) - desde) / sobra * 100;
            const nuevo: [number, number] = [...inicio];
            nuevo[ej === 'x' ? 0 : 1] = Math.round(Math.min(100, Math.max(0, inicio[ej === 'x' ? 0 : 1] - delta)));
            const src = img.getAttribute('src')!;
            datos[src] = { ...datos[src], [vista]: nuevo };
            img.style.setProperty(PROP[vista], `${nuevo[0]}% ${nuevo[1]}%`);
            botones();
        });
        const soltar = (e: PointerEvent) => { if (arrastre?.id === e.pointerId) arrastre = null; };
        d.addEventListener('pointerup', soltar);
        d.addEventListener('pointercancel', soltar);
        aplicar();
        reencuadrar();
    }
    vistaPrevia.addEventListener('load', preparar);

    function elegirVista(v: Vista) {
        vista = v;
        seccion.querySelectorAll<HTMLButtonElement>('.ad-vista').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vista === v)));
        explicar(null);
        reencuadrar();
    }
    seccion.querySelectorAll<HTMLButtonElement>('.ad-vista').forEach(b => b.addEventListener('click', () => elegirVista(b.dataset.vista as Vista)));
    addEventListener('resize', () => { if (!seccion.hidden) encuadrar(); });

    descartarBtn.addEventListener('click', () => {
        if (!confirm('¿Deshacer todos los cambios que no guardaste?')) return;
        datos = JSON.parse(original);
        aplicar();
        botones();
    });
    guardarBtn.addEventListener('click', async () => {
        if (ocupado || !cambiado()) return;
        const fd = new FormData();
        fd.set('seccion', 'encuadre');
        fd.set('sha', sha);
        fd.set('encuadre', JSON.stringify(datos));
        ocupado = true;
        botones();
        $('adEncGuardarTxt').textContent = 'Guardando…';
        avisar('Guardando… espera un poquito y no cierres la página.');
        try {
            await api('guardar', { method: 'POST', body: fd });
            const d = await api<{ encuadre: { sha: string; datos: Encuadre } }>('estado');
            cargar(d.encuadre);
            avisar('¡Listo! 🎉 El cambio aparecerá en la página en unos minutos.', 'ok');
        } catch (e) {
            avisar(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo otra vez.', 'error');
        } finally {
            ocupado = false;
            $('adEncGuardarTxt').textContent = 'Guardar';
            botones();
        }
    });

    function cargar(e: { sha: string; datos: Encuadre }) {
        sha = e.sha;
        datos = e.datos;
        original = JSON.stringify(datos);
        aplicar();
        botones();
    }

    return {
        cargar,
        cambiado: () => cambiado() || ocupado,
        abrir() {
            seccion.hidden = false;
            avisar('');
            if (!vistaPrevia.getAttribute('src')) vistaPrevia.src = '/testimonios?encuadre=1';
            else reencuadrar();
            requestAnimationFrame(() => seccion.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
        },
        cerrar() { seccion.hidden = true; },
    };
}
