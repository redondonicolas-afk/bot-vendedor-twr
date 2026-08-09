/**
 * BOT VENDEDOR - Capta interesados desde el QR de la pared
 *
 * Meta WhatsApp Business API + Claude AI
 * Basado en el template base, adaptado para VENDER el bot.
 *
 * Flujo: saluda -> pregunta rubro -> da ideas por rubro -> 5 preguntas -> capta el lead.
 * Cuando junta los 5 datos, Claude emite una línea oculta ##LEAD## {json} que:
 *   - NO se le manda al cliente (se borra antes de responder)
 *   - se guarda en el Google Sheet (via LEAD_WEBHOOK_URL, un Google Apps Script)
 *   - te avisa por Telegram (opcional)
 *
 * Deploy: Railway. Ver README_DEPLOY.md
 */

require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const app = express();
app.use(express.json());

const CONFIG = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// ============================================
// SYSTEM PROMPT DEL BOT VENDEDOR
// ============================================

const cincoPreguntas = (CONFIG.cincoPreguntas || [])
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');

const SYSTEM_PROMPT = `
Sos el asistente de ${CONFIG.nombreNegocio}. Tu trabajo es VENDER nuestro servicio a dueños de negocios que escanearon un QR y quieren saber cómo un WhatsApp con IA los puede ayudar.

═══════════════ QUÉ VENDEMOS ═══════════════
${CONFIG.infoNegocio}

═══════════════ TU OBJETIVO ═══════════════
${CONFIG.objetivo}

═══════════════ TONO ═══════════════
- ${CONFIG.tono}
- Español argentino (vos, tenés, podés). ${CONFIG.usarEmojis ? 'Un emoji por mensaje como mucho.' : 'Sin emojis.'}
- Mensajes CORTOS. No mandes textos largos: es un chat, no un mail.
- Nunca pesado ni robótico. Sos un vendedor con buena onda.

═══════════════ CÓMO GENERAR IDEAS POR RUBRO ═══════════════
${CONFIG.reglasIdeasPorRubro}

═══════════════ LAS 5 PREGUNTAS (de a una, no todas juntas) ═══════════════
${cincoPreguntas}

═══════════════ FLUJO ═══════════════
1) Si es el primer mensaje: saludá corto, explicá en 1-2 frases qué hacemos, y preguntá "¿a qué te dedicás?".
2) Cuando diga su rubro: devolvé 3-4 ideas CONCRETAS de ese rubro y preguntá si le sirve.
3) Si muestra interés: ofrecé armarle un mini-demo con "5 preguntas rápidas".
4) Si acepta: hacé las 5 preguntas UNA POR UNA, esperando respuesta entre cada una.
5) Cuando tengas las 5 respuestas: agradecé y decí que le mandás algo en 24-48hs.

═══════════════ RESTRICCIONES ═══════════════
${CONFIG.restricciones}

═══════════════ CAPTURA DEL LEAD (MUY IMPORTANTE) ═══════════════
Cuando ya tengas juntados el nombre del negocio, el rubro y AL MENOS el contacto para el demo (más lo que hayas podido sacar de las 5 preguntas), terminá tu mensaje de cierre normal para el cliente, y DESPUÉS agregá en una línea nueva, al final de todo, EXACTAMENTE este formato (el cliente no lo va a ver, lo procesa el sistema):

##LEAD## {"negocio":"...","rubro":"...","que_preguntan":"...","que_resuelva":"...","datos_negocio":"...","contacto":"...","ideas":"...","etapa":"3. Demo pendiente"}

Reglas del bloque ##LEAD##:
- Ponelo UNA sola vez, cuando tengas los datos, no antes.
- JSON válido en UNA línea. Si un dato no lo tenés, poné "".
- No expliques el bloque ni lo menciones. Va crudo al final.
`;

// ============================================
// CLAUDE
// ============================================

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const conversaciones = {};

async function consultarClaude(telefono, mensaje) {
    if (!conversaciones[telefono]) conversaciones[telefono] = [];
    const n = CONFIG.historialMensajes || 12;
    const historial = conversaciones[telefono].slice(-n);
    const mensajes = [...historial, { role: 'user', content: mensaje }];

    try {
        const response = await anthropic.messages.create({
            model: CONFIG.modeloClaude || 'claude-sonnet-4-20250514',
            max_tokens: CONFIG.maxTokens || 1024,
            system: SYSTEM_PROMPT,
            messages: mensajes
        });
        const respuesta = (response.content.find(b => b.type === 'text')?.text) || CONFIG.mensajeError;
        conversaciones[telefono].push({ role: 'user', content: mensaje });
        conversaciones[telefono].push({ role: 'assistant', content: respuesta });
        if (conversaciones[telefono].length > 100) {
            conversaciones[telefono] = conversaciones[telefono].slice(-50);
        }
        return respuesta;
    } catch (error) {
        console.error('❌ Error Claude:', error.message);
        return CONFIG.mensajeError;
    }
}

// ============================================
// CAPTURA DE LEAD  (detecta y separa el bloque ##LEAD##)
// ============================================

function extraerLead(textoClaude, telefono) {
    const idx = textoClaude.indexOf('##LEAD##');
    if (idx === -1) return { textoLimpio: textoClaude, lead: null };

    const textoLimpio = textoClaude.slice(0, idx).trim();
    const resto = textoClaude.slice(idx + '##LEAD##'.length).trim();

    let lead = null;
    try {
        // tomar desde la primera { hasta la última } por las dudas
        const start = resto.indexOf('{');
        const end = resto.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            lead = JSON.parse(resto.slice(start, end + 1));
            lead.telefono = telefono;
            lead.fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
        }
    } catch (e) {
        console.error('⚠️ No pude parsear el LEAD:', e.message, '| crudo:', resto);
    }
    return { textoLimpio, lead };
}

async function guardarLead(lead) {
    if (!lead) return;
    console.log('📥 LEAD nuevo:', JSON.stringify(lead));

    // 1) Google Sheet (via Apps Script webhook)
    if (process.env.LEAD_WEBHOOK_URL) {
        try {
            await fetch(process.env.LEAD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lead)
            });
            console.log('✅ Lead guardado en Google Sheet');
        } catch (e) {
            console.error('❌ Error guardando en Sheet:', e.message);
        }
    }

    // 2) Aviso por Telegram (opcional)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        const msg =
            `🎯 *Nuevo lead del QR*\n\n` +
            `🏪 ${lead.negocio || '-'} (${lead.rubro || '-'})\n` +
            `📱 ${lead.telefono || '-'}\n` +
            `📩 Contacto: ${lead.contacto || '-'}\n` +
            `❓ Preguntan: ${lead.que_preguntan || '-'}\n` +
            `🎁 Quiere: ${lead.que_resuelva || '-'}\n` +
            `📌 Etapa: ${lead.etapa || '-'}`;
        try {
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' })
            });
            console.log('✅ Aviso enviado por Telegram');
        } catch (e) {
            console.error('❌ Error Telegram:', e.message);
        }
    }
}

// ============================================
// WHATSAPP WEBHOOK
// ============================================

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('✅ Webhook verificado por Meta');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    const value = change.value;
                    if (value.messages) {
                        for (const message of value.messages) {
                            if (message.type === 'text') {
                                const from = message.from;
                                const texto = message.text.body;
                                console.log(`\n📩 Mensaje de ${from}: ${texto.substring(0, 80)}`);

                                const respuestaCruda = await consultarClaude(from, texto);
                                const { textoLimpio, lead } = extraerLead(respuestaCruda, from);

                                await enviarMensaje(from, textoLimpio || respuestaCruda);
                                if (lead) await guardarLead(lead);
                            }
                        }
                    }
                }
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error webhook:', error.message);
        res.sendStatus(200);
    }
});

// ============================================
// ENVIAR MENSAJE
// ============================================

async function enviarMensaje(to, mensaje) {
    const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: { preview_url: false, body: mensaje }
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Error desconocido');
        return data;
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error.message);
        throw error;
    }
}

// ============================================
// HEALTH
// ============================================

app.get('/', (req, res) => res.json({ status: 'ok', bot: 'vendedor', negocio: CONFIG.nombreNegocio }));
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🤖 Bot vendedor "${CONFIG.nombreNegocio}" escuchando en puerto ${PORT}`));
