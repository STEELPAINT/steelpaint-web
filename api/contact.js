export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, empresa, telefono, email, mensaje, largo, ancho, caras, piezas, total } = req.body;

  const hasCalc = largo !== undefined && ancho !== undefined;
  const mensajeSection = mensaje
    ? `<p><strong>Mensaje:</strong> ${mensaje}</p>`
    : '';
  const calcSection = hasCalc
    ? `
        <h3 style="margin-top:1.5rem;">Datos de cotización</h3>
        <p><strong>Largo:</strong> ${largo} m</p>
        <p><strong>Ancho:</strong> ${ancho} m</p>
        <p><strong>Caras:</strong> ${caras}</p>
        <p><strong>Piezas:</strong> ${piezas}</p>
        <p><strong>Total estimado:</strong> ${total}</p>
      `
    : '';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Steel Paint <contacto@mail.steel-paint.com.mx>',
      to: ['hola@scndal.com', 'marcelo.steelpaint@gmail.com', 'marcelo@steel-paint.com.mx'],
      subject: hasCalc
        ? `Actualización de lead: ${nombre} / ${empresa}`
        : mensaje
          ? `Nuevo lead: ${nombre} / ${empresa}`
          : `Registro en calculadora: ${nombre} / ${empresa}`,
      html: `
        <h2>Nuevo mensaje desde steel-paint.com.mx</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Empresa:</strong> ${empresa}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${mensajeSection}
        ${calcSection}
      `
    })
  });

  if (response.ok) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(500).json({ error: 'Error enviando email' });
  }
}
