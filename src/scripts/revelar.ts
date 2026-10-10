// Animaciones de entrada: .reveal (sube y aparece) y .reveal-fog (aparece
// desenfocado) se hacen visibles al entrar en pantalla. Lo incluye
// MejoraProgresiva en todas las páginas.
//
// Al terminar suma 1 a window.__listos: si este script falla (p. ej. sin
// IntersectionObserver), MejoraProgresiva quita la clase "js" a los 4 s y todo
// queda visible.
function revelarAlEntrar(selector: string, threshold: number) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold });
  document.querySelectorAll(selector).forEach(el => io.observe(el));
}
revelarAlEntrar('.reveal-fog', 0.15);
revelarAlEntrar('.reveal', 0.12);

const w = window as unknown as { __listos?: number };
w.__listos = (w.__listos || 0) + 1; // MejoraProgresiva: este script terminó de inicializar
