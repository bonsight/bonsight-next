'use client';

import { useState, useEffect } from 'react';
import KaiNextSidebar from '../KaiNextSidebar';
import { CostsTab } from '@/app/kai/admin/[tenant]/TenantDetail';
import KaiNextAdminFuentes from './KaiNextAdminFuentes';
import KaiNextAdminEmpresas from './KaiNextAdminEmpresas';
import KaiNextAdminRoles from './KaiNextAdminRoles';
import KaiNextAdminEquipo from './KaiNextAdminEquipo';

// Equipo y Costos IA se reusan tal cual del admin legacy de Kai (TenantDetail.jsx) — Kai Next
// es ahora el admin real, así que no hace falta forkear: estos componentes se van a seguir
// rediseñando acá directamente (ver feedback del rediseño en KaiNextAdminFuentes.jsx).
import '@/app/kai/admin/admin.css';
// KnowledgeSourcesTab usa clases ks-* (formulario/filas de fuentes) que viven en kai.css, no en
// admin.css — ninguna colisiona con knx-* (Kai Next no reusa ese prefijo), así que es seguro
// importarlo entero en vez de ir copiando regla por regla cada vez que falte una.
import '@/app/kai/kai.css';

// adminScope 'team' (ej. directores de Sesuveca) ve solo Equipo y Empresas; 'full', todo. Ver
// getKaiNextAdminScope en lib/kaiNext/auth.js.
const TABS = [
  { id: 'fuentes', label: 'Fuentes', scopes: ['full'] },
  { id: 'empresas', label: 'Empresas', scopes: ['full', 'team'] },
  { id: 'equipo', label: 'Equipo', scopes: ['full', 'team'] },
  { id: 'costos', label: 'Costos IA', scopes: ['full'] },
];

export default function KaiNextAdminShell({
  tenant, tenantName, basePath, userName, userHandle, isTeamUser, adminScope = 'full',
  tenantUsage, usageEvents, dailyUsage,
}) {
  const tabs = TABS.filter((t) => t.scopes.includes(adminScope));
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  // Roles y Equipo se recargan juntos: editar un rol puede cambiarle el acceso a varias personas.
  const [equipoReload, setEquipoReload] = useState(0);
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
              {tabs.map((t) => (
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
              {activeTab === 'empresas' && <KaiNextAdminEmpresas tenant={tenant} />}
              {activeTab === 'equipo' && (
                <KaiNextAdminEquipo
                  tenant={tenant}
                  reloadKey={equipoReload}
                  rolesSlot={adminScope === 'full' ? <KaiNextAdminRoles tenant={tenant} onChanged={() => setEquipoReload((k) => k + 1)} /> : null}
                />
              )}
              {activeTab === 'costos' && <CostsTab slug={tenant} usage={tenantUsage} events={usageEvents} dailyUsage={dailyUsage} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
