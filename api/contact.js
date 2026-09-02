/* Timeout del CRM. 8s porque el proyecto corre con tráfico bajo y el
   arranque en frío es lo normal: con menos, [CRM-ERROR] marcaría leads
   que sí entraron y la marca dejaría de ser señal. */
const CRM_TIMEOUT_MS = 8000;

/* Mapeo rígido flujo → variable de entorno. Sin fallback entre flujos:
   si falta la que toca, ese lead no se manda al CRM. */
const CRM_ENV_BY_FLOW = {
  contacto:    'CRM_URL_CONTACTO',
  calculadora: 'CRM_URL_CALCULADORA',
  cotizacion:  'CRM_URL_COTIZACION'
};

const SUBJECT_BY_FLOW = {
  contacto:    'Nuevo lead',
  calculadora: 'Registro en calculadora',
  cotizacion:  'Actualización de lead'
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
  const guess = (body.largo !== undefined && body.ancho !== undefined)
    ? 'cotizacion'
    : (Object.prototype.hasOwnProperty.call(body, 'mensaje') ? 'contacto' : 'calculadora');
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
function buildCrmPayload(flow, body) {
  const payload = {};
  put(payload, 'nombre',   body.nombre);
  put(payload, 'empresa',  body.empresa);
  put(payload, 'telefono', body.telefono);
  put(payload, 'email',    body.email);
  put(payload, 'mensaje',  body.mensaje);
  payload.comms = body.comms ? 'Sí' : 'No';
  put(payload, 'gclid',    body.gclid);
  if (flow === 'cotizacion') {
    put(payload, 'largo',  body.largo);
    put(payload, 'ancho',  body.ancho);
    put(payload, 'caras',  body.caras);
    put(payload, 'piezas', body.piezas);
    put(payload, 'total',  body.total);
  }
  return payload;
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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  const { nombre, empresa, telefono, email, mensaje, largo, ancho, caras, piezas, total, gclid, comms } = req.body;

  const flow = resolveFlow(req.body);

  /* El CRM va antes del correo porque el asunto necesita saber si el
     lead entro. Esta aislado en sendToCrm(), asi que el correo sale
     igual pase lo que pase aqui. */
  const crm = await sendToCrm(flow, buildCrmPayload(flow, req.body));

  const mensajeSection = mensaje
    ? `<p><strong>Mensaje:</strong> ${escapeHtml(mensaje)}</p>`
    : '';
  const calcSection = flow === 'cotizacion'
    ? `
        <h3 style="margin-top:1.5rem;">Datos de cotización</h3>
        <p><strong>Largo:</strong> ${largo} m</p>
        <p><strong>Ancho:</strong> ${ancho} m</p>
        <p><strong>Caras:</strong> ${caras}</p>
        <p><strong>Piezas:</strong> ${piezas}</p>
        <p><strong>Total estimado:</strong> ${total}</p>
      `
    : '';
  const crmSection = crm.ok
    ? ''
    : `<p style="margin-top:1.5rem;color:#c0392b;"><strong>CRM:</strong> este lead NO entró a la plataforma — ${escapeHtml(crm.reason)}</p>`;

  const baseSubject = `${SUBJECT_BY_FLOW[flow]}: ${nombre} / ${empresa}`;
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
        html: `
        <h2>Nuevo mensaje desde steel-paint.com.mx</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
        <p><strong>Empresa:</strong> ${escapeHtml(empresa)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(telefono)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Gclid:</strong> ${gclid ? escapeHtml(gclid) : 'N/A (no vino de clic en Ads)'}</p>
        <p><strong>Consentimiento:</strong> ${comms ? 'Sí' : 'No'}</p>
        ${mensajeSection}
        ${calcSection}
        ${crmSection}
      `
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
