/**
 * DEMO AUTOGENERADA — NR Digital
 *
 * El prospecto llena un formulario en /probar, y cuando escribe al MISMO número
 * del bot vendedor, el bot le contesta como SU bot: con su negocio, su tono y
 * sus datos. Si nunca llenó el formulario, no pasa nada: sigue siendo el
 * vendedor de siempre.
 *
 * Cómo se enchufa en index.js del bot vendedor — tres líneas:
 *
 *   const { montarDemo, promptDeDemo, tocarDemo } = require('./demo');
 *   montarDemo(app);                                    // después de crear `app`
 *   ...
 *   system: promptDeDemo(telefono) || SYSTEM_PROMPT,    // dentro de consultarClaude
 *
 * DÓNDE SE GUARDAN LAS DEMOS
 * En memoria y, además, en un archivo JSON. Sin volumen, Railway borra el disco
 * en cada deploy y las demos vivas se pierden (el prospecto escribe y el bot no
 * lo reconoce). Para que sobrevivan: crear un volumen en Railway montado en
 * /data y setear DATA_DIR=/data.
 */

const fs = require('fs');
const path = require('path');

const DIAS_QUE_DURA = Number(process.env.DEMO_DIAS || 7);
const NUMERO_BOT = (process.env.NUMERO_BOT || '5491125730577').replace(/\D/g, '');
const ARCHIVO = path.join(process.env.DATA_DIR || __dirname, 'demos.json');

const TONOS = {
  cercano: 'Cercano y con buena onda, de vos. Como quien atiende bien en el mostrador.',
  formal: 'Cordial y profesional, de usted. Sobrio, sin exceso de confianza.',
  canchero: 'Relajado y canchero, de vos, con humor liviano. Nunca payaso.'
};

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
  if (t.length === 10 && t.startsWith('11')) t = '54' + t;          // 11xxxxxxxx
  if (t.length === 11 && t.startsWith('911')) t = '54' + t;         // 911xxxxxxxx
  if (!t.startsWith('54')) t = '54' + t;
  const resto = t.slice(2);
  const sinNueve = resto.startsWith('9') ? resto.slice(1) : resto;
  return [...new Set(['54' + sinNueve, '549' + sinNueve])];
}

// ── el bot de la demo ─────────────────────────────────────────────────
function armarPrompt(d) {
  const bloque = (titulo, texto) => texto ? `\n═══ ${titulo} ═══\n${texto}\n` : '';
  return `
Sos el asistente de WhatsApp de ${d.negocio}. Atendés a los clientes del negocio como lo haría alguien del mostrador que conoce bien lo que vende.

═══ CÓMO HABLÁS ═══
- ${TONOS[d.tono] || TONOS.cercano}
- Español argentino. Mensajes CORTOS: es un WhatsApp, no un mail.
- Si tenés que decir mucho, mandá dos mensajes en vez de un ladrillo.
- Un emoji por mensaje como mucho.
${bloque('QUÉ ES EL NEGOCIO', d.queVende)}${bloque('DATOS (horarios, dirección, pagos, envíos)', d.datos)}${bloque('PRECIOS Y LO QUE MÁS PREGUNTAN', d.precios)}
═══ LA REGLA MÁS IMPORTANTE ═══
NO INVENTES NADA. Si te preguntan algo que no está acá arriba —un precio que no figura, si hay stock, una fecha de entrega— decí con naturalidad que eso lo confirma el dueño y que le pasás la consulta. Un "eso te lo confirmo con el dueño" vale mil veces más que un dato inventado que después queda mal.
Nunca prometas envíos, descuentos ni plazos que no estén escritos arriba.

═══ QUÉ SOS ═══
Sos una demo que se armó sola, en dos minutos, con lo que el dueño escribió en un formulario. Si te preguntan si sos un bot, decilo sin drama.
Si te preguntan cómo se te configura, o si podés hacer algo que no sabés hacer, contá que esto es una muestra rápida y que Nico, de NR Digital, lo puede dejar fino con los datos reales del negocio — precios, fotos, catálogo, turnos. No insistas con eso: mencionalo sólo si viene al caso.

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

// Cada mensaje estira un poco la demo y cuenta cuánto la usaron: sirve para
// saber quién la probó en serio y quién entró y se fue.
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
  const queVende = String(datos.queVende || '').trim().slice(0, 1200);
  const telefono = String(datos.telefono || '').trim();
  const claves = clavesDe(telefono);

  if (!negocio || !queVende || claves.length === 0) {
    return { error: 'Faltan el nombre del negocio, qué vendés o tu WhatsApp.' };
  }
  // Un teléfono argentino válido tiene 12 o 13 dígitos con el 54 adelante.
  if (claves[0].length < 12) {
    return { error: 'Ese WhatsApp no parece completo. Poné código de área y número, sin el 0 y sin el 15.' };
  }

  const demo = {
    negocio,
    queVende,
    datos: String(datos.datos || '').trim().slice(0, 900),
    precios: String(datos.precios || '').trim().slice(0, 1200),
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
async function avisar(demo) {
  const resumen =
    `🆕 DEMO AUTOGENERADA\n\n` +
    `Negocio: ${demo.negocio}\n` +
    `WhatsApp: +${demo.telefono}\n` +
    `Qué vende: ${demo.queVende.slice(0, 300)}\n` +
    (demo.datos ? `Datos: ${demo.datos.slice(0, 200)}\n` : '') +
    (demo.precios ? `Precios: ${demo.precios.slice(0, 200)}\n` : '') +
    `\nEstá por escribirle al bot. Miralo en la Sheet.`;

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    try {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text: resumen })
      });
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
          rubro: '',
          telefono: demo.telefono,
          contacto: `+${demo.telefono}`,
          que_preguntan: demo.precios,
          que_resuelva: '',
          datos_negocio: demo.datos,
          ideas: demo.queVende,
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

  app.post('/api/demo', express.json({ limit: '64kb' }), async (req, res) => {
    const r = crear(req.body || {});
    if (r.error) return res.status(400).json({ error: r.error });
    avisar(r.demo).catch(() => {});
    console.log(`[demo] nueva demo: ${r.demo.negocio} (+${r.demo.telefono})`);
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
      negocio: d.negocio, telefono: d.telefono, mensajes: d.mensajes || 0,
      creada: new Date(d.creada).toISOString(), vence: new Date(d.vence).toISOString()
    })));
  });

  console.log(`[demo] formulario en /probar · las demos duran ${DIAS_QUE_DURA} días`);
}

module.exports = { montarDemo, promptDeDemo, tocarDemo, clavesDe, crear, armarPrompt, _demos: () => DEMOS };
