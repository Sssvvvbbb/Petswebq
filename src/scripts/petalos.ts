// Pétalos que caen sobre la portada (#petalContainer, en HeroCarousel). No se
// crean con movimiento reducido.
// - 'home': 8 pétalos con los rosados y lilas de la paleta (más liviano).
// - 'clasica': 22 pétalos con la paleta completa (nosotros y regreso-a-casa).
export function crearPetalos(variante: 'home' | 'clasica') {
  const contenedor = document.getElementById('petalContainer');
  if (!contenedor || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const home = variante === 'home';
  const colores = home
    ? ['rgba(238,165,233,0.55)', 'rgba(203,174,242,0.55)', 'rgba(169,140,235,0.5)', 'rgba(217,158,201,0.55)', 'rgba(241,167,241,0.5)', 'rgba(211,135,171,0.5)', 'rgba(224,136,144,0.45)']
    : ['rgba(238,165,233,0.55)', 'rgba(168,230,214,0.5)', 'rgba(203,174,242,0.55)', 'rgba(183,240,245,0.5)', 'rgba(240,201,130,0.45)', 'rgba(244,145,143,0.45)'];
  for (let i = 0; i < (home ? 8 : 22); i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    const size = home ? (8 + Math.random() * 14) * 1.1 : 8 + Math.random() * 14;
    const duracion = home ? 8.4 + Math.random() * 1.6 : 6 + Math.random() * 10;
    const retraso = home ? -Math.random() * 8 : Math.random() * 12;
    p.style.cssText = `
      --ps: ${size}px;
      --pd: ${duracion}s;
      --delay: ${retraso}s;
      left: ${Math.random() * 100}%;
      background: ${colores[Math.floor(Math.random() * colores.length)]};
      border-radius: ${Math.random() > 0.5 ? '50% 50% 50% 0' : '50% 0 50% 50%'};
      transform: rotate(${Math.random() * 360}deg);
    `;
    contenedor.appendChild(p);
  }
}
