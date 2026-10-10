// Preguntas frecuentes: ÚNICA fuente de /preguntas-frecuentes.
// Con estos datos se arman las preguntas visibles (componente faq/Grupo) y el
// JSON-LD FAQPage del <head>, así que siempre coinciden.
//
// - id: valor de data-group/data-cat (el filtro de categorías usa el mismo).
// - respuesta: HTML. Puede llevar <p>, <strong>, <ul>/<li> y la etiqueta de
//   color <span class="faq-tag">…</span>, que no se copia al JSON-LD.
export interface Pregunta { pregunta: string; respuesta: string }
export interface GrupoFaq { id: string; icono: string; titulo: string; estilo?: string; preguntas: Pregunta[] }

export const GRUPOS_FAQ: GrupoFaq[] = [
  {
    id: "proceso", icono: "🌊", titulo: "El Proceso de Cremación",
    preguntas: [
      {
        pregunta: "¿Qué es la cremación ecológica o con agua?",
        respuesta: `<span class="faq-tag">Hidrólisis Alcalina</span>
          <p>La cremación ecológica mediante agua, científicamente conocida como <strong>hidrólisis alcalina</strong>, es un procedimiento respetuoso que utiliza agua alcalina y temperatura para replicar los procesos que ocurren en la naturaleza al sepultar, pero en forma acelerada; dejando como resultado el 100% de la parte ósea de la mascotita que se entrega como Polvo de Calcio.</p>
          <p style="margin-top:0.8rem;"> En Chile este proceso está avalado por la <strong>Facultad de Medicina Veterinaria de la Universidad de Concepción</strong> desde el año 2014, mediante su proyecto denominado <strong>"Mínimo Impacto Ambiental"</strong></p>`,
      },
      {
        pregunta: "¿Cuál es la diferencia entre Cremación con Fuego y Cremación Ecológica (Hidrólisis Alcalina)?",
        respuesta: `<p>La Cremación con Fuego se efectúa Mediante Hornos Crematorios que utilizan combustibles fósiles como Gas y Petróleo, generando altos niveles de Energía para llegar a temperaturas superiores a los 1.000°C para quemar a la mascotita. Además, emiten gases a la atmósfera, a través de chimeneas por más filtros que tengan, que contribuyen al Efecto Invernadero.</p>
          <p style="margin-top:0.8rem;">La Cremación con Agua (Hidrólisis Alcalina) o Cremación Ecológica, se realiza en equipos que utilizan agua alcalina a temperaturas que oscilan entre los 90 a 100°C, con un uso de energía de apenas un 15 % de la que utiliza un Horno Crematorio y sin emitir gases a la atmósfera que contribuyan al efecto invernadero.</p>
          <p>Más aún, este proceso NO destruye prótesis e implantes metálicos, los que al ser recuperados y entregados contribuyen a dar mayor certeza a los dueños o tutores de la mascotita.</p>
          <p>Además, en un 95 % de los casos, al finalizar el procedimiento se recupera el chip de identificación de la mascota, que se puede entregar y escanear para obtener el número que está en su carnet y/o Registro de Mascotitas.</p>`,
      },
      {
        pregunta: "¿Cómo puedo estar seguro de que lo que me están entregando es de mi mascotita?",
        respuesta: `<p><strong>Primero:</strong> Porque en nuestro equipo el procedimiento es totalmente INDIVIDUAL.</p>
          <p style="margin-top:0.8rem;"><strong>Segundo:</strong> Al ser un procedimiento con agua NO destruye prótesis e implantes metálicos, los que al ser
          recuperados y entregados contribuyen a dar mayor certeza a los dueños o tutores de la mascotita.</p>`,
      },
      {
        pregunta: "¿Qué tipo de mascotitas se pueden cremar en sus instalaciones?",
        respuesta: `<p>Podemos recibir mascotitas de todo tipo y tamaño. Hemos recepcionado desde Erizos de Tierra, pasando por Cobayos, Hurones, Conejos hasta mascotitas Extra Grandes como Perritos San Bernardo, Gran Danés. Incluso animalitos de Granja como Chivos y Aves.</p>`,
      },
      {
        pregunta: "¿Puedo estar presente durante el Procedimiento de Cremación de mi Mascotita?",
        respuesta: `<p>El procedimiento consta de <strong>4 etapas</strong>, siendo la primera (<strong>Hidrólisis Alcalina</strong>) la más larga con una duración que depende del peso y tamaño de la mascotita (entre <strong>4 a 16 horas</strong>), por lo que <strong>no es viable estar presente</strong> durante este.</p>
          <p style="margin-top:0.8rem;">No obstante, de forma <strong>excepcional</strong> y previa coordinación y agendamiento, se puede estar presente al momento del <strong>Ingreso de la Mascotita al Equipo de Hidrólisis</strong>.</p>`,
      },
    ],
  },
  {
    id: "garantias", icono: "✅", titulo: "Garantías e Identidad",
    estilo: "padding-top:0",
    preguntas: [
      {
        pregunta: "¿La cremación es siempre individual?",
        respuesta: `<span class="faq-tag">Garantía total</span>
          <p><strong>Sí, absolutamente y sin excepción.</strong> En PetsAlCielo la cremación es SIEMPRE individual. Nunca cremamos más de una mascota a la vez. Esto garantiza que el polvito de calcio que recibe son exclusiva y únicamente las de su mascota.</p>
          <p style="margin-top:0.8rem;">No ofrecemos cremación colectiva bajo ninguna circunstancia.</p>`,
      },
      {
        pregunta: "¿Pueden recuperar el chip de identificación de mi mascota?",
        respuesta: `<span class="faq-tag">Exclusivo PetsAlCielo</span>
          <p><strong>Sí.</strong> En un 95 % de los casos recuperamos el chip de identificación de su mascota durante el proceso. Esto es posible gracias a la naturaleza de la hidrólisis alcalina, que no involucra fuego.</p>
          <p style="margin-top:0.8rem;"><strong>Registros y certificados:</strong> Documentamos el ingreso de cada mascotita y certificamos el proceso junto a su chip de identificación.</p>`,
      },
      {
        pregunta: "¿Practican Eutanasia?",
        respuesta: `<p>No efectuamos Eutanasia. Éticamente un Crematorio NO debería prestar este servicio ya que actuaría de Juez y Parte. Se puede prestar para inducir o efectuar Eutanasias a quien no lo necesita, simplemente para tener un servicio de cremación más.</p>`,
      },
    ],
  },
  {
    id: "servicio", icono: "🚐", titulo: "Servicio y Logística",
    preguntas: [
      {
        pregunta: "¿Hacen retiro de mascotitas desde Domicilio o Clínicas Veterinarias?",
        respuesta: `<p><strong>Sí.</strong> Si bien el 95 % de los tutores traen a sus mascotitas a nuestras instalaciones por un tema de seguridad y transparencia, también contamos con servicio de traslado o retiro desde domicilio o Clínicas Veterinarias previa coordinación y agendamiento, el que está sujeto a un costo asociado dependiendo de la distancia.</p>`,
      },
      {
        pregunta: "¿Qué hago si mi mascota fallece de noche?",
        respuesta: `<p>Para su tranquilidad, los procesos naturales que se inician cuando una mascotita fallece NO se hacen evidentes en forma inmediata, por lo que manteniéndola alejada de altas temperaturas en su mantita como bebé puede consultar y agendar su ingreso para el día siguiente sin inconveniente.</p>`,
      },
      {
        pregunta: "¿Cuánto demora la entrega?",
        respuesta: `<p><strong>La entrega de todo es máximo cinco (5) días hábiles desde la recepción o ingreso de la mascotita en nuestras instalaciones.</strong></p>`,
      },
      {
        pregunta: "¿Valores del Servicio y Formas de Pago?",
        respuesta: `<p>El valor del servicio depende del tipo de mascotita y si es perrito de su tamaño y peso, para lo cual pedimos que nos contacte vía WhatsApp y de esta forma entregamos una respuesta con toda transparencia.</p> <p>Como formas de pago se acepta Efectivo, Transferencia Bancaria y Tarjetas de Crédito.</p>`,
      },
    ],
  },
  {
    id: "Ánforas", icono: "🏺", titulo: "Ánforas y Relicarios",
    preguntas: [
      {
        pregunta: "¿Qué tipos de ánforas ofrecen?",
        respuesta: `<p>Ofrecemos una variedad de Ánforas conmemorativas para que elija la que mejor honre a su mascotita:</p>
          <ul style="margin-top:0.8rem;padding-left:1.2rem;display:flex;flex-direction:column;gap:0.5rem;">
          <li><strong>Ánforas de madera natural:</strong> elegantes y cálidas, con grabado personalizado.</li>
          <li><strong>Ánforas de bronce:</strong> duraderas y con acabado artesanal.</li>
          <li><strong>Ánforas de impresión 3D biodegradable:</strong> a base de maíz, con diseños únicos. Una opción ecológica y personalizable.</li>
          </ul>
          <p style="margin-top:0.8rem;">Todas pueden personalizarse con el nombre y foto de su mascota. Por favor, consulte opciones y precios por WhatsApp para una mejor y más cercana atención.</p>`,
      },
      {
        pregunta: "¿Puedo llevar mi propia Ánfora?",
        respuesta: `<p>Sí, puede traer su propia Ánfora si lo prefiere. Solo debe asegurarse de tener la capacidad adecuada para el tamaño de su mascota. Podemos asesorarle sobre las medidas necesarias.</p>`,
      },
    ],
  },
];

// Texto plano de una respuesta para el JSON-LD: sin la etiqueta de color ni HTML.
export function textoPlano(html: string): string {
  return html
    .replace(/<span class="faq-tag">[\s\S]*?<\/span>/g, '')
    .replace(/<\/(p|li|ul)>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// JSON-LD FAQPage con todas las preguntas, en el orden de la página.
export const faqJsonLd = () => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: GRUPOS_FAQ.flatMap(g => g.preguntas).map(p => ({
    '@type': 'Question',
    name: p.pregunta,
    acceptedAnswer: { '@type': 'Answer', text: textoPlano(p.respuesta) },
  })),
});
