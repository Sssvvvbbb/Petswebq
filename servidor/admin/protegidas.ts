// Fotos de las carpetas que administra /admin (Assets/biblioteca/… y los testimonios)
// que el código del sitio usa directamente: no se borran aunque se quiten de su galería.
// npm run check (scripts/check-rutas.mjs) falla si el código usa otra que no está aquí.
export const PROTEGIDAS: readonly string[] = [
    '/Assets/biblioteca/anforas/anfora-arcoiris-1100.webp', // portada de Ánforas (Galeria.astro)
];
