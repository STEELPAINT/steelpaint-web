export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, empresa, telefono, email, mensaje } = req.body;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Steel Paint <contacto@mail.steel-paint.com.mx>',
      to: 'marcelo.steelpaint@gmail.com',
      subject: `Nuevo lead: ${nombre} / ${empresa}`,
      html: `
        <h2>Nuevo mensaje desde steel-paint.com.mx</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Empresa:</strong> ${empresa}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong> ${mensaje}</p>
      `
    })
  });

  if (response.ok) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(500).json({ error: 'Error enviando email' });
  }
}
