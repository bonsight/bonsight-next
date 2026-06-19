import { notFound } from 'next/navigation';
import { getTenantMeta, getBusinessProfile } from '@/lib/kai/tenants';
import { listConversations } from '@/lib/kai/memory';
import { listInvestigations, getInvestigation } from '@/lib/aria/memory';
import AriaAdminDetail from './AriaAdminDetail';

export async function generateMetadata({ params }) {
  const { tenant } = await params;
  const meta = await getTenantMeta(tenant);
  return { title: meta ? `${meta.name} — Aria Admin` : 'Aria Admin' };
}

export default async function AriaAdminTenantPage({ params }) {
  const { tenant } = await params;

  const [meta, profile, conversations, ariaInvestigations] = await Promise.all([
    getTenantMeta(tenant),
    getBusinessProfile(tenant),
    listConversations(tenant),
    listInvestigations(tenant),
  ]);

  if (!meta) notFound();

  let ariaLastMessages = [];
  if (ariaInvestigations.length > 0) {
    const lastInv = await getInvestigation(tenant, ariaInvestigations[0].id);
    ariaLastMessages = lastInv?.messages ?? [];
  }

  return (
    <AriaAdminDetail
      meta={meta}
      profile={profile}
      conversations={conversations}
      ariaInvestigations={ariaInvestigations}
      ariaLastMessages={ariaLastMessages}
    />
  );
}
