const PRIORITY_LABELS = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const IMPACT_LABELS = { revenue: 'Revenue', leads: 'Leads', product: 'Product', brand: 'Brand' };

export default function ActionItemsList({ actionItems, title = 'Qué haría hoy' }) {
  if (!Array.isArray(actionItems) || actionItems.length === 0) return null;

  return (
    <div className="aria-card aria-actions">
      <p className="aria-card-title">{title}</p>
      <ol className="aria-actions-list">
        {actionItems.map((item, i) => (
          <li key={i} className={`aria-action-item${i === 0 ? ' aria-action-item-primary' : ''}`}>
            <span className="aria-action-rank">{i + 1}</span>
            <div className="aria-action-body">
              <span className="aria-action-text">{item.text}</span>
              <div className="aria-action-badges">
                <span className={`aria-badge aria-badge-priority aria-badge-${item.priority}`}>
                  {PRIORITY_LABELS[item.priority] || item.priority}
                </span>
                <span className="aria-badge aria-badge-effort">{item.effort}</span>
                <span className="aria-badge aria-badge-impact">{IMPACT_LABELS[item.impact] || item.impact}</span>
              </div>
              {item.expectedImpact && <p className="aria-action-expected">{item.expectedImpact}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
