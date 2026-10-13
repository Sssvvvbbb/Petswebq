// Reseñas de Google de /testimonios (componente testimonios/ResenasGoogle).
// Son citas textuales de clientes: no corregirles la redacción. El texto es HTML
// (puede llevar <br>). fotos: 0 a 3; la primera reseña se muestra destacada al cargar.
export interface FotoResena { src: string; srcset?: string; sizes?: string; alt: string }
export interface Resena { nombre: string; texto: string; fotos: FotoResena[] }

export const RESENAS: Resena[] = [
  {
    "nombre": "Dafne Retamal",
    "texto": "Agradezco mucho la cercanía que han tenido, la empatía que tuvieron durante todo este proceso, las palabras y el consuelo. Llegar allá fue un respiro para mi corazón porque sabía que pronto tendría a mi Teo de vuelta. Lily además se acercó con todo el amor a acompañarme el primer día, agradecida de ella también.",
    "fotos": [
      {
        "src": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-1.webp",
        "alt": "Ánfora y retrato de Teo, foto compartida por Dafne Retamal"
      },
      {
        "src": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-2.webp",
        "srcset": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-2-440.webp 440w, /Assets/pagina-web-testimonios/reviews/dafne-retamal-2.webp 652w",
        "sizes": "(max-width: 768px) 35vw, 260px",
        "alt": "Teo, foto compartida por Dafne Retamal"
      },
      {
        "src": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-3.webp",
        "srcset": "/Assets/pagina-web-testimonios/reviews/dafne-retamal-3-440.webp 440w, /Assets/pagina-web-testimonios/reviews/dafne-retamal-3.webp 652w",
        "sizes": "(max-width: 768px) 35vw, 260px",
        "alt": "Teo, foto compartida por Dafne Retamal"
      }
    ]
  },
  {
    "nombre": "Daniela Risco",
    "texto": "Agradecida de la hermosa labor que realizan, lleve a mi perrita Emma que me acompañó durante 14 años, apenas ingrese sentí un ambiente cálido, de mucho amor y entendimiento hacia la pérdida que estaba cursando.<br> Felicidades por esta hermosa labor en la que nos ayudan a mantener a nuestros compañeros de vida, siempre junto a nosotros.",
    "fotos": []
  },
  {
    "nombre": "Constanza Villagran",
    "texto": "He tenido que acudir a Pets al Cielo en dos ocasiones por mi Fanny y Pequita y no tengo palabras suficientes para agradecer el servicio que brindan. En los momentos más dolorosos, han demostrado una empatía, respeto y calidad humana, te acompañan con un amor y una delicadeza. Los recomiendo a ojos cerrados, de verdad hacen honor a su nombre y tratan a nuestras mascotas con el mayor de los respetos 🌸",
    "fotos": []
  },
  {
    "nombre": "Rodrigo Latorre",
    "texto": "Es una atencion muy humana y te tranquilizan en un momento tan dificil, el trabajo fue muy profesional y es un gran alivio que sean ellos los que ayudaron en estos que era tan importante",
    "fotos": [
      {
        "src": "/Assets/pagina-web-testimonios/reviews/rodrigo-latorre-1.webp",
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
        "alt": "Ánforas y recuerdos de sus mascotas en un estante, foto compartida por Arturo Rivero"
      }
    ]
  }
];
