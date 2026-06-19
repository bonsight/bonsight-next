import { getAllTenantsMeta } from '@/lib/kai/tenants';
import AdminShell from './AdminShell';
import './admin.css';

export const metadata = {
  title: 'Kai Admin — Bonsight',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  const tenants = await getAllTenantsMeta();
  return <AdminShell tenants={tenants}>{children}</AdminShell>;
}
