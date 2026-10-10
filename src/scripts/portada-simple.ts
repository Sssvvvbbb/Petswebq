// Carrusel de portada de nosotros y regreso-a-casa (HeroCarousel variantes
// "nosotros" y "regreso"): cambia de diapositiva cada 6,5 s (no con movimiento
// reducido) y con los puntos. Además crea los pétalos.
import { crearPetalos } from './petalos';

let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.carousel-dots .dot');

function showSlide(n: number) {
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide]?.classList.add('active');
}
const autoplay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : setInterval(() => showSlide(currentSlide + 1), 6500);
dots.forEach((dot, i) => dot.addEventListener('click', () => { clearInterval(autoplay); showSlide(i); }));

crearPetalos('clasica');
