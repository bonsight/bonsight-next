// HTML de los emails transaccionales de Labs — separado de gmail.js (que solo sabe mandar
// mensajes) para no mezclar el armado de contenido con el transporte.

// eventTitle/eventBody/projectName vienen de contenido escrito por usuarios (feedback, nombres
// de tarea, etc.) — hay que escaparlo antes de insertarlo en el HTML del correo.
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// El código va grande y arriba de todo — es lo que la persona busca al abrir el correo, no
// el texto de alrededor (mismo patrón que cualquier email de "código de verificación").
//
// La marca visible para quien recibe el correo es solo la del tenant (SESUVECA, etc.) — Bonsight
// queda como "Powered by" al pie, ya que es la plataforma detrás y no la dueña de la cuenta.
export function forgotPasswordEmailHtml({ name, code, resetUrl, tenantName }) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#2b2318;text-align:center;">
      <img src="https://labs.bonsight.co/assets/bonsight-isotipo.png" alt="Bonsight" width="56" height="45" style="margin-bottom:14px;" />
      <p style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#2b2318;margin:0 0 22px;">${tenantName}</p>
      <p style="font-size:14.5px;line-height:1.6;margin:0 0 4px;">Hola${name ? `, ${name}` : ''} — usa este código para restablecer tu contraseña de ${tenantName}:</p>
      <p style="font-size:38px;font-weight:700;letter-spacing:.06em;color:#3fae6a;margin:16px 0 6px;">${code}</p>
      <p style="font-size:12.5px;color:#8a7c68;margin:0 0 22px;">Vale por 15 minutos.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#2f9e5c;color:#ffffff;text-decoration:none;font-weight:600;font-size:13.5px;padding:12px 22px;border-radius:8px;">Continuar con este código →</a>
      <div style="text-align:left;margin:28px 0 0;padding:14px 16px;border:1px solid #e6ddc9;border-radius:10px;font-size:12.5px;line-height:1.6;color:#5c5344;">
        <strong style="color:#2b2318;">Nunca compartas este código</strong> con nadie, ni siquiera con alguien que diga ser de soporte de ${tenantName}. Si no fuiste tú quien lo pidió, simplemente ignora este correo.
      </div>
      <p style="font-size:11px;color:#a89a89;margin:24px 0 0;border-top:1px solid #ece4d2;padding-top:16px;">Powered by Bonsight · <a href="mailto:sales@bonsight.co" style="color:#a89a89;">¿Necesitas ayuda?</a></p>
    </div>
  `;
}

// Login sin contraseña (Kai Next) — un solo link, sin código: acá no hay nada que la persona
// tenga que copiar o recordar, solo tocar el botón dentro de los 15 minutos.
export function magicLoginEmailHtml({ name, loginUrl, tenantName }) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#2b2318;text-align:center;">
      <img src="https://kai.bonsight.co/assets/bonsight-isotipo.png" alt="Bonsight" width="56" height="45" style="margin-bottom:14px;" />
      <p style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#2b2318;margin:0 0 22px;">${tenantName}</p>
      <p style="font-size:14.5px;line-height:1.6;margin:0 0 22px;">Hola${name ? `, ${name}` : ''} — toca el botón para entrar a Kai, sin contraseña:</p>
      <a href="${loginUrl}" style="display:inline-block;background:#2f9e5c;color:#ffffff;text-decoration:none;font-weight:600;font-size:13.5px;padding:12px 26px;border-radius:8px;">Entrar a Kai →</a>
      <p style="font-size:12.5px;color:#8a7c68;margin:18px 0 0;">Este enlace vale por 15 minutos y sirve una sola vez.</p>
      <div style="text-align:left;margin:28px 0 0;padding:14px 16px;border:1px solid #e6ddc9;border-radius:10px;font-size:12.5px;line-height:1.6;color:#5c5344;">
        Si no fuiste tú quien lo pidió, simplemente ignora este correo — nadie puede entrar sin este enlace.
      </div>
      <p style="font-size:11px;color:#a89a89;margin:24px 0 0;border-top:1px solid #ece4d2;padding-top:16px;">Powered by Bonsight · <a href="mailto:sales@bonsight.co" style="color:#a89a89;">¿Necesitas ayuda?</a></p>
    </div>
  `;
}

// Un solo template para cualquier hito de la Historia (feedback, tarea, aporte, documento,
// gasto, reporte) — lo que cambia de un tipo a otro es solo el título/cuerpo/label del botón
// que le pasa lib/labs/notifications.js, no el diseño del correo.
export function labsEventEmailHtml({ name, tenantName, projectName, eventTitle, eventBody, actionUrl, actionLabel }) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:460px;margin:0 auto;padding:32px 24px;color:#2b2318;">
      <div style="text-align:center;">
        <img src="https://labs.bonsight.co/assets/bonsight-isotipo.png" alt="Bonsight" width="56" height="45" style="margin-bottom:14px;" />
        <p style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#2b2318;margin:0 0 4px;">${escapeHtml(tenantName)}</p>
        <p style="font-size:12.5px;color:#8a7c68;margin:0 0 22px;">${escapeHtml(projectName)}</p>
      </div>
      <p style="font-size:14.5px;line-height:1.6;margin:0 0 16px;">Hola${name ? `, ${escapeHtml(name)}` : ''} —</p>
      <div style="text-align:left;padding:14px 16px;border:1px solid #e6ddc9;border-radius:10px;margin:0 0 22px;">
        <p style="font-size:14.5px;font-weight:600;line-height:1.5;margin:0;color:#2b2318;">${escapeHtml(eventTitle)}</p>
        ${eventBody ? `<p style="font-size:13.5px;line-height:1.6;margin:8px 0 0;color:#5c5344;white-space:pre-wrap;">${escapeHtml(eventBody)}</p>` : ''}
      </div>
      <div style="text-align:center;">
        <a href="${actionUrl}" style="display:inline-block;background:#2f9e5c;color:#ffffff;text-decoration:none;font-weight:600;font-size:13.5px;padding:12px 24px;border-radius:8px;">${escapeHtml(actionLabel || 'Ver en Labs →')}</a>
      </div>
      <p style="font-size:11px;color:#a89a89;margin:28px 0 0;border-top:1px solid #ece4d2;padding-top:16px;text-align:center;">Powered by Bonsight · <a href="mailto:sales@bonsight.co" style="color:#a89a89;">¿Necesitas ayuda?</a></p>
    </div>
  `;
}
