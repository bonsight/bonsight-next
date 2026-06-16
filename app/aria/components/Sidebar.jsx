const AREA_ORDER = ['Bonsight Website', 'Kai', 'Quiniela', 'General'];

const STATUS_LABELS = {
  abierta: 'Abierta',
  pendiente: 'Pendiente',
  resuelta: 'Resuelta',
  en_seguimiento: 'En seguimiento',
};

export default function Sidebar({ investigations, activeId, onSelect, onNew }) {
  const groups = AREA_ORDER.map((area) => ({
    area,
    items: investigations.filter((inv) => (inv.area || 'General') === area),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="aria-sidebar">
      <button className="aria-sidebar-new" onClick={onNew}>
        + Nueva investigación
      </button>

      {groups.map((group) => (
        <div key={group.area}>
          <p className="aria-sidebar-group-label">{group.area}</p>
          {group.items.map((inv) => (
            <button
              key={inv.id}
              className={`aria-sidebar-item${inv.id === activeId ? ' aria-sidebar-item-active' : ''}`}
              onClick={() => onSelect(inv.id)}
              title={`${STATUS_LABELS[inv.estado] || inv.estado} · ${inv.titulo}`}
            >
              <span className="aria-sidebar-item-emoji">{inv.emoji}</span>
              <span className="aria-sidebar-item-title">{inv.titulo}</span>
              <span className={`aria-sidebar-status-dot aria-sidebar-status-${inv.estado}`} />
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
