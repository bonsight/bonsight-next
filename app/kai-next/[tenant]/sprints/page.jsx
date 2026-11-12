import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';

// El tablero general de Sprints (sobre Notion) se retiró: los sprints viven dentro de cada
// Proyecto de Desarrollo. La dirección antigua lleva a Proyectos.
export default async function KaiNextSprintsPage({ params }) {
  const { tenant } = await params;
  const basePath = kaiNextBasePath((await headers()).get('host') ?? '');
  redirect(`${basePath}/${tenant}/proyectos`);
}
