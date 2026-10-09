'use client';

// Resumen del borrador mientras se co-diseña la Activity con Kai (antes de [ACTIVITY_LOCK]) —
// puramente informativo, el contenido real vive en lib/kai/activities.js.
export default function KaiNextActivityDraftCard({ draft }) {
  if (!draft) return null;
  return (
    <div className="knx-pinned-card">
      <div className="knx-pinned-card-top">
        <span className="knx-pinned-card-title">Borrador: {draft.name || 'Sin nombre aún'}</span>
        <span className="knx-activity-status knx-activity-status--ready">Diseñando</span>
      </div>
      {draft.objective && <p className="knx-pinned-card-desc">{draft.objective}</p>}
    </div>
  );
}
