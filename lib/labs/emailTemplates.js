// HTML de los emails transaccionales de Labs — separado de gmail.js (que solo sabe mandar
// mensajes) para no mezclar el armado de contenido con el transporte.

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
