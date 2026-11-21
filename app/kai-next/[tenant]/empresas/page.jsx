import { getTenantMeta } from '@/lib/kai/tenants';
import { renderEmpresasPage } from './renderEmpresasPage';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return { title: meta ? `Empresas · ${meta.name}` : 'Empresas', robots: { index: false, follow: false } };
}

export default function KaiNextEmpresasPage(props) {
  return renderEmpresasPage(props);
}
