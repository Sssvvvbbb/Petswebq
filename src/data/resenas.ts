// Reseñas de Google de /testimonios (componente testimonios/ResenasGoogle).
// Son citas textuales de clientes: no corregirles la redacción. El texto es HTML
// (puede llevar <br>). fotos: 0 a 4; a la izquierda van las que tienen fotos (la primera de ellas, al cargar);
// al costado, de a tres, las sin fotos en este orden (alterna largas y cortas: ver ResenasGoogle).
// ancho y alto: los del archivo de src (dan la proporción de la caja de fotos y evitan saltos al cargar).
export interface FotoResena { src: string; ancho: number; alto: number; srcset?: string; sizes?: string; alt: string }
export interface Resena { nombre: string; texto: string; fotos: FotoResena[] }

export const RESENAS: Resena[] = [
  {
    "nombre": "Dafne Retamal",
    "texto": "Agradezco mucho la cercanía que han tenido, la empatía que tuvieron durante todo este proceso, las palabras y el consuelo. Llegar allá fue un respiro para mi corazón porque sabía que pronto tendría a mi Teo de vuelta. Lily además se acercó con todo el amor a acompañarme el primer día, agradecida de ella también.",
    "fotos": [
      {
        "src": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-1.webp",
        "ancho": 652,
        "alto": 542,
        "alt": "Ánfora y retrato de Teo, foto compartida por Dafne Retamal"
      },
      {
        "src": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-2.webp",
        "ancho": 652,
        "alto": 687,
        "srcset": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-2-440.webp 440w, /Assets/pagina-web-testimonios/reviews/dafne-retamal-2.webp 652w",
        "sizes": "(max-width: 768px) 35vw, 260px",
        "alt": "Teo, foto compartida por Dafne Retamal"
      },
      {
        "src": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-3.webp",
        "ancho": 647,
        "alto": 712,
        "srcset": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-3-440.webp 440w, /Assets/pagina-web-testimonios/reviews/dafne-retamal-3.webp 652w",
        "sizes": "(max-width: 768px) 35vw, 260px",
        "alt": "Teo, foto compartida por Dafne Retamal"
      }
    ]
  },
  {
    "nombre": "Rodrigo Latorre",
    "texto": "Es una atencion muy humana y te tranquilizan en un momento tan dificil, el trabajo fue muy profesional y es un gran alivio que sean ellos los que ayudaron en estos que era tan importante",
    "fotos": [
      {
        "src": "/Assets/pagina-web-testimonios/reviews/rodrigo-latorre-1.webp",
        "ancho": 1112,
        "alto": 525,
        "alt": "Ánfora, cuadros con la huella y el retrato de Tomás y certificado de eco-incineración, foto compartida por Rodrigo Latorre"
      }
    ]
  },
  {
    "nombre": "Carmen Gloria Diaz Bunster",
    "texto": "Somos una familia que amamos a nuestros perritos, por eso valoramos enormemente el profesionalismo, seriedad, respeto y empatía que han tenido con cada uno de nuestros perritos que han partido.",
    "fotos": [
      {
        "src": "/Assets/pagina-web-testimonios/reviews/carmen-gloria-diaz-1.webp",
        "ancho": 1342,
        "alto": 536,
        "srcset": "/Assets/pagina-web-testimonios/reviews/carmen-gloria-diaz-1-1000.webp 1000w, /Assets/pagina-web-testimonios/reviews/carmen-gloria-diaz-1.webp 1342w",
        "sizes": "(max-width: 768px) 90vw, 650px",
        "alt": "Ánforas y retratos de Zeus, Negrita y Aquiles, foto compartida por Carmen Gloria Diaz Bunster"
      }
    ]
  },
  {
    "nombre": "Arturo Rivero",
    "texto": "Excelente servicio y atención, personas que te acompañan en todo momento y saben lo significativo que es perder a un ser querido, con una atención personalizada excepcional. 100% recomendados, mis mascotas siempre con ellos.",
    "fotos": [
      {
        "src": "/Assets/pagina-web-testimonios/reviews/arturo-rivero-1.webp",
        "ancho": 950,
        "alto": 712,
        "alt": "Ánforas y recuerdos de sus mascotas en un estante, foto compartida por Arturo Rivero"
      }
    ]
  },
  {
    "nombre": "Gloria Coronado Ramirez",
    "texto": "Gracias de corazón por la delicadeza, el respeto y el amor con el que trataron a mi gatita Leonor.<br> Agradecer a Susana y Pedro por la la hermosa atención y cada detalle en la despedida de mi fiel compañera.<br> Su respeto por nuestro dolor demuestran que entienden el amor tan grande que se les tiene a una mascota.<br> Gracias por ayudarme a cerrar este ciclo con paz.<br> Trataron a mi gatita,como parte de su familia.<br> Excelente servicio en Puerto montt.",
    "fotos": [
      {
        "src": "/Assets/pagina-web-testimonios/reviews/gloria-coronado-1.webp",
        "ancho": 464,
        "alto": 682,
        "alt": "Retrato de Leonor con alas de ángel sobre las nubes, foto compartida por Gloria Coronado Ramirez"
      },
      {
        "src": "/Assets/pagina-web-testimonios/reviews/gloria-coronado-2.webp",
        "ancho": 438,
        "alto": 658,
        "alt": "Ánfora, cuadro con las huellas y certificado de eco-incineración de Leonor, foto compartida por Gloria Coronado Ramirez"
      },
      {
        "src": "/Assets/pagina-web-testimonios/reviews/gloria-coronado-3.webp",
        "ancho": 444,
        "alto": 673,
        "alt": "Leonor sentada sobre un escritorio, foto compartida por Gloria Coronado Ramirez"
      },
      {
        "src": "/Assets/pagina-web-testimonios/reviews/gloria-coronado-4.webp",
        "ancho": 1097,
        "alto": 642,
        "alt": "Leonor echada dentro de una caja, foto compartida por Gloria Coronado Ramirez"
      }
    ]
  },
  {
    "nombre": "Johana Herrera",
    "texto": "En los momentos mas difíciles ha sido súper importante el apoyo de Pets al cielo; una atención de primer nivel, donde nos recibieron con amor y mucho respeto; excelente servicio. Me siento muy agradecida 🤍",
    "fotos": []
  },
  {
    "nombre": "Antonia Angel",
    "texto": "mi experiencia muy bonita, porque siempre se preocuparon sobre cómo se sentía uno, y siempre hacían todo con cariño, me hacian sentir de una manera muy acogedora y sentía que me entendían perfecto por el dolor que estaba pasando, muchas gracias por todo 🩷",
    "fotos": []
  },
  {
    "nombre": "Constanza Villagran",
    "texto": "He tenido que acudir a Pets al Cielo en dos ocasiones por mi Fanny y Pequita y no tengo palabras suficientes para agradecer el servicio que brindan. En los momentos más dolorosos, han demostrado una empatía, respeto y calidad humana, te acompañan con un amor y una delicadeza. Los recomiendo a ojos cerrados, de verdad hacen honor a su nombre y tratan a nuestras mascotas con el mayor de los respetos 🌸",
    "fotos": []
  },
  {
    "nombre": "Mundo MasCotas PetShop",
    "texto": "Como siempre una excelente atención, gran acogida y contención en momentos difíciles al despedir a un integrante de nuestra familia y nuestra manada. Muchísimas gracias por todo. 🐶💖🌈",
    "fotos": []
  },
  {
    "nombre": "Ingrid Henriquez Cardenas",
    "texto": "Muy agradecida, de la compañía cariñosa y genuina que nos entregaron en ese momento de tanto dolor. Logramos despedir a nuestra querida Nala, de forma respetuosa, permitiéndonos realizar nuestro duelo, con un cierre hermoso para ella. Quedándose en nuestra casita, de una forma que nos permite seguir sintiéndola con nosotros. De corazón muchas gracias.",
    "fotos": []
  },
  {
    "nombre": "Daniela Risco",
    "texto": "Agradecida de la hermosa labor que realizan, lleve a mi perrita Emma que me acompañó durante 14 años, apenas ingrese sentí un ambiente cálido, de mucho amor y entendimiento hacia la pérdida que estaba cursando.<br> Felicidades por esta hermosa labor en la que nos ayudan a mantener a nuestros compañeros de vida, siempre junto a nosotros.",
    "fotos": []
  },
  {
    "nombre": "Sebastián S. López",
    "texto": "Un lugar muy acogedor para la situación por la que uno va con los pequeños. Super acorde a lo que uno espera de una despedida bonita. Atienden super bien y el proceso es super transparente y cuidadoso.",
    "fotos": []
  },
  {
    "nombre": "Omayra Asencio",
    "texto": "Llegamos al lugar indicado para poder despedir a una integrante de nuestra familia, a pesar de haber sido una situación traumática, en pets al cielo supieron darnos tranquilidad, comprensión y confianza. Estaremos siempre agradecidos con ustedes por ayudarnos a que nuestra querida moka pudiese descansar y volver a su hogar. Muchas gracias por tanto, en nombre de nuestra familia y nuestra pequeña Moka que en paz descansara y siempre será recordada en nuestros corazones ❤️",
    "fotos": []
  }
];
