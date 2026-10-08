// Datos compartidos del sitio. Cambiar aquí afecta a todas las páginas que
// usan los componentes (testimonios no los usa: su HTML está congelado).

export const WHATSAPP_PRINCIPAL = '56998461172';
export const WHATSAPP_SECUNDARIO = '56940082594';

export const INSTAGRAM_URL = 'https://www.instagram.com/_petsalcielo/';
export const FACEBOOK_URL = 'https://www.facebook.com/cremaciondemascotasenpuertomontt';

// Mensajes de WhatsApp ya codificados para URL.
export const MSG_SERVICIOS = 'Hola%2C%20necesito%20informaci%C3%B3n%20sobre%20sus%20servicios';
export const MSG_CREMACION = 'Hola%2C%20necesito%20informaci%C3%B3n%20sobre%20el%20servicio%20de%20cremaci%C3%B3n';

// onclick que abre WhatsApp con uno de los dos números al azar.
export const waAleatorio = (mensaje: string) =>
  `event.preventDefault();var n=Math.random()<0.5?'${WHATSAPP_PRINCIPAL}':'${WHATSAPP_SECUNDARIO}';window.open('https://wa.me/'+n+'?text=${mensaje}','_blank','noopener');`;

// Enlace directo de WhatsApp al número principal.
export const waFijo = (mensaje: string) => `https://wa.me/${WHATSAPP_PRINCIPAL}?text=${mensaje}`;
