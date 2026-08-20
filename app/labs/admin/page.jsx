import { isLabsAdminAuthorized } from '@/lib/labs/auth';
import { redirect } from 'next/navigation';
import LabsAdminList from './LabsAdminList';

export default async function LabsAdminPage() {
  if (!(await isLabsAdminAuthorized())) {
    redirect('/labs/login');
  }

  return <LabsAdminList />;
}
