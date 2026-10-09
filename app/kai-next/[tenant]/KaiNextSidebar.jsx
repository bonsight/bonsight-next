'use client';

import { useEffect, useState } from 'react';

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
  tenant, tenantName, userName, userHandle, isTeamUser, basePath,
  chats = [], activeChatId = null, onNewChat, onOpenChat, onDeleteChat, onLogout, loggingOut,
  active = 'chat',
}) {
  const navLinkClass = (id) => `knx-nav-link${active === id ? ' knx-nav-link--active' : ''}`;

  // Rollout por tiers (ver lib/kaiNext/capabilities.js) — si el admin apagó una sección para
  // este tenant, el link ni se muestra. Se consulta acá (no vía props) para no tener que
  // enchufar esto en cada page.jsx que ya renderiza el sidebar.
  const [sections, setSections] = useState(null); // null = todavía sin cargar, se asume todo visible
  useEffect(() => {
    fetch(`/api/kai-next/${tenant}/capabilities`)
      .then((r) => r.json())
      .then((d) => setSections(d.access?.sections ?? []))
      .catch(() => null);
  }, [tenant]);
  const showSection = (id) => !sections?.length || sections.includes(id);

  return (
    <aside className="knx-sidebar">
      <div className="knx-sidebar-top">
        <div className="knx-brand">
          <img src="/assets/bonsight-isotipo.svg" alt="" width="22" height="12" />
          Kai
        </div>
        <div className="knx-tenant-chip knx-tenant-chip--static">
          <span className="knx-tenant-avatar">{initials(tenantName)[0]}</span>
          <span className="knx-tenant-name">{tenantName}</span>
        </div>
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
            Empresa
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
          <a className={navLinkClass('proyectos')} href={`${basePath}/${tenant}/proyectos`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            Proyectos
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
        {isTeamUser && (
          <a className="knx-admin-link" href={`${basePath}/${tenant}/admin`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
            Admin
          </a>
        )}
        <div className="knx-user-row">
          <span className="knx-user-avatar">{initials(userName)}</span>
          <span className="knx-user-info">
            <span className="knx-user-name">{userName}</span>
            {userHandle && <span className="knx-user-handle">{userHandle}</span>}
          </span>
          <button type="button" className="knx-logout-btn" onClick={onLogout} disabled={loggingOut} title="Cerrar sesión">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
