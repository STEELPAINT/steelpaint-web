/* Timeout del CRM. 8s porque el proyecto corre con tráfico bajo y el
   arranque en frío es lo normal: con menos, [CRM-ERROR] marcaría leads
   que sí entraron y la marca dejaría de ser señal. */
const CRM_TIMEOUT_MS = 8000;

/* Mapeo rígido flujo → variable de entorno. Sin fallback entre flujos:
   si falta la que toca, ese lead no se manda al CRM. */
const CRM_ENV_BY_FLOW = {
  contacto:    'CRM_URL_CONTACTO',
  calculadora: 'CRM_URL_CALCULADORA',
  cotizacion:  'CRM_URL_COTIZACION',
  whatsapp:    'CRM_URL_WHATSAPP'
};

/* Un secreto por fuente, mismo mapeo rigido: si uno se filtra se revoca
   esa integracion sin tocar las otras dos. Nunca compartir uno. */
const CRM_SECRET_ENV_BY_FLOW = {
  contacto:    'CRM_WEBHOOK_SECRET_CONTACTO',
  calculadora: 'CRM_WEBHOOK_SECRET_CALCULADORA',
  cotizacion:  'CRM_WEBHOOK_SECRET_COTIZACION',
  whatsapp:    'CRM_WEBHOOK_SECRET_WHATSAPP'
};

const SUBJECT_BY_FLOW = {
  contacto:    'Nuevo lead',
  calculadora: 'Registro en calculadora',
  cotizacion:  'Actualización de lead',
  whatsapp:    'Preregistro de WhatsApp'
};

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* El flujo lo declara el cliente. La heurística solo cubre navegadores
   con una versión previa de main.js en caché: se apoya en la presencia
   de la clave 'mensaje', que el contacto siempre manda y el gate nunca. */
function resolveFlow(body) {
  if (Object.prototype.hasOwnProperty.call(CRM_ENV_BY_FLOW, body.flow)) {
    return body.flow;
  }
  /* WhatsApp primero: es el unico flujo que manda 'referencia' y no manda
     'email'. Sin esta rama, un envio suyo sin flow caeria en 'calculadora'
     y el lead se iria al webhook equivocado. */
  let guess;
  if (Object.prototype.hasOwnProperty.call(body, 'referencia') &&
      !Object.prototype.hasOwnProperty.call(body, 'email')) {
    guess = 'whatsapp';
  } else if (body.largo !== undefined && body.ancho !== undefined) {
    guess = 'cotizacion';
  } else if (Object.prototype.hasOwnProperty.call(body, 'mensaje')) {
    guess = 'contacto';
  } else {
    guess = 'calculadora';
  }
  console.warn(`[contact] flow ausente o invalido (${JSON.stringify(body.flow)}); heuristica: ${guess}`);
  return guess;
}

/* Las claves ausentes se omiten; nunca se manda "" al CRM. */
function put(target, key, value) {
  if (value === undefined || value === null) return;
  if (typeof value === 'string' && value.trim() === '') return;
  target[key] = value;
}

/* Nombres de clave exactos, tal como estan dados de alta en el CRM.
   'comms' es el unico campo que se convierte: el sitio lo maneja como
   booleano, el CRM espera el literal "Si" o "No". */
function buildCrmPayload(flow, body, attr) {
  const payload = {};
  put(payload, 'nombre',   body.nombre);
  put(payload, 'empresa',  body.empresa);
  put(payload, 'telefono', body.telefono);
  put(payload, 'email',    body.email);
  put(payload, 'mensaje',  body.mensaje);
  put(payload, 'referencia', body.referencia);

  /* En WhatsApp no hay casilla de consentimiento, asi que un 'No' se leeria
     como que el usuario lo declino. La clave se omite en vez de mentir. */
  if (flow !== 'whatsapp') {
    payload.comms = body.comms ? 'Sí' : 'No';
  }

  put(payload, 'gclid',    body.gclid);

  /* Atribucion, plana en la raiz y en los tres flujos: el webhook solo lee
     claves de primer nivel y un objeto anidado lo ignora sin avisar. Los
     nombres son los dados de alta en el CRM, sin acentos. String() porque
     ts, landing y campana llegan del cuerpo y podrian no ser texto; put()
     se encarga de omitir las que queden vacias. */
  put(payload, 'canal_primero', String(attr.canalPrimero   || ''));
  put(payload, 'canal_ultimo',  String(attr.canalUltimo    || ''));
  put(payload, 'campana',       String(attr.campana        || ''));
  put(payload, 'landing',       String(attr.landingPrimero || ''));
  put(payload, 'primer_toque',  String(attr.primerToqueTs  || ''));
  put(payload, 'ultimo_toque',  String(attr.ultimoToqueTs  || ''));

  if (flow === 'cotizacion') {
    put(payload, 'largo',  body.largo);
    put(payload, 'ancho',  body.ancho);
    put(payload, 'caras',  body.caras);
    put(payload, 'piezas', body.piezas);
    put(payload, 'total',  body.total);
  }
  return payload;
}

/* Etiqueta deliberada. Un toque sin senal solo significa que el navegador
   llego sin parametros ni referrer utilizable (marcador directo, app,
   correo, https→http): no dice nada sobre el origen real del lead, asi
   que la etiqueta no debe sugerir que marketing no lo genero. */
const CHANNEL_UNKNOWN = 'Directo o sin determinar';

const ADS_KEYS = ['gclid', 'gbraid', 'wbraid'];
const SOCIAL_NAMES = ['facebook', 'instagram', 'linkedin'];

/* El toque lo arma el cliente: cualquier clave puede venir ausente, vacia,
   con espacios o con otro tipo. Se normaliza a string recortado. */
function attrValue(touch, key) {
  const raw = touch ? touch[key] : undefined;
  if (raw === undefined || raw === null) return '';
  return String(raw).trim();
}

/* 't.co' se compara como host completo, no como subcadena: 'cliente.com',
   'print.com.mx' y cualquier dominio terminado en 't.com' la contienen y
   acabarian en Redes sociales. Los otros tres nombres son distintivos. */
function isSocialHost(hostname) {
  if (hostname === 't.co' || hostname.endsWith('.t.co')) return true;
  return SOCIAL_NAMES.some(name => hostname.includes(name));
}

/* Clasifica un toque de atribucion. Nunca lanza: un referrer corrupto
   cae a CHANNEL_UNKNOWN en vez de tumbar el envio del lead. */
function classifyChannel(touch) {
  if (!touch) return CHANNEL_UNKNOWN;

  if (ADS_KEYS.some(key => attrValue(touch, key))) return 'Google Ads';

  const utmSource = attrValue(touch, 'utm_source');
  if (utmSource) {
    const utmMedium = attrValue(touch, 'utm_medium');
    return utmMedium
      ? `Campaña: ${utmSource} / ${utmMedium}`
      : `Campaña: ${utmSource}`;
  }

  const referrer = attrValue(touch, 'referrer');
  if (referrer) {
    let hostname = '';
    try {
      hostname = new URL(referrer).hostname;
    } catch (err) {
      hostname = '';
    }
    if (hostname) {
      if (hostname.includes('google.')) return 'Búsqueda orgánica (Google)';
      if (hostname.includes('bing.'))   return 'Búsqueda orgánica (Bing)';
      if (isSocialHost(hostname))       return `Redes sociales (${hostname})`;
      return `Referencia: ${hostname}`;
    }
  }

  return CHANNEL_UNKNOWN;
}

/* Resumen plano y siempre completo: toda clave existe aunque el body no
   traiga attribution, para que quien lo consuma no tenga que verificar. */
function buildAttributionSummary(attribution) {
  return {
    canalPrimero:   classifyChannel(attribution?.first),
    canalUltimo:    classifyChannel(attribution?.last),
    primerToqueTs:  attribution?.first?.ts || '',
    ultimoToqueTs:  attribution?.last?.ts || '',
    landingPrimero: attribution?.first?.landing || '',
    campana:        attribution?.last?.utm_campaign
                    || attribution?.first?.utm_campaign
                    || ''
  };
}

/* ── CORREO ──────────────────────────────────────────────────────
   Todo en tablas y con estilos inline: Outlook (motor de Word) ignora
   las hojas de estilo, flexbox y grid. */
const MAIL_VERDE  = '#16A34A';
const MAIL_GRIS   = '#6B7280';
const MAIL_TINTA  = '#111827';
const MAIL_BORDE  = '#E5E7EB';
const MAIL_FUENTE = 'Arial, Helvetica, sans-serif';

function mailEnlace(href, texto) {
  return `<a href="${escapeHtml(href)}" style="color:${MAIL_VERDE};font-weight:bold;text-decoration:none;">${escapeHtml(texto)}</a>`;
}

/* wa.me se omite si el telefono no viene en formato internacional: un
   enlace mal armado abre un chat con un numero que no existe y el
   vendedor concluye que el lead no contesta. Los envios viejos (HTML en
   cache, sin combobox) llegan sin '+' y caen aqui. */
function mailAcciones(telefono, email) {
  const tel = telefono === undefined || telefono === null ? '' : String(telefono).trim();
  const digitos = tel.replace(/\D/g, '');
  const partes = [];

  if (tel.charAt(0) === '+' && digitos.length >= 8) {
    partes.push(mailEnlace(`https://wa.me/${digitos}`, 'Enviar WhatsApp'));
  }
  if (tel) {
    partes.push(mailEnlace(`tel:${tel}`, 'Llamar'));
  }
  if (email) {
    partes.push(mailEnlace(
      `mailto:${email}?subject=Steel%20Paint%20—%20seguimiento%20a%20tu%20solicitud`,
      'Responder por correo'
    ));
  }
  return partes.join(' · ');
}

/* Etiqueta gris arriba, valor en negro abajo. valorHtml ya viene escapado
   o es HTML armado aqui (los enlaces). */
function mailFila(etiqueta, valorHtml) {
  return `
              <tr>
                <td style="padding:0 0 14px 0;font-family:${MAIL_FUENTE};font-size:12px;line-height:1.4;color:${MAIL_GRIS};">
                  ${escapeHtml(etiqueta)}<br>
                  <span style="font-size:15px;line-height:1.5;color:${MAIL_TINTA};font-weight:bold;">${valorHtml}</span>
                </td>
              </tr>`;
}

function mailSeccion(contenido, fondo) {
  const estiloFondo = fondo ? `background:${fondo};` : '';
  return `
        <tr>
          <td style="${estiloFondo}padding:24px;border-top:1px solid ${MAIL_BORDE};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${contenido}
            </table>
          </td>
        </tr>`;
}

function mailTitulo(texto) {
  return `
              <tr>
                <td style="padding:0 0 14px 0;font-family:${MAIL_FUENTE};font-size:11px;line-height:1.4;color:${MAIL_GRIS};letter-spacing:0.08em;text-transform:uppercase;">
                  ${escapeHtml(texto)}
                </td>
              </tr>`;
}

function buildEmailHtml(flow, body, crm, attr) {
  /* WhatsApp solo captura nombre y telefono. Las demas filas se omiten en
     vez de salir vacias: una fila en blanco se lee como dato que falta, no
     como campo que no aplica a este flujo. */
  const esWhatsapp = flow === 'whatsapp';

  let contacto = mailFila('Nombre', escapeHtml(body.nombre));
  if (!esWhatsapp) contacto += mailFila('Empresa', escapeHtml(body.empresa));
  contacto += mailFila('Teléfono', escapeHtml(body.telefono));
  if (!esWhatsapp) {
    contacto += mailFila('Correo', escapeHtml(body.email));
    contacto += mailFila('Consentimiento', body.comms ? 'Sí' : 'No');
  }

  /* Destacada porque es lo unico que permite cruzar la conversacion de
     WhatsApp con este lead. Se muestra por presencia y no por flujo: solo
     este flujo la manda. */
  const referenciaSeccion = body.referencia
    ? mailSeccion(mailTitulo('Referencia') + `
              <tr>
                <td style="font-family:${MAIL_FUENTE};font-size:22px;line-height:1.3;font-weight:bold;color:${MAIL_TINTA};letter-spacing:0.02em;">
                  ${escapeHtml(body.referencia)}
                </td>
              </tr>`, '#F9FAFB')
    : '';

  const acciones = mailAcciones(body.telefono, body.email);
  const accionesSeccion = acciones
    ? mailSeccion(`
              <tr>
                <td style="font-family:${MAIL_FUENTE};font-size:15px;line-height:1.6;color:${MAIL_TINTA};">${acciones}</td>
              </tr>`)
    : '';

  const mensajeSeccion = body.mensaje
    ? mailSeccion(mailTitulo('Mensaje') + `
              <tr>
                <td style="font-family:${MAIL_FUENTE};font-size:15px;line-height:1.6;color:${MAIL_TINTA};">${escapeHtml(body.mensaje)}</td>
              </tr>`)
    : '';

  const cotizacionSeccion = flow === 'cotizacion'
    ? mailSeccion(mailTitulo('Datos de cotización') +
        mailFila('Largo', `${escapeHtml(body.largo)} m`) +
        mailFila('Ancho', `${escapeHtml(body.ancho)} m`) +
        mailFila('Caras', escapeHtml(body.caras)) +
        mailFila('Piezas', escapeHtml(body.piezas)) +
        mailFila('Total estimado', escapeHtml(body.total)))
    : '';

  /* El ultimo toque va destacado: es el que explica por que escribio hoy. */
  let origen = mailTitulo('Origen del lead') + `
              <tr>
                <td style="padding:0 0 14px 0;font-family:${MAIL_FUENTE};font-size:12px;line-height:1.4;color:${MAIL_GRIS};">
                  Último contacto<br>
                  <span style="font-size:18px;line-height:1.4;color:${MAIL_TINTA};font-weight:bold;">${escapeHtml(attr.canalUltimo)}</span>
                </td>
              </tr>` +
    mailFila('Primer contacto', escapeHtml(attr.canalPrimero));
  if (attr.campana) origen += mailFila('Campaña', escapeHtml(attr.campana));
  if (attr.landingPrimero) origen += mailFila('Página de entrada', escapeHtml(attr.landingPrimero));

  const crmSeccion = crm.ok
    ? ''
    : mailSeccion(`
              <tr>
                <td style="font-family:${MAIL_FUENTE};font-size:14px;line-height:1.6;color:#B91C1C;">
                  <strong>CRM:</strong> este lead NO entró a la plataforma — ${escapeHtml(crm.reason)}
                </td>
              </tr>`, '#FEF2F2');

  /* Documento completo y con charset declarado: los acentos del espanol
     dependen de el si el cliente de correo ignora la cabecera MIME. */
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(SUBJECT_BY_FLOW[flow])}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ${MAIL_BORDE};">
        <tr>
          <td style="background:${MAIL_VERDE};padding:24px;">
            <div style="font-family:${MAIL_FUENTE};font-size:26px;line-height:1.2;font-weight:bold;color:#FFFFFF;">Steel Paint</div>
            <div style="font-family:${MAIL_FUENTE};font-size:14px;line-height:1.4;color:#DCFCE7;padding-top:4px;">${escapeHtml(SUBJECT_BY_FLOW[flow])}</div>
          </td>
        </tr>${mailSeccion(contacto)}${referenciaSeccion}${accionesSeccion}${mensajeSeccion}${cotizacionSeccion}${mailSeccion(origen, '#F9FAFB')}${crmSeccion}
        <tr>
          <td style="padding:18px 24px;border-top:1px solid ${MAIL_BORDE};font-family:${MAIL_FUENTE};font-size:12px;line-height:1.5;color:${MAIL_GRIS};">
            Enviado desde steel-paint.com.mx
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* Aislado: nunca lanza. Devuelve { ok, reason } para que el asunto del
   correo pueda marcar el lead que no entro a la plataforma. */
async function sendToCrm(flow, payload) {
  const envName = CRM_ENV_BY_FLOW[flow];
  const url = process.env[envName];

  if (!url) {
    const reason = `falta ${envName}`;
    console.error(`[contact] CRM omitido (${flow}): ${reason}`);
    return { ok: false, reason };
  }

  /* Si falta el secreto se manda igual y el CRM contesta 401: ese 401
     queda en los logs y en el asunto del correo. Un envio que nunca
     ocurre no deja rastro de ningun lado. */
  const secretEnvName = CRM_SECRET_ENV_BY_FLOW[flow];
  const secret = process.env[secretEnvName];
  const headers = { 'Content-Type': 'application/json' };
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  } else {
    console.warn(`[contact] falta ${secretEnvName}; se envia sin Authorization (${flow})`);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CRM_TIMEOUT_MS)
    });

    if (!response.ok) {
      const reason = `HTTP ${response.status}`;
      console.error(`[contact] CRM fallo (${flow}): ${reason}`);
      return { ok: false, reason };
    }

    return { ok: true, reason: null };
  } catch (err) {
    const reason = err && err.name === 'TimeoutError'
      ? `timeout tras ${CRM_TIMEOUT_MS} ms`
      : `error de red: ${err && err.message ? err.message : 'desconocido'}`;
    console.error(`[contact] CRM fallo (${flow}): ${reason}`);
    return { ok: false, reason };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* Honeypot: campo oculto que solo un bot llena. Se descarta todo el
     envio en silencio, sin correo ni CRM, respondiendo como si hubiera
     salido bien. */
  const honeypot = req.body && req.body.sp_website;
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    console.warn('[contact] descartado por honeypot');
    return res.status(200).json({ success: true });
  }

  const { nombre, empresa } = req.body;

  const flow = resolveFlow(req.body);

  /* El CRM va antes del correo porque el asunto necesita saber si el
     lead entro. Esta aislado en sendToCrm(), asi que el correo sale
     igual pase lo que pase aqui. */
  /* Una sola vez por peticion: lo consumen el payload del CRM y el correo. */
  const attr = buildAttributionSummary(req.body.attribution);

  const crm = await sendToCrm(flow, buildCrmPayload(flow, req.body, attr));

  const html = buildEmailHtml(flow, req.body, crm, attr);

  /* WhatsApp no manda empresa: componer a ciegas dejaba el asunto en
     "... / undefined". Se arma con las partes que de verdad llegaron. */
  const quien = [nombre, empresa]
    .map(v => (v === undefined || v === null ? '' : String(v).trim()))
    .filter(Boolean)
    .join(' / ');
  const baseSubject = quien
    ? `${SUBJECT_BY_FLOW[flow]}: ${quien}`
    : SUBJECT_BY_FLOW[flow];
  const subject = crm.ok ? baseSubject : `[CRM-ERROR] ${baseSubject}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Steel Paint <contacto@mail.steel-paint.com.mx>',
        to: ['hola@scndal.com', 'marcelo.steelpaint@gmail.com', 'marcelo@steel-paint.com.mx', 'andrea.r@scndal.com', 'michel.l@scndal.com'],
        subject: subject,
        html: html
      })
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: 'Error enviando email' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Error enviando email' });
  }
}
