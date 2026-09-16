/**
 * LOS RUBROS — NR Digital
 *
 * Un archivo compartido por el formulario y por el bot. Cada rubro define:
 *   - `t`       cómo se llama en el desplegable
 *   - `campos`  las 3 o 4 preguntas que se le hacen al dueño de ESE rubro,
 *               con ejemplos reales adentro del placeholder
 *   - `conducta` cómo tiene que atender el bot en ese rubro: lo que un
 *               dentista da por obvio y un parrillero ni se imagina
 *
 * El "conducta" es lo que hace que la demo se sienta hecha para el que la
 * prueba y no un formulario genérico con su nombre pegado arriba.
 */

const RUBROS = {
  gastronomia: {
    t: 'Restaurante, bar o café',
    campos: [
      { id: 'carta',    l: '¿Qué te piden más y a cuánto?',            ph: 'Milanesa napolitana con papas $14.500\nPizza muzzarella $11.000\nCerveza pinta $4.500', area: true },
      { id: 'reservas', l: '¿Tomás reservas? ¿Hacés delivery?',        ph: 'Reservas sí, hasta 8 personas por WhatsApp. Delivery por PedidosYa y propio en Martínez.', area: true },
      { id: 'donde',    l: '¿Dónde estás y qué días abrís?',           ph: 'Av. Mitre 1234, Martínez. Martes a domingo de 12 a 16 y de 20 a 24. Lunes cerrado.', area: true }
    ],
    conducta: `- Si preguntan por una mesa: preguntá para qué día, qué hora y cuántas personas, en un solo mensaje.
- Si preguntan por un plato que no está en la carta de arriba, no lo inventes: decí que lo consultás con la cocina.
- Si preguntan si hay lugar ahora, no lo confirmes: eso lo sabe el salón. Ofrecé pasar la consulta.
- Contá el plato que más piden cuando alguien no sabe qué elegir.`
  },

  salud: {
    t: 'Consultorio (dentista, kinesiología, psicología, veterinaria…)',
    campos: [
      { id: 'tratamientos', l: '¿Qué atendés y cuánto sale la consulta?', ph: 'Consulta $28.000\nLimpieza $45.000\nBlanqueamiento desde $120.000', area: true },
      { id: 'obras',        l: '¿Trabajás con obras sociales o prepagas? ¿Cuáles?', ph: 'OSDE y Swiss Medical con reintegro. Galeno no.', area: true },
      { id: 'turnos',       l: '¿Cómo se saca un turno? ¿Atendés urgencias?', ph: 'Turnos por WhatsApp o llamando. Urgencias con dolor, el mismo día si hay lugar.', area: true },
      { id: 'donde',        l: '¿Dónde atendés y en qué horarios?',      ph: 'Rivadavia 500, piso 3, San Isidro. Lunes a viernes de 9 a 19.', area: true }
    ],
    conducta: `- Antes de dar un precio, preguntá si ya es paciente y si tiene obra social: el precio cambia y contestar sin eso hace quedar mal.
- Si alguien menciona DOLOR o una urgencia, esa consulta va primero: no la trates como una consulta de precio.
- Nunca des un diagnóstico ni opines sobre un síntoma. Eso lo ve el profesional.
- Si piden un turno, preguntá qué días le sirven y en qué franja, y avisá que lo confirma el consultorio.`
  },

  tienda: {
    t: 'Tienda o local de productos',
    campos: [
      { id: 'productos', l: '¿Qué vendés y en qué rango de precios?',   ph: 'Zapatillas Nike y Adidas de segunda mano, todos los modelos a $40.000.', area: true },
      { id: 'envios',    l: '¿Hacés envíos? ¿A qué zonas y cuánto?',    ph: 'Zona Norte $4.500, CABA $6.000. Retiro gratis por el local.', area: true },
      { id: 'pagos',     l: '¿Cómo se paga? ¿Hacés cuotas?',            ph: 'Efectivo con 10% off, transferencia, o 3 y 6 cuotas con recargo.', area: true },
      { id: 'donde',     l: '¿Dónde estás y qué días abrís?',           ph: 'Local en Paraná 234, Martínez. Lunes a sábado de 10 a 19.', area: true }
    ],
    conducta: `- Si preguntan por un modelo, talle o color puntual, NO confirmes stock: decí que lo chequeás y ofrecé pasar la consulta.
- Cuando des un precio, agregá cómo se paga y si hay descuento por efectivo o transferencia.
- Si hablan de envío, preguntá la localidad antes de decir el costo.
- Ofrecé lo que combina con lo que están comprando, una sola vez y sin insistir.`
  },

  servicios: {
    t: 'Servicios y oficios (plomero, electricista, fletes, obra…)',
    campos: [
      { id: 'trabajos', l: '¿Qué trabajos hacés?',                      ph: 'Destapaciones, cambio de termotanques, instalación de cañerías, pérdidas.', area: true },
      { id: 'zona',     l: '¿Qué zona cubrís?',                         ph: 'San Isidro, Martínez, Vicente López, Olivos. Más lejos, con recargo.', area: true },
      { id: 'visita',   l: '¿Cobrás la visita o el presupuesto? ¿Cuánto?', ph: 'La visita $20.000, se descuenta si hacés el trabajo. Presupuesto sin cargo por foto.', area: true },
      { id: 'cuando',   l: '¿Cómo coordinás y en qué horarios trabajás?', ph: 'Lunes a sábado de 8 a 18. Urgencias también de noche con recargo.', area: true }
    ],
    conducta: `- Nunca tires un precio final del trabajo: preguntá qué le pasa, pedí una foto y ofrecé el presupuesto.
- Preguntá SIEMPRE la localidad temprano: define si el trabajo se puede tomar o no.
- Si suena a urgencia (pérdida de agua, sin luz, sin gas), tratala como tal y ofrecé el primer hueco.
- Decí con claridad qué cuesta la visita antes de coordinarla. Que no haya sorpresas.`
  },

  belleza: {
    t: 'Belleza y estética (peluquería, uñas, spa…)',
    campos: [
      { id: 'servicios', l: '¿Qué servicios hacés y a cuánto?',         ph: 'Corte $18.000 · Color desde $45.000 · Semipermanente $15.000', area: true },
      { id: 'turnos',    l: '¿Cómo se saca turno? ¿Se señan?',          ph: 'Por WhatsApp. Color y alisado con seña de $10.000 por transferencia.', area: true },
      { id: 'promos',    l: '¿Tenés promos o combos?',                  ph: 'Martes y miércoles 20% off en color. Combo corte + brushing $25.000.', area: true },
      { id: 'donde',     l: '¿Dónde estás y qué días abrís?',           ph: 'Alvear 890, Olivos. Martes a sábado de 10 a 20.', area: true }
    ],
    conducta: `- Si piden turno, preguntá qué servicio quieren, qué día les sirve y en qué franja horaria.
- Para color o alisado, avisá que hace falta seña y cuánto, antes de agendar.
- Si preguntan cuánto tarda un servicio, dalo sólo si está escrito arriba; si no, decí que lo confirma el salón.
- No opines sobre qué color o corte le queda mejor a alguien sin verlo: invitalo a pasar o mandar una foto.`
  },

  deportes: {
    t: 'Canchas, gimnasio o club',
    campos: [
      { id: 'que',     l: '¿Qué alquilás u ofrecés y a cuánto?',        ph: 'Cancha de pádel techada $28.000 la hora. Después de las 22, $22.000.', area: true },
      { id: 'reserva', l: '¿Cómo se reserva? ¿Piden seña?',             ph: 'Por WhatsApp. Seña del 50% por transferencia para confirmar el turno.', area: true },
      { id: 'extras',  l: '¿Alquilás equipamiento o vendés algo más?',  ph: 'Paletas $5.000 la hora, pelotas $8.000 el tubo. Buffet con bebidas.', area: true },
      { id: 'donde',   l: '¿Dónde estás y qué horarios tenés?',         ph: 'Panamericana y Márquez, Boulogne. Todos los días de 8 a 24.', area: true }
    ],
    conducta: `- Si preguntan por disponibilidad de un horario puntual, NO la confirmes: no ves la agenda. Preguntá día y hora y decí que lo confirmás.
- Contá siempre el precio de la franja que pidieron, incluida la promo de horario valle si existe.
- Si dudan, ofrecé el alquiler de equipamiento: mucha gente no juega porque no tiene paleta.
- Con grupos grandes o torneos, pasá la consulta a una persona.`
  },

  inmobiliaria: {
    t: 'Inmobiliaria',
    campos: [
      { id: 'operaciones', l: '¿Qué operaciones hacés y en qué zonas?', ph: 'Venta y alquiler en San Isidro, Martínez y Acassuso. Casas y departamentos.', area: true },
      { id: 'captacion',   l: 'Si alguien quiere vender o alquilar su propiedad, ¿qué le pedís primero?', ph: 'Dirección, metros, ambientes y unas fotos. Después coordinamos la visita.', area: true },
      { id: 'tasacion',    l: '¿Cobrás la tasación? ¿Qué comisión manejás?', ph: 'Tasación sin cargo. Comisión 3% + IVA al vendedor.', area: true },
      { id: 'donde',       l: '¿Dónde está la oficina y en qué horarios?', ph: 'Av. Santa Fe 200, San Isidro. Lunes a viernes de 9 a 18, sábados de 10 a 13.', area: true }
    ],
    conducta: `- Distinguí rápido si la persona QUIERE COMPRAR/ALQUILAR o si TIENE una propiedad para ofrecer: son dos charlas distintas.
- Si tiene una propiedad, pedile los datos y las fotos, y ofrecé coordinar la visita: ese es el pescado grande.
- Nunca tases una propiedad por WhatsApp ni des un valor "aproximado": eso lo hace el martillero.
- Si preguntan por una propiedad puntual del portal, pedí el código o el link y decí que lo confirmás.`
  },

  educacion: {
    t: 'Clases, cursos o academia',
    campos: [
      { id: 'cursos',   l: '¿Qué enseñás y a cuánto?',                  ph: 'Inglés grupal $35.000/mes · Particular $18.000 la hora · Nivelación para adultos.', area: true },
      { id: 'modalidad',l: '¿Presencial u online? ¿Qué días y horarios?', ph: 'Online por Zoom o presencial en Martínez. Lunes y miércoles de 18 a 20.', area: true },
      { id: 'inscribir',l: '¿Cómo se anota alguien? ¿Hay clase de prueba?', ph: 'Clase de prueba sin cargo. Después matrícula de $20.000 y arranca.', area: true }
    ],
    conducta: `- Preguntá para quién es la clase (para él, para un hijo, qué edad) y qué nivel tiene: sin eso no se puede orientar.
- Ofrecé la clase de prueba si existe: es lo que más convierte.
- No prometas resultados ni plazos ("en tres meses hablás fluido").
- Si preguntan por horarios que no están arriba, decí que lo consultás.`
  },

  otro: {
    t: 'Otro rubro',
    campos: [
      { id: 'queVende', l: '¿Qué vendés o qué hacés?',                  ph: 'Contalo como se lo contarías a alguien en el mostrador.', area: true },
      { id: 'precios',  l: '¿Qué precios querés que sepa contestar?',   ph: 'Uno por línea, como los tengas.', area: true },
      { id: 'donde',    l: '¿Dónde estás, qué horarios y cómo se paga?', ph: 'Dirección, días y horarios, medios de pago, envíos.', area: true }
    ],
    conducta: `- Contestá con lo que el dueño escribió y nada más.
- Si te preguntan algo que no está, decilo y ofrecé pasar la consulta.`
  }
};

module.exports = { RUBROS };
