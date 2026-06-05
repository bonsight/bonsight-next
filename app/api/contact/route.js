import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, service, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Log submission (replace with email service when configured)
    console.log('[Contact Form]', { name, email, service, message, ts: new Date().toISOString() });

    // If RESEND_API_KEY is configured, send email
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Bonsight Web <noreply@bonsight.co>',
          to: [process.env.CONTACT_EMAIL || 'sales@bonsight.co'],
          subject: `Nuevo contacto: ${name} — ${service || 'sin servicio'}`,
          text: `Nombre: ${name}\nEmail: ${email}\nServicio: ${service || '—'}\n\nMensaje:\n${message}`,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Contact Form] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
