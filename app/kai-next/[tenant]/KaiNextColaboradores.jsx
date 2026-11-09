'use client';

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '·';
}

// El equipo menos el responsable elegido. Quien ya colabora en la tarea sin estar en el equipo
// se mantiene como opción, para que guardar otro campo no lo saque.
export function colaboradorOptions(equipo, responsableId, actuales = []) {
  const base = equipo ?? [];
  const fuera = actuales.filter((c) => !base.some((p) => p.id === c.id));
  return [...fuera, ...base].filter((p) => p.id !== responsableId);
}

export function sameColaboradores(a = [], b = []) {
  return [...a].sort().join() === [...b].sort().join();
}

export function KaiNextColaboradoresPicker({ options, value, onChange, disabled }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="knx-board-field">
      <label>Colaboradores</label>
      <div className="knx-canvas-meta-checklist">
        {options.map((p) => (
          <label key={p.id} className="knx-canvas-meta-checkbox">
            <input type="checkbox" checked={value.includes(p.id)} onChange={() => toggle(p.id)} disabled={disabled} />
            <span className="knx-canvas-meta-checkbox-box" />
            {p.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export function KaiNextCollabAvatars({ colaboradores }) {
  if (!colaboradores?.length) return null;
  const extra = colaboradores.length - 3;
  return (
    <span className="knx-board-card-collabs" title={`Colaboradores: ${colaboradores.map((c) => c.name).join(', ')}`}>
      {colaboradores.slice(0, 3).map((c) => <span key={c.id} className="knx-board-card-avatar">{initials(c.name)}</span>)}
      {extra > 0 && <span className="knx-board-card-avatar">+{extra}</span>}
    </span>
  );
}
