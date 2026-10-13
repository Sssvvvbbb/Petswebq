// Convierte en el navegador cada foto que se sube desde /admin a WebP, en los
// tamaños que usa el sitio (así llega liviana y el servidor no procesa imágenes):
// - galerías: src (hasta 1600 px), grande (hasta 1100 px de ancho) y mini (140×140,
//   recortada al centro), como las fotos de las galerías del rediseño;
// - testimonios: recortada al centro a 9:16 (el carrusel es vertical), hasta 720×1280.
// Chrome, Edge y Firefox codifican WebP con <canvas>. Safari (también Chrome en
// iPhone) no: ahí se usa el codificador WebAssembly de @jsquash/webp, que se
// descarga solo en ese caso (la CSP de /admin permite 'wasm-unsafe-eval').
import wasmSimd from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';
import wasmBase from '@jsquash/webp/codec/enc/webp_enc.wasm?url';

export interface Convertida {
    src: Blob;
    grande?: Blob;
    mini?: Blob;
    ancho: number;
    alto: number;
    aviso?: string;
}

const CALIDAD = 0.82;

async function decodificar(archivo: File): Promise<{ img: CanvasImageSource; ancho: number; alto: number; fin: () => void }> {
    try {
        const b = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
        return { img: b, ancho: b.width, alto: b.height, fin: () => b.close() };
    } catch { /* algunos navegadores no aceptan la opción o el formato: se prueba con <img> */ }
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.src = url;
    try {
        await img.decode();
    } catch {
        URL.revokeObjectURL(url);
        throw new Error(/\.hei[cf]$/i.test(archivo.name)
            ? 'Esta foto no se puede abrir aquí. Prueba subiéndola desde el celular.'
            : 'No se pudo abrir esta foto.');
    }
    return { img, ancho: img.naturalWidth, alto: img.naturalHeight, fin: () => URL.revokeObjectURL(url) };
}

// Dibuja el recorte (sx, sy, sw, sh) de la imagen en un lienzo de w×h. Reduce a la
// mitad por pasos para que las fotos muy grandes no queden granuladas.
function dibujar(img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, w: number, h: number): HTMLCanvasElement {
    let fuente = img;
    while (sw > w * 2 && sh > h * 2) {
        const t = document.createElement('canvas');
        t.width = Math.round(sw / 2); t.height = Math.round(sh / 2);
        const g = t.getContext('2d')!;
        g.imageSmoothingQuality = 'high';
        g.drawImage(fuente, sx, sy, sw, sh, 0, 0, t.width, t.height);
        fuente = t; sx = 0; sy = 0; sw = t.width; sh = t.height;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    g.imageSmoothingQuality = 'high';
    g.drawImage(fuente, sx, sy, sw, sh, 0, 0, w, h);
    return c;
}

let nativo: boolean | undefined;
let codificador: Promise<(d: ImageData, o: { quality: number }) => Promise<ArrayBuffer>> | undefined;

function cargarCodificador() {
    codificador ??= (async () => {
        const [{ default: encode, init }, { simd }] = await Promise.all([import('@jsquash/webp/encode'), import('wasm-feature-detect')]);
        const modulo = await WebAssembly.compileStreaming(fetch((await simd()) ? wasmSimd : wasmBase));
        await init(modulo);
        return encode;
    })();
    return codificador;
}

async function webp(c: HTMLCanvasElement, calidad = CALIDAD): Promise<Blob> {
    if (nativo !== false) {
        const b = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', calidad));
        if (b && b.type === 'image/webp') { nativo = true; return b; }
        nativo = false;
    }
    const encode = await cargarCodificador();
    const datos = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
    return new Blob([await encode(datos, { quality: Math.round(calidad * 100) })], { type: 'image/webp' });
}

const ajustar = (w: number, h: number, maxW: number, maxH: number) => {
    const k = Math.min(1, maxW / w, maxH / h);
    return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
};

export async function convertir(archivo: File, tipo: 'galeria' | 'testimonios'): Promise<Convertida> {
    const { img, ancho, alto, fin } = await decodificar(archivo);
    try {
        if (!ancho || !alto) throw new Error('No se pudo abrir esta foto.');
        if (tipo === 'testimonios') {
            // Recorte central a 9:16.
            let sw = ancho, sh = Math.round(ancho * 16 / 9);
            if (sh > alto) { sh = alto; sw = Math.round(alto * 9 / 16); }
            const [w, h] = ajustar(sw, sh, 720, 1280);
            const src = await webp(dibujar(img, (ancho - sw) / 2, (alto - sh) / 2, sw, sh, w, h));
            const aviso = ancho / alto > 9 / 16 * 1.25 ? 'Se recortó un poquito para que quede de pie, como en la página.' : undefined;
            return { src, ancho: w, alto: h, aviso: w < 400 ? 'Esta foto es chiquita: puede verse borrosa.' : aviso };
        }
        const [w, h] = ajustar(ancho, alto, 1600, 1600);
        const src = await webp(dibujar(img, 0, 0, ancho, alto, w, h));
        const [gw, gh] = ajustar(ancho, alto, 1100, Infinity);
        const grande = gw === w ? src : await webp(dibujar(img, 0, 0, ancho, alto, gw, gh));
        const lado = Math.min(ancho, alto);
        const mini = await webp(dibujar(img, (ancho - lado) / 2, (alto - lado) / 2, lado, lado, 140, 140), 0.8);
        return { src, grande, mini, ancho: w, alto: h, aviso: Math.max(w, h) < 800 ? 'Esta foto es chiquita: puede verse borrosa.' : undefined };
    } finally {
        fin();
    }
}
