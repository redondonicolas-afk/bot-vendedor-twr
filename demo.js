/**
 * DEMO AUTOGENERADA — NR Digital
 *
 * El prospecto llena un formulario en /probar, y cuando escribe al MISMO número
 * del bot vendedor, el bot le contesta como SU bot: con su negocio, su rubro y
 * su tono. Si nunca llenó el formulario, no pasa nada: sigue siendo el vendedor
 * de siempre.
 *
 * Cómo se enchufa en index.js del bot vendedor — tres líneas:
 *
 *   const { montarDemo, promptDeDemo, tocarDemo } = require('./demo');
 *   montarDemo(app);                                    // después de crear `app`
 *   ...
 *   system: promptDeDemo(telefono) || SYSTEM_PROMPT,    // dentro de consultarClaude
 *
 * LAS PREGUNTAS SON POR RUBRO (ver rubros.js)
 * A un dentista se le pregunta por obras sociales y urgencias; a un parrillero
 * por reservas y delivery. Y el bot recibe, además, las reglas de atención de
 * ese rubro. Eso es lo que hace que la demo se sienta hecha para el que la prueba.
 *
 * DÓNDE SE GUARDAN LAS DEMOS
 * En memoria y en un archivo JSON dentro del volumen. Sin volumen, Railway borra
 * el disco en cada deploy: el prospecto escribe y el bot ya no lo reconoce.
 */

const fs = require('fs');
const path = require('path');
const { RUBROS } = require('./rubros');

const DIAS_QUE_DURA = Number(process.env.DEMO_DIAS || 7);
const NUMERO_BOT = (process.env.NUMERO_BOT || '5491125730577').replace(/\D/g, '');
// Railway inyecta RAILWAY_VOLUME_MOUNT_PATH solo cuando hay un volumen adjunto.
// Usarlo directo evita configurar nada a mano y evita el error silencioso de
// apuntar DATA_DIR a un path que no existe.
const CARPETA = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const ARCHIVO = path.join(CARPETA, 'demos.json');
const HAY_VOLUMEN = !!(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH);

const TONOS = {
  cercano: 'Cercano y con buena onda, de vos. Como quien atiende bien en el mostrador.',
  formal: 'Cordial y profesional, de usted. Sobrio, sin exceso de confianza.',
  canchero: 'Relajado y canchero, de vos, con humor liviano. Nunca payaso.'
};

const rubroDe = r => RUBROS[r] || RUBROS.otro;

// ── guardado ──────────────────────────────────────────────────────────
let DEMOS = {};

function cargar() {
  try {
    DEMOS = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    limpiarVencidas();
    console.log(`[demo] ${Object.keys(DEMOS).length} demos cargadas de ${ARCHIVO}`);
  } catch (e) {
    DEMOS = {};
  }
}

function guardar() {
  try {
    const tmp = ARCHIVO + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(DEMOS), 'utf8');
    fs.renameSync(tmp, ARCHIVO);
  } catch (e) {
    console.error('[demo] no pude guardar en disco:', e.message);
  }
}

function limpiarVencidas() {
  const ahora = Date.now();
  let saque = 0;
  for (const tel of Object.keys(DEMOS)) {
    if (!DEMOS[tel].vence || DEMOS[tel].vence < ahora) { delete DEMOS[tel]; saque++; }
  }
  if (saque) guardar();
}

// Meta manda los teléfonos argentinos sin el 9 (5411...) mientras que la gente
// escribe el suyo de mil formas. Se guarda con Y sin 9 apuntando a la misma
// demo: si no, el prospecto llena el formulario y el bot no lo reconoce.
function clavesDe(telefono) {
  let t = String(telefono || '').replace(/\D/g, '');
  if (!t) return [];
  if (t.startsWith('00')) t = t.slice(2);
  if (t.length === 10 && t.startsWith('11')) t = '54' + t;
  if (t.length === 11 && t.startsWith('911')) t = '54' + t;
  if (!t.startsWith('54')) t = '54' + t;
  const resto = t.slice(2);
  const sinNueve = resto.startsWith('9') ? resto.slice(1) : resto;
  return [...new Set(['54' + sinNueve, '549' + sinNueve])];
}

// ── el bot de la demo ─────────────────────────────────────────────────
function armarPrompt(d) {
  const R = rubroDe(d.rubro);

  // Lo que contó el dueño, cada respuesta con la pregunta que la originó.
  let contó = '';
  if (d.respuestas && Object.keys(d.respuestas).length) {
    contó = R.campos
      .filter(c => (d.respuestas[c.id] || '').trim())
      .map(c => `▸ ${c.l}\n${d.respuestas[c.id].trim()}`)
      .join('\n\n');
  } else {
    // Demos creadas con el formulario viejo.
    contó = [d.queVende, d.datos, d.precios].filter(x => (x || '').trim()).join('\n\n');
  }

  return `
Sos el asistente de WhatsApp de ${d.negocio}. Atendés a los clientes como lo haría alguien del mostrador que conoce bien el negocio.

═══ CÓMO HABLÁS ═══
- ${TONOS[d.tono] || TONOS.cercano}
- Español argentino. Mensajes CORTOS: es un WhatsApp, no un mail.
- Si tenés que decir mucho, mandá dos mensajes en vez de un ladrillo.
- Un emoji por mensaje como mucho.

═══ LO QUE CONTÓ EL DUEÑO ═══
${contó}

═══ CÓMO SE ATIENDE EN ESTE RUBRO (${R.t}) ═══
${R.conducta}

═══ LA REGLA MÁS IMPORTANTE ═══
NO INVENTES NADA. Si te preguntan algo que no está acá arriba —un precio que no figura, si hay stock, un horario libre, una fecha de entrega— decí con naturalidad que eso lo confirma el dueño y que le pasás la consulta. Un "eso te lo confirmo" vale mil veces más que un dato inventado que después queda mal.
Nunca prometas envíos, descuentos ni plazos que no estén escritos arriba.

═══ QUÉ SOS ═══
Sos una demo que se armó sola, en dos minutos, con lo que el dueño escribió en un formulario. Si te preguntan si sos un bot, decilo sin drama.
Si te preguntan cómo se te configura, o si podés hacer algo que no sabés hacer, contá que esto es una muestra rápida y que Nico, de NR Digital, lo puede dejar fino con los datos reales del negocio — catálogo completo, fotos, turnos, presupuestos. Mencionalo sólo si viene al caso, no insistas.

═══ NO HAGAS ═══
- No calcules cuentas ni cotices por medida: esta demo contesta, no cotiza.
- No hables de temas ajenos al negocio.
- No pidas datos personales más allá del nombre.
`.trim();
}

function buscar(telefono) {
  for (const k of clavesDe(telefono)) {
    const d = DEMOS[k];
    if (d && d.vence > Date.now()) return d;
  }
  return null;
}

function promptDeDemo(telefono) {
  const d = buscar(telefono);
  return d ? armarPrompt(d) : null;
}

// Cada mensaje estira la demo y cuenta cuánto la usaron: sirve para saber
// quién la probó en serio y quién entró y se fue.
function tocarDemo(telefono) {
  const d = buscar(telefono);
  if (!d) return null;
  d.mensajes = (d.mensajes || 0) + 1;
  d.ultimo = Date.now();
  guardar();
  return d;
}

// ── alta desde el formulario ──────────────────────────────────────────
function crear(datos) {
  const negocio = String(datos.negocio || '').trim().slice(0, 80);
  const telefono = String(datos.telefono || '').trim();
  const claves = clavesDe(telefono);
  const rubro = RUBROS[datos.rubro] ? datos.rubro : 'otro';

  const respuestas = {};
  rubroDe(rubro).campos.forEach(c => {
    const v = String((datos.respuestas || {})[c.id] || '').trim().slice(0, 1200);
    if (v) respuestas[c.id] = v;
  });

  if (!negocio || claves.length === 0) {
    return { error: 'Faltan el nombre del negocio o tu WhatsApp.' };
  }
  if (claves[0].length < 12) {
    return { error: 'Ese WhatsApp no parece completo. Poné código de área y número, sin el 0 y sin el 15. Ejemplo: 1163067486.' };
  }
  if (!Object.keys(respuestas).length) {
    return { error: 'Contanos aunque sea una cosa de tu negocio, si no el asistente no tiene con qué contestar.' };
  }

  const demo = {
    negocio,
    rubro,
    respuestas,
    tono: TONOS[datos.tono] ? datos.tono : 'cercano',
    telefono: claves[claves.length - 1],
    creada: Date.now(),
    vence: Date.now() + DIAS_QUE_DURA * 86400000,
    mensajes: 0
  };

  claves.forEach(k => { DEMOS[k] = demo; });
  guardar();

  const texto = encodeURIComponent(`Hola! Soy de ${negocio} y quiero probar mi asistente.`);
  return { ok: true, demo, wa: `https://wa.me/${NUMERO_BOT}?text=${texto}` };
}

// ── avisos: el formulario ES la captura del lead ──────────────────────
function resumenDe(demo) {
  const R = rubroDe(demo.rubro);
  return R.campos
    .filter(c => demo.respuestas && demo.respuestas[c.id])
    .map(c => `${c.l}\n${demo.respuestas[c.id].slice(0, 300)}`)
    .join('\n\n');
}

async function avisar(demo) {
  const R = rubroDe(demo.rubro);
  const texto =
    `🆕 DEMO AUTOGENERADA\n\n` +
    `Negocio: ${demo.negocio}\n` +
    `Rubro: ${R.t}\n` +
    `WhatsApp: +${demo.telefono}\n\n` +
    resumenDe(demo) +
    `\n\nEstá por escribirle al bot.`;

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(tgChat).trim(), text: texto })
      });
      // fetch NO tira excepción con 400: hay que mirar res.ok o el ✅ miente.
      if (!r.ok) console.error('[demo] Telegram rechazó el aviso:', r.status, await r.text());
    } catch (e) { console.error('[demo] Telegram falló:', e.message); }
  }

  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'lead',
          negocio: demo.negocio,
          rubro: R.t,
          telefono: demo.telefono,
          contacto: `+${demo.telefono}`,
          que_preguntan: '',
          que_resuelva: '',
          datos_negocio: resumenDe(demo).slice(0, 1500),
          ideas: '',
          notas: 'Entró por el formulario /probar y se autogeneró la demo.',
          etapa: '2. Demo autogenerada'
        })
      });
    } catch (e) { console.error('[demo] Sheet falló:', e.message); }
  }
}

// ── rutas ─────────────────────────────────────────────────────────────
function montarDemo(app) {
  const express = require('express');
  cargar();
  setInterval(limpiarVencidas, 3600000).unref?.();

  app.use('/probar', express.static(path.join(__dirname, 'public')));

  // El formulario se arma solo con esto: una sola fuente de verdad para las
  // preguntas de cada rubro, compartida entre la pantalla y el bot.
  app.get('/api/rubros', (req, res) => {
    const salida = {};
    Object.entries(RUBROS).forEach(([k, r]) => {
      salida[k] = { t: r.t, campos: r.campos };
    });
    res.json(salida);
  });

  app.post('/api/demo', express.json({ limit: '64kb' }), async (req, res) => {
    const r = crear(req.body || {});
    if (r.error) return res.status(400).json({ error: r.error });
    avisar(r.demo).catch(() => {});
    console.log(`[demo] nueva demo: ${r.demo.negocio} (${r.demo.rubro}) +${r.demo.telefono}`);
    res.json({ ok: true, wa: r.wa, negocio: r.demo.negocio, dias: DIAS_QUE_DURA });
  });

  // Para mirar desde el celular cuántas demos vivas hay, sin abrir Railway.
  app.get('/api/demos', (req, res) => {
    if (!process.env.PANEL_CLAVE || req.query.clave !== process.env.PANEL_CLAVE) {
      return res.status(401).json({ error: 'Falta la clave.' });
    }
    limpiarVencidas();
    const vistas = {};
    Object.values(DEMOS).forEach(d => { vistas[d.telefono] = d; });
    res.json(Object.values(vistas).map(d => ({
      negocio: d.negocio, rubro: d.rubro, telefono: d.telefono,
      mensajes: d.mensajes || 0,
      creada: new Date(d.creada).toISOString(), vence: new Date(d.vence).toISOString()
    })));
  });

  console.log(`[demo] formulario en /probar · las demos duran ${DIAS_QUE_DURA} días`);
  console.log(`[demo] guardando en ${ARCHIVO}`);
  console.log(HAY_VOLUMEN
    ? '[demo] ✅ hay volumen: las demos sobreviven a los deploys'
    : '[demo] ⚠️  SIN volumen: las demos se van a perder en el próximo deploy');
  try {
    fs.mkdirSync(CARPETA, { recursive: true });
    fs.accessSync(CARPETA, fs.constants.W_OK);
  } catch (e) {
    console.error(`[demo] 🔴 no puedo escribir en ${CARPETA}: ${e.message}`);
  }
}

module.exports = { montarDemo, promptDeDemo, tocarDemo, clavesDe, crear, armarPrompt, RUBROS };
