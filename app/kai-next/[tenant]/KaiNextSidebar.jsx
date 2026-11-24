'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEmpresaScope } from '@/lib/kaiNext/useEmpresaScope';
import KaiNextUserMenu from './KaiNextUserMenu';

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}

function groupChatsByDate(chats) {
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const groups = { Hoy: [], 'Esta semana': [], Anterior: [] };
  for (const c of chats) {
    const t = new Date(c.updatedAt ?? c.createdAt ?? now).getTime();
    if (t >= startOfToday) groups['Hoy'].push(c);
    else if (t >= weekAgo) groups['Esta semana'].push(c);
    else groups['Anterior'].push(c);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

// Compartido entre el chat (KaiNextClientChat) y cualquier otra superficie (Conocimiento,
// y lo que venga después) — mismo sidebar, mismo historial, solo cambia qué link del nav
// está activo y qué pasa al tocar "Nuevo chat"/un chat de la lista.
export default function KaiNextSidebar({
  tenant, tenantName, userName, userHandle, isTeamUser, isAdmin, basePath,
  chats = [], activeChatId = null, onNewChat, onOpenChat, onDeleteChat, onLogout, loggingOut,
  active = 'chat',
}) {
  const navLinkClass = (id) => `knx-nav-link${active === id ? ' knx-nav-link--active' : ''}`;
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get('p');

  // Rollout por tiers (ver lib/kaiNext/capabilities.js) — si el admin apagó una sección para
  // este tenant, el link ni se muestra. Se consulta acá (no vía props) para no tener que
  // enchufar esto en cada page.jsx que ya renderiza el sidebar.
  const [sections, setSections] = useState(null); // null = todavía sin cargar, se asume todo visible
  // Admin: no todas las páginas pasan isAdmin, así que también sale de esta misma consulta.
  const [adminFromAccess, setAdminFromAccess] = useState(false);
  useEffect(() => {
    fetch(`/api/kai-next/${tenant}/capabilities`)
      .then((r) => r.json())
      .then((d) => { setSections(d.access?.sections ?? []); setAdminFromAccess(!!d.isAdmin); })
      .catch(() => null);
  }, [tenant]);
  const showSection = (id) => !sections?.length || sections.includes(id);

  // Empresas (lib/kaiNext/empresas.js): solo si el tenant tiene empresas asignadas a esta persona.
  // Con empresas, el nav muestra "Empresas" (proyectos agrupados por empresa) en vez de
  // "Proyectos", y la sección del perfil de negocio pasa a llamarse "Perfil".
  const emp = useEmpresaScope(tenant);
  const [scopeOpen, setScopeOpen] = useState(false);
  const scopeName = emp.scope === 'all' ? 'Todas mis empresas' : (emp.empresas.find((e) => e.id === emp.scope)?.name ?? 'Todas mis empresas');
  const activeEmpresaId = active.startsWith('empresa:') ? active.slice(8) : null;

  // Celular: la barra lateral es un menú que se abre desde la barra superior.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Lista de proyectos directo en el sidebar — para no tener que entrar a Proyectos y esperar
  // a que cargue solo para elegir uno o crear uno nuevo. Mismo criterio que `sections` arriba:
  // se consulta acá, no por prop, así cualquier página que use este sidebar lo tiene gratis.
  const [projects, setProjects] = useState(null);
  const [canCreateProject, setCanCreateProject] = useState(false);
  useEffect(() => {
    if (!showSection('proyectos')) return;
    fetch(`/api/kai-next/${tenant}/projects`)
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setCanCreateProject(!!d.level?.isSupervisorLevel); })
      .catch(() => null);
  }, [tenant, sections]); // eslint-disable-line react-hooks/exhaustive-deps

  const projectsInScope = (projects ?? []).filter((p) => !emp.hasEmpresas || emp.scope === 'all' || p.empresaId === emp.scope);
  const groups = emp.hasEmpresas
    ? [
      ...emp.selectable.filter((e) => emp.scope === 'all' || e.id === emp.scope)
        .map((e) => ({ empresa: e, items: projectsInScope.filter((p) => p.empresaId === e.id) })),
      ...(projectsInScope.some((p) => !p.empresaId) ? [{ empresa: null, items: projectsInScope.filter((p) => !p.empresaId) }] : []),
    ].filter((g) => g.items.length)
    : [{ empresa: null, items: projectsInScope }];

  return (
    <>
    <div className="knx-mobile-bar">
      <button type="button" className="knx-mobile-menu-btn" aria-label="Abrir menú" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <span className="knx-mobile-title">
        <img src="/assets/bonsight-isotipo.svg" alt="" width="20" height="11" />
        Kai · {tenantName}
      </span>
      {emp.hasEmpresas && <span className="knx-mobile-scope">{scopeName}</span>}
    </div>
    {menuOpen && <div className="knx-sidebar-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
    <aside className={`knx-sidebar${menuOpen ? ' knx-sidebar--open' : ''}`}>
      <button type="button" className="knx-sidebar-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>×</button>
      <div className="knx-sidebar-top">
        <div className="knx-brand">
          <img src="/assets/bonsight-isotipo.svg" alt="" width="22" height="12" />
          Kai
        </div>
        <div className="knx-tenant-chip knx-tenant-chip--static">
          <span className="knx-tenant-avatar">{initials(tenantName)[0]}</span>
          <span className="knx-tenant-name">{tenantName}</span>
        </div>
        {emp.hasEmpresas && emp.selectable.length > 0 && (
          <div className="knx-scope">
            <button
              type="button"
              className="knx-scope-btn"
              aria-haspopup="menu"
              aria-expanded={scopeOpen}
              disabled={emp.fixed}
              onClick={() => setScopeOpen((v) => !v)}
            >
              <small>Viendo</small>
              <span className="knx-scope-name">{scopeName}</span>
              {!emp.fixed && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>}
            </button>
            {scopeOpen && !emp.fixed && (
              <>
                <div className="knx-scope-scrim" onClick={() => setScopeOpen(false)} aria-hidden="true" />
                <div className="knx-scope-pop" role="menu">
                  <button type="button" role="menuitemradio" aria-checked={emp.scope === 'all'} onClick={() => { emp.setScope('all'); setScopeOpen(false); }}>
                    <span className="knx-scope-sw knx-scope-sw--all" />Todas mis empresas
                    <em>{emp.selectable.reduce((n, e) => n + e.projectCount, 0)}</em>
                  </button>
                  <hr />
                  {emp.selectable.map((e) => (
                    <button key={e.id} type="button" role="menuitemradio" aria-checked={emp.scope === e.id} onClick={() => { emp.setScope(e.id); setScopeOpen(false); }}>
                      <span className="knx-scope-sw" style={{ background: e.color }} />{e.name}<em>{e.projectCount}</em>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {showSection('chat') && (onNewChat ? (
          <button className="knx-new-chat" onClick={onNewChat} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nuevo chat
          </button>
        ) : (
          <a className="knx-new-chat" href={`${basePath}/${tenant}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Nuevo chat
          </a>
        ))}
      </div>

      <nav className="knx-sidebar-nav">
        {showSection('empresa') && (
          <a className={navLinkClass('empresa')} href={`${basePath}/${tenant}/empresa`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" /><path d="M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></svg>
            {emp.hasEmpresas ? 'Perfil' : 'Empresa'}
          </a>
        )}
        {showSection('fuentes') && (
          <a className={navLinkClass('fuentes')} href={`${basePath}/${tenant}/fuentes`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></svg>
            Fuentes
          </a>
        )}
        {showSection('analisis') && (
          <a className={navLinkClass('analisis')} href={`${basePath}/${tenant}/analisis`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></svg>
            Análisis
          </a>
        )}
        {showSection('activities') && (
          <a className={navLinkClass('activities')} href={`${basePath}/${tenant}/activities`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            Activities
          </a>
        )}
        {showSection('proyectos') && (
          <a
            className={emp.hasEmpresas ? `knx-nav-link${active === 'empresas' || activeEmpresaId ? ' knx-nav-link--active' : ''}` : navLinkClass('proyectos')}
            href={`${basePath}/${tenant}/${emp.hasEmpresas ? 'empresas' : 'proyectos'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            {emp.hasEmpresas ? 'Empresas' : 'Proyectos'}
          </a>
        )}
        {showSection('proyectos') && projectsInScope.length > 0 && (
          <div className="knx-sidebar-sublist">
            {groups.map((g) => (
              <div key={g.empresa?.id ?? 'none'}>
                {emp.hasEmpresas && (g.empresa ? (
                  <a className={`knx-sidebar-group${g.empresa.id === activeEmpresaId ? ' knx-sidebar-group--active' : ''}`} href={`${basePath}/${tenant}/empresas/${g.empresa.id}`} title={`Resumen de ${g.empresa.name}`}>
                    <span className="knx-scope-sw" style={{ background: g.empresa.color }} />{g.empresa.name}
                  </a>
                ) : <span className="knx-sidebar-group knx-sidebar-group--plain">Sin empresa</span>)}
                {g.items.map((p) => (
                  <a
                    key={p.id}
                    className={`knx-sidebar-subitem${p.id === activeProjectId ? ' knx-sidebar-subitem--active' : ''}`}
                    href={`${basePath}/${tenant}/proyectos?p=${p.id}`}
                  >
                    {p.name}
                  </a>
                ))}
              </div>
            ))}
          </div>
        )}
        {showSection('proyectos') && canCreateProject && (
          <a className="knx-sidebar-subitem knx-sidebar-subitem--add" href={`${basePath}/${tenant}/proyectos?new=1`}>
            + Nuevo proyecto
          </a>
        )}
        {/* Meetings solo existe para Proyecto de Desarrollo, que a su vez solo existe bajo el
            tenant bonsight (ver lib/kaiNext/projects.js) — mostrarlo en otros tenants llevaría
            a una pantalla sin ningún proyecto para elegir. */}
        {tenant === 'bonsight' && showSection('reuniones') && (
          <a className={navLinkClass('meetings')} href={`${basePath}/${tenant}/meetings`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            Reuniones
          </a>
        )}
      </nav>

      <div className="knx-chat-list">
        {groupChatsByDate(chats).map(([label, items]) => (
          <div key={label}>
            <div className="knx-chat-group-label">{label}</div>
            {items.map((c) => (
              <div key={c.id} className="knx-chat-row">
                {onOpenChat ? (
                  <button
                    type="button"
                    className={`knx-chat-item${c.id === activeChatId ? ' knx-chat-item--active' : ''}`}
                    onClick={() => onOpenChat(c.id)}
                  >
                    {c.title || 'Nuevo chat'}
                  </button>
                ) : (
                  <a className="knx-chat-item" href={`${basePath}/${tenant}?c=${c.id}`}>
                    {c.title || 'Nuevo chat'}
                  </a>
                )}
                {onDeleteChat && (
                  <button
                    type="button"
                    className="knx-chat-delete"
                    onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); }}
                    aria-label={`Eliminar "${c.title || 'Nuevo chat'}"`}
                    title="Eliminar conversación"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="knx-sidebar-footer">
        {(isTeamUser || isAdmin || adminFromAccess) && (
          <a className={`knx-admin-link${active === 'admin' ? ' knx-admin-link--active' : ''}`} href={`${basePath}/${tenant}/admin`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
            Admin
          </a>
        )}
        <KaiNextUserMenu tenant={tenant} userName={userName} userHandle={userHandle} isTeamUser={isTeamUser} onLogout={onLogout} loggingOut={loggingOut} />
      </div>
    </aside>
    </>
  );
}
