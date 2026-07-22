import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTenantMeta } from '@/lib/kai/tenants';
import { isAuthorizedForTenant } from '@/lib/aria/auth';
import SprintBoardPresentation from '../../components/SprintBoardPresentation';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return {
    title: meta ? `Sprint · ${meta.name}` : 'Sprint',
    robots: { index: false, follow: false },
  };
}

export default async function AriaBoardPage({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  if (!meta) notFound();

  if (!(await isAuthorizedForTenant(tenant))) {
    redirect(`/aria/${tenant}`);
  }

  return (
    <div className="aria-layout">
      <div className="aria-page">
        <header className="aria-header">
          <div className="aria-header-brand">
            <Link href={`/aria/${tenant}`} className="aria-header-menu-btn" aria-label="Volver a Aria">
              ←
            </Link>
            <div>
              <p className="aria-header-title">
                <span className="aria-gradient-text">Sprint</span>
                <span style={{ color: 'var(--aria-text-muted, #6B7280)', fontWeight: 400 }}>
                  {' · '}{meta.name}
                </span>
              </p>
            </div>
          </div>
        </header>
        <div className="aria-messages">
          <SprintBoardPresentation tenant={tenant} />
        </div>
      </div>
    </div>
  );
}
