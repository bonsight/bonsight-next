import { isLabsAdminAuthorized } from '@/lib/labs/auth';
import { redirect } from 'next/navigation';
import LabsAdminDashboard from './LabsAdminDashboard';

export default async function LabsAdminPage() {
  if (!(await isLabsAdminAuthorized())) {
    redirect('/labs/login');
  }

  return <LabsAdminDashboard />;
}
