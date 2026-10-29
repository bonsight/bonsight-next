'use client';

import { useState, useEffect } from 'react';
import KaiNextSidebar from '../KaiNextSidebar';
import { EquipoTab, CostsTab } from '@/app/kai/admin/[tenant]/TenantDetail';
import KaiNextAdminFuentes from './KaiNextAdminFuentes';

// Equipo y Costos IA se reusan tal cual del admin legacy de Kai (TenantDetail.jsx) — Kai Next
// es ahora el admin real, así que no hace falta forkear: estos componentes se van a seguir
// rediseñando acá directamente (ver feedback del rediseño en KaiNextAdminFuentes.jsx).
import '@/app/kai/admin/admin.css';
// KnowledgeSourcesTab usa clases ks-* (formulario/filas de fuentes) que viven en kai.css, no en
// admin.css — ninguna colisiona con knx-* (Kai Next no reusa ese prefijo), así que es seguro
// importarlo entero en vez de ir copiando regla por regla cada vez que falte una.
import '@/app/kai/kai.css';

const TABS = [
  { id: 'fuentes', label: 'Fuentes' },
  { id: 'equipo', label: 'Equipo' },
  { id: 'costos', label: 'Costos IA' },
];

export default function KaiNextAdminShell({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser,
  tenantUsage, usageEvents, dailyUsage,
}) {
  const [activeTab, setActiveTab] = useState('fuentes');
  const [chats, setChats] = useState([]);
  const [loggingOut, setLoggingOut] = useState(false);

  // Mismo historial de chat que ven el resto de las páginas de Kai Next (Fuentes, Empresa…) —
  // el sidebar es compartido, así que el admin también lo necesita para no mostrarlo vacío.
  useEffect(() => {
    fetch(`/api/kai-next/${tenant}`)
      .then((r) => r.json())
      .then((d) => setChats(d.conversations ?? []))
      .catch(() => {});
  }, [tenant]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (isTeamUser) await fetch('/api/team/logout', { method: 'POST' });
      else await fetch(`/api/kai/${tenant}/tenant-users/me`, { method: 'DELETE' });
    } finally {
      window.location.href = `${basePath}/${tenant}`;
    }
  };

  return (
    <div className="knx-shell">
      <KaiNextSidebar
        tenant={tenant} tenantName={tenantName} userName={userName} userHandle={userHandle}
        isTeamUser={isTeamUser} isAdmin basePath={basePath} chats={chats}
        onLogout={handleLogout} loggingOut={loggingOut} active="admin"
      />

      <main className="knx-main">
        <div className="knx-admin">
          <h1>Admin · {tenantName}</h1>

          <div className="knx-admin-shell">
            <div className="knx-admin-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`knx-admin-tab${activeTab === t.id ? ' knx-admin-tab--active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="knx-admin-tab-content">
              {activeTab === 'fuentes' && <KaiNextAdminFuentes tenant={tenant} />}
              {activeTab === 'equipo' && <EquipoTab slug={tenant} hideProjectsDrive />}
              {activeTab === 'costos' && <CostsTab slug={tenant} usage={tenantUsage} events={usageEvents} dailyUsage={dailyUsage} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
