import { getTenantMeta } from '@/lib/kai/tenants';
import { getEmpresa } from '@/lib/kaiNext/empresas';
import { renderEmpresasPage } from '../renderEmpresasPage';

export async function generateMetadata({ params }) {
  const { tenant, empresaId } = await params;
  const [meta, empresa] = await Promise.all([getTenantMeta(tenant), getEmpresa(tenant, empresaId)]);
  return { title: empresa ? `${empresa.name} · ${meta?.name ?? ''}` : 'Empresa', robots: { index: false, follow: false } };
}

export default function KaiNextEmpresaPage(props) {
  return renderEmpresasPage(props);
}
