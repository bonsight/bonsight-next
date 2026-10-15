import { redirect } from 'next/navigation';

// La lógica real vive en app/api/kai-next/[tenant]/magic-login/route.js (un Route Handler, no
// una página — necesita poder setear la cookie de sesión, algo prohibido en el render de un
// Server Component). Esta página solo reenvía ahí, así los enlaces ya mandados por email (que
// apuntan acá) siguen funcionando sin tener que reenviar nada.
export default async function KaiNextMagicLoginPage({ params, searchParams }) {
  const { tenant } = await params;
  const sp = await searchParams;
  const token = String(sp?.token ?? '');
  redirect(`/api/kai-next/${tenant}/magic-login?token=${encodeURIComponent(token)}`);
}
