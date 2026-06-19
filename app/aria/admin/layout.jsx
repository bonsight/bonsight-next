import { getAllTenantsMeta } from '@/lib/kai/tenants';
import AriaAdminShell from './AriaAdminShell';

export const metadata = {
  title: 'Aria Admin — Bonsight',
  robots: { index: false, follow: false },
};

export default async function AriaAdminLayout({ children }) {
  const tenants = await getAllTenantsMeta();
  return <AriaAdminShell tenants={tenants}>{children}</AriaAdminShell>;
}
