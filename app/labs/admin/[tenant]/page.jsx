import { notFound, redirect } from 'next/navigation';
import { isLabsAdminAuthorized } from '@/lib/labs/auth';
import { getTenantMeta } from '@/lib/labs/tenants';
import LabsAdminTenantDetail from './LabsAdminTenantDetail';

export default async function LabsAdminTenantPage({ params }) {
  if (!(await isLabsAdminAuthorized())) {
    redirect('/labs/login');
  }

  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  return <LabsAdminTenantDetail tenant={tenant} tenantMeta={meta} />;
}
